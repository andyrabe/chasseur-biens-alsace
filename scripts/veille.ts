// Veille quotidienne des adjudications immobilières en Alsace-Moselle.
//
// Usage :
//   npm run veille                       -> télécharge les pages et met à jour public/data/annonces.json
//   npm run veille -- --local dossier/    -> analyse des pages HTML déjà téléchargées (haut-rhin.html…)
//
// Lancé chaque matin par .github/workflows/veille-et-publication.yml.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Annonce, EtatSource, FichierAnnonces } from '../src/types';
import { analyserPageCir, PAGES_CIR, SOURCE_CIR, type AnnonceBrute } from './lib/cir-colmar-metz';
import { fusionner } from './lib/fusion';

const FICHIER = join('public', 'data', 'annonces.json');
const DOSSIER_CACHE = '.veille-cache';
const AGENT = 'chasseur-biens-alsace/1.0 (veille personnelle, une visite par jour)';

const argLocal = process.argv.indexOf('--local');
const dossierLocal = argLocal !== -1 ? process.argv[argLocal + 1] : undefined;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function telecharger(url: string): Promise<string> {
  if (dossierLocal) {
    const nom = url.split('/').pop() + '.html';
    return readFileSync(join(dossierLocal, nom), 'utf-8');
  }
  const rep = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: 'text/html' } });
  if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
  return rep.text();
}

function lireExistant(): Annonce[] {
  if (!existsSync(FICHIER)) return [];
  try {
    return (JSON.parse(readFileSync(FICHIER, 'utf-8')) as FichierAnnonces).annonces ?? [];
  } catch {
    return [];
  }
}

const euros = (n?: number) => (n == null ? '?' : n.toLocaleString('fr-FR') + ' €');

async function main() {
  const maintenant = new Date();
  const duJour: AnnonceBrute[] = [];
  const sources: EtatSource[] = [];
  const enErreur = new Set<string>();

  for (const page of PAGES_CIR) {
    const nom = `Notaires Colmar-Metz (${page.departement})`;
    try {
      const html = await telecharger(page.url);
      const annonces = analyserPageCir(html, page.departement, page.url);
      // Page chargée mais aucune annonce reconnue alors qu'il y a des blocs :
      // la mise en page du site a probablement changé.
      if (annonces.length === 0 && /mise\s+à\s+prix/i.test(html)) {
        throw new Error('Annonces présentes mais non reconnues : le format du site a peut-être changé');
      }
      duJour.push(...annonces);
      sources.push({ nom, url: page.url, ok: true, nb: annonces.length });
      console.log(`✓ ${nom} : ${annonces.length} annonce(s)`);
    } catch (e) {
      const erreur = e instanceof Error ? e.message : String(e);
      enErreur.add(`${SOURCE_CIR}:${page.departement}`);
      sources.push({ nom, url: page.url, ok: false, nb: 0, erreur });
      console.error(`✗ ${nom} : ${erreur}`);
    }
    if (!dossierLocal) await pause(3000); // rester discret
  }

  const { annonces, nouvelles } = fusionner(lireExistant(), duJour, enErreur, maintenant);
  const fichier: FichierAnnonces = { miseAJour: maintenant.toISOString(), sources, annonces };
  mkdirSync(join('public', 'data'), { recursive: true });
  writeFileSync(FICHIER, JSON.stringify(fichier, null, 2) + '\n');
  console.log(`${annonces.length} annonce(s) au total, ${nouvelles.length} nouvelle(s).`);

  // Résumé utilisé par le workflow pour ouvrir une « issue » (= notification e-mail GitHub).
  mkdirSync(DOSSIER_CACHE, { recursive: true });
  const lignes = nouvelles
    .filter((a) => a.departement !== '57')
    .map((a) => {
      const date = a.dateVente ? new Date(a.dateVente).toLocaleDateString('fr-FR', { dateStyle: 'full' }) : 'date inconnue';
      return `- **${a.titre}** (${a.departement}) — mise à prix ${euros(a.miseAPrix)} — vente le ${date}${a.dpe ? ` — DPE ${a.dpe}` : ''}${a.pdfUrl ? ` — [annonce PDF](${a.pdfUrl})` : ''}`;
    });
  writeFileSync(join(DOSSIER_CACHE, 'nouvelles.md'), lignes.join('\n') + '\n');
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `nouvelles=${lignes.length}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `erreurs=${sources.filter((s) => !s.ok).length}\n`);
  }
}

main();
