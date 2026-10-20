// Extraction de champs structurés depuis le texte libre d'une annonce
// d'adjudication. Fonctions pures, testées dans tests/extract.test.ts.
import type { ClasseDPE, Occupation } from '../../src/types';

const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11,
  decembre: 12, décembre: 12,
};

/** Normalise espaces insécables et blancs multiples. */
export function normaliser(texte: string): string {
  return texte
    .replace(/[   ]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** "90 000,00" / "60.000,00" / "700.000" / "75000" -> nombre */
export function lireMontant(brut: string): number | undefined {
  const sansDecimales = brut.trim().replace(/,\d{1,2}$/, '');
  const chiffres = sansDecimales.replace(/[ .]/g, '');
  if (!/^\d+$/.test(chiffres)) return undefined;
  const n = Number(chiffres);
  return Number.isFinite(n) ? n : undefined;
}

const RE_MONTANT = /(\d{1,3}(?:[ .]\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:€|EUR\b|euros?\b)/gi;

/** Premier montant en euros trouvé dans la fenêtre de texte. */
function premierMontant(fenetre: string): number | undefined {
  // Le premier montant en chiffres (les montants en lettres n'ont pas de chiffres).
  RE_MONTANT.lastIndex = 0;
  const m = RE_MONTANT.exec(fenetre);
  return m ? lireMontant(m[1]) : undefined;
}

function fenetreApres(texte: string, motif: RegExp, longueur = 400): string | undefined {
  const m = motif.exec(texte);
  if (!m) return undefined;
  return texte.slice(m.index + m[0].length, m.index + m[0].length + longueur);
}

export function extraireMiseAPrix(texte: string): number | undefined {
  const f = fenetreApres(texte, /mise\s+à\s+prix/i);
  return f ? premierMontant(f) : undefined;
}

export function extraireGarantie(texte: string): number | undefined {
  const f = fenetreApres(texte, /(garantie|consignation|acompte|dépôt de garantie|admission)/i, 500);
  return f ? premierMontant(f) : undefined;
}

export function extraireFraisForfait(texte: string): number | undefined {
  // On écarte les pourcentages qui désignent les droits d'enregistrement.
  const valide = (m: RegExpMatchArray | null) => (m && !/droit|enregistrement/i.test(m[0]) ? m : null);
  const m = valide(texte.match(/forfait[^%]{0,140}?(?<![\d.,])(\d{1,2}(?:[.,]\d+)?)\s*%/i))
    ?? valide(texte.match(/frais[^%]{0,140}?(?<![\d.,])(\d{1,2}(?:[.,]\d+)?)\s*%/i));
  if (!m) return undefined;
  const n = Number(m[1].replace(',', '.'));
  return n > 0 && n <= 25 ? n : undefined;
}

export function extraireDPE(texte: string): ClasseDPE | undefined {
  const re = /(?:classe|cat[ée]gorie)\s*(?:[ée]nergie)?\s*:?\s*([A-G])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texte))) {
    const avant = texte.slice(Math.max(0, m.index - 140), m.index).toLowerCase();
    const contexteClimat = /(gaz|ges|climat|co2|émission|emission)[^\n]*$/.test(avant);
    if (!contexteClimat && /(nerg|consommation|dpe|diagnostic)/.test(avant + m[0].toLowerCase())) {
      return m[1].toUpperCase() as ClasseDPE;
    }
  }
  return undefined;
}

export function extraireOccupation(texte: string): Occupation {
  const t = texte.toLowerCase();
  if (/libre de (tout )?occup|inoccup|vacant|libre d'occupation|bien est libre/.test(t)) return 'libre';
  if (/(actuellement|est|sont)\s+occup|occupé par|bail en cours|loué/.test(t)) return 'occupé';
  return 'inconnu';
}

/** Surface habitable (Carrez si présente), en ignorant les kWh/m². */
export function extraireSurface(texte: string): number | undefined {
  const re = /(\d+(?:[.,]\d+)?)\s*m²(?!\s*[./]?\s*an)(?!\s*\/)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texte))) {
    const avant = texte.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
    if (/kwh|co2|kg/.test(avant)) continue;
    const n = Number(m[1].replace(',', '.'));
    if (n > 5 && n < 5000) return n;
  }
  return undefined;
}

/** Contenance cadastrale "0ha 04a 94ca" / "00 ha 04 a 80 ca" -> m² */
export function extraireTerrain(texte: string): number | undefined {
  // En copropriété, la contenance cadastrale est celle de tout l'immeuble : non pertinente.
  if (/copropri[ée]t[ée]/i.test(texte)) return undefined;
  const re = /(\d{1,3})\s*ha\s*(\d{1,2})\s*a\s*(\d{1,2})\s*ca/gi;
  let total = 0;
  let trouve = false;
  let m: RegExpExecArray | null;
  const vus = new Set<string>();
  const totalExplicite = texte.match(/contenance\s+totale\s*:?\s*(\d{1,3})\s*ha\s*(\d{1,2})\s*a\s*(\d{1,2})\s*ca/i);
  if (totalExplicite) {
    return Number(totalExplicite[1]) * 10000 + Number(totalExplicite[2]) * 100 + Number(totalExplicite[3]);
  }
  while ((m = re.exec(texte))) {
    const cle = `${m.index}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    total += Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
    trouve = true;
  }
  return trouve && total > 0 ? total : undefined;
}

export interface DateTrouvee {
  index: number;
  iso: string;
}

const HEURE = String.raw`(?:\s*(?:à|a|,|de|entre)?\s*(\d{1,2})\s*(?:heures?|h)\s*(\d{2})?)?`;

function formerIso(annee: string, mois: number, jour: string, h?: string, min?: string): string {
  let iso = `${annee}-${String(mois).padStart(2, '0')}-${String(Number(jour)).padStart(2, '0')}`;
  if (h) iso += `T${String(Number(h)).padStart(2, '0')}:${(min ?? '00').padStart(2, '0')}`;
  return iso;
}

/** Toutes les dates : "vendredi 20 novembre 2026 à 14 heures 00" ou "23/09/2026 entre 10h00". */
export function trouverDates(texte: string): DateTrouvee[] {
  const reLettres = new RegExp(
    String.raw`(\d{1,2})(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s*(\d{4})` + HEURE,
    'gi',
  );
  const reChiffres = new RegExp(String.raw`\b(\d{1,2})/(\d{1,2})/(\d{4})` + HEURE, 'g');
  const res: DateTrouvee[] = [];
  let m: RegExpExecArray | null;
  while ((m = reLettres.exec(texte))) {
    const cle = m[2].toLowerCase();
    const mois = MOIS[cle] ?? MOIS[cle.replace('û', 'u')];
    if (mois) res.push({ index: m.index, iso: formerIso(m[3], mois, m[1], m[4], m[5]) });
  }
  while ((m = reChiffres.exec(texte))) {
    const mois = Number(m[2]);
    if (mois >= 1 && mois <= 12) res.push({ index: m.index, iso: formerIso(m[3], mois, m[1], m[4], m[5]) });
  }
  return res.sort((a, b) => a.index - b.index);
}

const RE_MOT_CLE_VENTE = /(date de la vente|ventes? aux ench[èe]res|adjudication aura lieu|vente aura lieu|aura lieu le|date d['’]adjudication|date de l['’]adjudication)/gi;

/** Position du dernier mot-clé annonçant la vente qui est suivi d'une date. */
function indexMotCleVente(texte: string, dates: DateTrouvee[]): number | undefined {
  let retenu: number | undefined;
  RE_MOT_CLE_VENTE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_MOT_CLE_VENTE.exec(texte))) {
    const idx = m.index;
    if (dates.some((d) => d.index > idx && d.index - idx < 200)) retenu = idx;
  }
  return retenu;
}

/** Date de la vente : après un mot-clé explicite, sinon la date la plus tardive. */
export function extraireDateVente(texte: string): string | undefined {
  const dates = trouverDates(texte);
  if (dates.length === 0) return undefined;
  const idx = indexMotCleVente(texte, dates);
  if (idx !== undefined) {
    const apres = dates.find((d) => d.index > idx);
    if (apres) return apres.iso;
  }
  return dates.map((d) => d.iso).sort().at(-1);
}

/** Dates de visite : celles qui suivent "visite" et précèdent la date de vente. */
export function extraireVisites(texte: string, dateVente?: string): string[] {
  const m = /visite/i.exec(texte);
  if (!m) return [];
  return trouverDates(texte)
    .filter((d) => d.index > m.index && d.iso !== dateVente)
    .map((d) => d.iso)
    .filter((iso, i, arr) => arr.indexOf(iso) === i)
    .slice(0, 6);
}

/** Lieu de la vente : les lignes qui suivent la date de vente (étude notariale). */
export function extraireLieuVente(texte: string): string | undefined {
  const idx = indexMotCleVente(texte, trouverDates(texte));
  if (idx === undefined) return undefined;
  const apres = texte.slice(idx).split('\n').slice(1, 6);
  const lignes = apres
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^(consult|en savoir)/i.test(l))
    .filter((l) => /(notari|étude|etude|office|ma[iî]tre|me |rue|place|avenue|boulevard|\b\d{5}\b)/i.test(l));
  return lignes.length ? lignes.slice(0, 4).join(', ') : undefined;
}

const VOIES = 'rue|avenue|place|quai|chemin|route|impasse|all[ée]e|boulevard|faubourg|cour|lotissement|cit[ée]|square|sentier|ruelle|passage|grand[- ]rue';

/** Adresse du bien : première voie citée dans la description (avant la mise à prix). */
export function extraireAdresse(texte: string): string | undefined {
  const fin = texte.search(/mise\s+à\s+prix/i);
  const description = fin >= 0 ? texte.slice(0, fin) : texte;
  // Le numéro ne doit pas être un numéro de parcelle ("IZ 79/10 RUE…", "HV 134 RUE…").
  const re = new RegExp(
    String.raw`(?:(?<![\d/])\b(\d{1,4}(?:\s?(?:bis|ter|[a-c]))?)\s*,?\s+)?\b(${VOIES})\s+([^,;().:]{2,60})`,
    'i',
  );
  const m = re.exec(description);
  if (!m) return undefined;
  // Un nom de voie coupé en fin de ligne ("quai Rouget de / Lisle") continue sur la suivante.
  const [ligne1, ligne2 = ''] = m[3].split('\n').map((l) => l.trim());
  let brut = ligne1;
  if (/\b(de|du|des|la|le|d['’])$/i.test(ligne1) && ligne2.length < 25) brut += ' ' + ligne2.split(/\s{2,}/)[0];
  const nomVoie = brut
    .replace(/\s+\d.*$/, '') // contenance cadastrale qui suit souvent le lieudit
    .replace(/\s+(?:à|a|au|figurant|cadastr\S*|lieudit|d['’]une|sur|sol)(?=\s|$).*$/i, '')
    .replace(/[\s\-–]+$/, '')
    .trim();
  if (nomVoie.length < 2) return undefined;
  const voie = `${m[2]} ${nomVoie}`.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())
    .replace(/\b(De|Du|Des|La|Le|Les|Et|Sous|Sur)\b/g, (x) => x.toLowerCase());
  // Numéro précédé d'une section cadastrale en majuscules : c'est un numéro de parcelle.
  const avant = description.slice(Math.max(0, m.index - 4), m.index);
  const numero = m[1] && !/\b[A-Z]{1,2}\s$/.test(avant) ? m[1] : undefined;
  return numero ? `${numero} ${voie}` : voie;
}

/** "Maison - Mulhouse" -> { typeBien: "Maison", commune: "Mulhouse" } */
export function decouperTitre(titre: string): { typeBien: string; commune: string } {
  const propre = normaliser(titre);
  const i = propre.lastIndexOf(' - ');
  if (i === -1) return { typeBien: propre, commune: '' };
  const commune = propre
    .slice(i + 3)
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
  return { typeBien: propre.slice(0, i).trim(), commune };
}

/** Identifiant stable : le lien PDF s'il existe, sinon titre + date. */
export function idAnnonce(source: string, pdfUrl: string | undefined, titre: string, dateVente?: string): string {
  const base = pdfUrl ?? `${titre}|${dateVente ?? ''}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  return `${source}-${(h >>> 0).toString(36)}`;
}
