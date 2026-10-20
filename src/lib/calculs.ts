// Calculs de rentabilité. Fonctions pures, testées dans tests/calculs.test.ts.
// Ce sont des estimations : la fiscalité réelle dépend de votre situation.
import type { ClasseDPE, EntreesCalcul } from '../types';

export const ENTREES_DEFAUT: EntreesCalcul = {
  prixAchat: 80000,
  fraisAcquisitionPct: 8,
  fraisAnnexes: 1500,
  travaux: 40000,
  imprevusPct: 15,
  dureePortageMois: 12,
  taxeFonciereAn: 900,
  chargesMois: 120,
  apport: 30000,
  tauxCreditPct: 4,
  dureeCreditAns: 20,
  fraisCredit: 2000,
  prixRevente: 190000,
  fraisVentePct: 5,
  regimeFiscal: 'particulier',
  tauxPersonnalisePct: 30,
  loyerMois: 850,
  vacanceMoisAn: 1,
  chargesNonRecupAn: 600,
  gestionPct: 0,
  assurancePnoAn: 180,
  margeCiblePct: 15,
};

/** Préréglages de frais d'acquisition (à vérifier dans l'acte ou le cahier des charges). */
export const PRESETS_FRAIS: { libelle: string; pct: number; aide: string }[] = [
  { libelle: 'Achat classique (ancien)', pct: 8, aide: 'Droits de mutation + émoluments du notaire, environ 7 à 8 % dans l’ancien.' },
  { libelle: 'Enchères notariales', pct: 15, aide: 'Forfait frais du notaire (souvent 8 à 12 %) + droits d’enregistrement (environ 6,3 %) si non inclus. Lisez le cahier des charges.' },
  { libelle: 'Enchères au tribunal', pct: 14, aide: 'Frais préalables de la procédure, émoluments de l’avocat et droits d’enregistrement.' },
  { libelle: 'Neuf / VEFA', pct: 3, aide: 'Frais réduits dans le neuf.' },
];

export interface LigneAmortissement {
  mois: number;
  interets: number;
  capital: number;
  restantDu: number;
}

export function mensualite(capital: number, tauxAnnuelPct: number, dureeMois: number): number {
  if (capital <= 0 || dureeMois <= 0) return 0;
  const t = tauxAnnuelPct / 100 / 12;
  if (t === 0) return capital / dureeMois;
  return (capital * t) / (1 - Math.pow(1 + t, -dureeMois));
}

/** Intérêts payés et capital restant dû après `mois` échéances. */
export function apresEcheances(capital: number, tauxAnnuelPct: number, dureeMois: number, mois: number) {
  const m = mensualite(capital, tauxAnnuelPct, dureeMois);
  const t = tauxAnnuelPct / 100 / 12;
  let restant = capital;
  let interets = 0;
  let paye = 0;
  for (let i = 0; i < Math.min(mois, dureeMois); i++) {
    const int = restant * t;
    interets += int;
    restant -= m - int;
    paye += m;
  }
  return { interets, restantDu: Math.max(0, restant), totalPaye: paye, mensualite: m };
}

/** Abattements pour durée de détention (plus-values immobilières des particuliers). */
export function abattementIR(annees: number): number {
  if (annees <= 5) return 0;
  if (annees <= 21) return (annees - 5) * 6;
  return 100;
}

export function abattementPS(annees: number): number {
  if (annees <= 5) return 0;
  if (annees <= 21) return (annees - 5) * 1.65;
  if (annees === 22) return 28;
  return Math.min(100, 28 + (annees - 22) * 9);
}

/** Surtaxe sur les plus-values imposables > 50 000 € (approximation sans lissage). */
export function tauxSurtaxe(pvImposable: number): number {
  if (pvImposable <= 50000) return 0;
  if (pvImposable <= 100000) return 0.02;
  if (pvImposable <= 150000) return 0.03;
  if (pvImposable <= 200000) return 0.04;
  if (pvImposable <= 250000) return 0.05;
  return 0.06;
}

export interface DetailPlusValue {
  prixCession: number;
  prixAcquisitionMajore: number;
  plusValueBrute: number;
  impotIR: number;
  prelevementsSociaux: number;
  surtaxe: number;
  total: number;
}

/** Impôt sur la plus-value d'une résidence secondaire ou d'un bien locatif (particulier). */
export function impotPlusValueParticulier(p: {
  prixAchat: number;
  fraisAcquisitionReels: number;
  travaux: number;
  prixCessionNet: number;
  dureeDetentionMois: number;
}): DetailPlusValue {
  const annees = Math.floor(p.dureeDetentionMois / 12);
  const frais = Math.max(p.fraisAcquisitionReels, p.prixAchat * 0.075);
  // Au-delà de 5 ans, forfait travaux de 15 % possible ; avant, seulement les travaux réels (factures d'entreprises).
  const travaux = annees >= 5 ? Math.max(p.travaux, p.prixAchat * 0.15) : p.travaux;
  const prixAcquisitionMajore = p.prixAchat + frais + travaux;
  const plusValueBrute = p.prixCessionNet - prixAcquisitionMajore;
  if (plusValueBrute <= 0) {
    return { prixCession: p.prixCessionNet, prixAcquisitionMajore, plusValueBrute, impotIR: 0, prelevementsSociaux: 0, surtaxe: 0, total: 0 };
  }
  const baseIR = plusValueBrute * (1 - abattementIR(annees) / 100);
  const basePS = plusValueBrute * (1 - abattementPS(annees) / 100);
  const impotIR = baseIR * 0.19;
  const prelevementsSociaux = basePS * 0.172;
  const surtaxe = baseIR * tauxSurtaxe(baseIR);
  return {
    prixCession: p.prixCessionNet,
    prixAcquisitionMajore,
    plusValueBrute,
    impotIR,
    prelevementsSociaux,
    surtaxe,
    total: impotIR + prelevementsSociaux + surtaxe,
  };
}

export interface ResultatCalcul {
  fraisAcquisition: number;
  travauxAvecImprevus: number;
  coutRevient: number; // prix + frais + annexes + travaux + frais de crédit
  emprunt: number;
  mensualite: number;
  // revente
  interetsPortage: number;
  fraisPortage: number; // taxe foncière + charges
  prixReventeNet: number;
  margeAvantImpot: number;
  impot: number;
  detailPlusValue?: DetailPlusValue;
  margeNette: number;
  margeNettePct: number; // / coût total investi
  rendementFondsPropresPct?: number;
  // location
  loyerAnnuelEncaisse: number;
  chargesAnnuelles: number;
  revenuNetAnnuel: number;
  rendementBrutPct: number;
  rendementNetPct: number;
  cashflowMensuel: number;
}

export function calculer(e: EntreesCalcul): ResultatCalcul {
  const fraisAcquisition = (e.prixAchat * e.fraisAcquisitionPct) / 100;
  const travauxAvecImprevus = e.travaux * (1 + e.imprevusPct / 100);
  const coutRevient = e.prixAchat + fraisAcquisition + e.fraisAnnexes + travauxAvecImprevus + e.fraisCredit;
  const emprunt = Math.max(0, coutRevient - e.apport);
  const dureeMois = Math.round(e.dureeCreditAns * 12);
  const credit = apresEcheances(emprunt, e.tauxCreditPct, dureeMois, e.dureePortageMois);

  // Scénario revente : le crédit est soldé à la vente.
  const interetsPortage = credit.interets;
  const fraisPortage = (e.taxeFonciereAn * e.dureePortageMois) / 12 + e.chargesMois * e.dureePortageMois;
  const prixReventeNet = e.prixRevente * (1 - e.fraisVentePct / 100);
  const margeAvantImpot = prixReventeNet - coutRevient - interetsPortage - fraisPortage;

  let impot = 0;
  let detailPlusValue: DetailPlusValue | undefined;
  if (e.regimeFiscal === 'particulier') {
    detailPlusValue = impotPlusValueParticulier({
      prixAchat: e.prixAchat,
      fraisAcquisitionReels: fraisAcquisition + e.fraisAnnexes,
      travaux: travauxAvecImprevus,
      prixCessionNet: prixReventeNet,
      dureeDetentionMois: e.dureePortageMois,
    });
    impot = detailPlusValue.total;
  } else {
    impot = Math.max(0, margeAvantImpot) * (e.tauxPersonnalisePct / 100);
  }
  const margeNette = margeAvantImpot - impot;
  const investi = coutRevient + interetsPortage + fraisPortage;
  const margeNettePct = investi > 0 ? (margeNette / investi) * 100 : 0;
  const rendementFondsPropresPct = e.apport > 0 ? (margeNette / e.apport) * 100 : undefined;

  // Scénario location (avant impôt sur les revenus).
  const loyerAnnuelEncaisse = e.loyerMois * Math.max(0, 12 - e.vacanceMoisAn);
  const gestion = (loyerAnnuelEncaisse * e.gestionPct) / 100;
  const chargesAnnuelles = e.chargesNonRecupAn + e.taxeFonciereAn + e.assurancePnoAn + gestion;
  const revenuNetAnnuel = loyerAnnuelEncaisse - chargesAnnuelles;
  const baseRendement = coutRevient - e.fraisCredit;
  const rendementBrutPct = baseRendement > 0 ? ((e.loyerMois * 12) / baseRendement) * 100 : 0;
  const rendementNetPct = baseRendement > 0 ? (revenuNetAnnuel / baseRendement) * 100 : 0;
  const cashflowMensuel = revenuNetAnnuel / 12 - credit.mensualite;

  return {
    fraisAcquisition, travauxAvecImprevus, coutRevient, emprunt, mensualite: credit.mensualite,
    interetsPortage, fraisPortage, prixReventeNet, margeAvantImpot, impot, detailPlusValue,
    margeNette, margeNettePct, rendementFondsPropresPct,
    loyerAnnuelEncaisse, chargesAnnuelles, revenuNetAnnuel, rendementBrutPct, rendementNetPct, cashflowMensuel,
  };
}

/**
 * Prix d'achat maximal (hors frais) pour atteindre la marge nette visée à la revente.
 * C'est le montant à ne pas dépasser dans une offre ou lors d'enchères.
 */
export function prixAchatMaximal(e: EntreesCalcul): number {
  const marge = (prix: number) => calculer({ ...e, prixAchat: prix }).margeNettePct;
  if (marge(0) < e.margeCiblePct) return 0;
  let bas = 0;
  let haut = Math.max(e.prixRevente, 1);
  for (let i = 0; i < 60; i++) {
    const milieu = (bas + haut) / 2;
    if (marge(milieu) >= e.margeCiblePct) bas = milieu;
    else haut = milieu;
  }
  return Math.floor(bas / 500) * 500;
}

/** Contraintes de location liées au DPE (loi Climat et résilience, métropole). */
export function alerteDPE(dpe: ClasseDPE | undefined, aujourdHui = new Date()): { niveau: 'ok' | 'attention' | 'bloquant'; message: string } | undefined {
  if (!dpe) return { niveau: 'attention', message: 'DPE inconnu : à faire réaliser avant toute mise en location.' };
  const annee = aujourdHui.getFullYear();
  if (dpe === 'G') return { niveau: 'bloquant', message: 'Classe G : interdit à la location (nouveaux baux) depuis le 1er janvier 2025. Travaux de rénovation énergétique obligatoires pour louer.' };
  if (dpe === 'F') return { niveau: annee >= 2028 ? 'bloquant' : 'attention', message: 'Classe F : location interdite à partir du 1er janvier 2028 et loyer gelé. Prévoir les travaux d’isolation dans le budget.' };
  if (dpe === 'E') return { niveau: 'attention', message: 'Classe E : location interdite à partir du 1er janvier 2034.' };
  return { niveau: 'ok', message: `Classe ${dpe} : pas de restriction de location prévue.` };
}

export const euros = (n: number | undefined, decimales = 0) =>
  n == null || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimales, minimumFractionDigits: decimales });

export const pct = (n: number | undefined, decimales = 1) =>
  n == null || !Number.isFinite(n) ? '—' : `${n.toLocaleString('fr-FR', { maximumFractionDigits: decimales, minimumFractionDigits: decimales })} %`;
