// Fusion des annonces du jour avec l'historique déjà publié.
import type { Annonce } from '../../src/types';
import type { AnnonceBrute } from './cir-colmar-metz';

export interface ResultatFusion {
  annonces: Annonce[];
  nouvelles: Annonce[];
}

/**
 * - une annonce déjà connue garde sa date de première apparition ;
 * - une annonce disparue reste dans l'historique, marquée inactive ;
 * - les annonces d'une source en erreur ne sont pas désactivées
 *   (on ne sait pas si elles ont vraiment disparu) ;
 * - l'historique inactif est purgé au bout de 180 jours.
 */
export function fusionner(
  existantes: Annonce[],
  duJour: AnnonceBrute[],
  sourcesEnErreur: Set<string>,
  maintenant: Date,
): ResultatFusion {
  const iso = maintenant.toISOString();
  const parId = new Map(existantes.map((a) => [a.id, a]));
  const vusAujourdhui = new Set<string>();
  const nouvelles: Annonce[] = [];
  const resultat: Annonce[] = [];

  for (const brute of duJour) {
    if (vusAujourdhui.has(brute.id)) continue;
    vusAujourdhui.add(brute.id);
    const ancienne = parId.get(brute.id);
    const annonce: Annonce = {
      ...brute,
      premiereVue: ancienne?.premiereVue ?? iso,
      derniereVue: iso,
      active: true,
    };
    if (!ancienne) nouvelles.push(annonce);
    resultat.push(annonce);
  }

  const limitePurge = maintenant.getTime() - 180 * 24 * 3600 * 1000;
  for (const ancienne of existantes) {
    if (vusAujourdhui.has(ancienne.id)) continue;
    const sourceEnErreur = sourcesEnErreur.has(`${ancienne.source}:${ancienne.departement}`);
    const annonce = { ...ancienne, active: sourceEnErreur ? ancienne.active : false };
    if (!annonce.active && new Date(annonce.derniereVue).getTime() < limitePurge) continue;
    resultat.push(annonce);
  }

  resultat.sort((a, b) => (a.dateVente ?? '9999').localeCompare(b.dateVente ?? '9999'));
  return { annonces: resultat, nouvelles };
}
