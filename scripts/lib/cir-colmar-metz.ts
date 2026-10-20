// Analyse des pages « Adjudications » de la Chambre interdépartementale des
// notaires de Colmar-Metz. En Alsace-Moselle, les ventes forcées
// d'immeubles sont confiées à des notaires : c'est la source la plus complète.
import * as cheerio from 'cheerio';
import type { Annonce } from '../../src/types';
import {
  decouperTitre, extraireAdresse, extraireDateVente, extraireDPE, extraireFraisForfait, extraireGarantie,
  extraireLieuVente, extraireMiseAPrix, extraireOccupation, extraireSurface, extraireTerrain,
  extraireVisites, idAnnonce, normaliser,
} from './extract';

export const SOURCE_CIR = 'cir-colmar-metz';

export const PAGES_CIR: { departement: string; url: string }[] = [
  { departement: '68', url: 'https://cir-colmar-metz.notaires.fr/haut-rhin' },
  { departement: '67', url: 'https://cir-colmar-metz.notaires.fr/bas-rhin' },
  { departement: '57', url: 'https://cir-colmar-metz.notaires.fr/moselle' },
];

export type AnnonceBrute = Omit<Annonce, 'premiereVue' | 'derniereVue' | 'active'>;

function texteDe($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
  const clone = el.clone();
  clone.find('br').replaceWith('\n');
  clone.find('p, li, div, h1, h2, h3').each((_, e) => {
    $(e).append('\n');
  });
  return normaliser(clone.text());
}

/**
 * Chaque annonce est un bloc `.block-text-content` (titre en h2 + texte),
 * suivi d'un bloc `.block-links` contenant le lien PDF.
 * On ne conserve que des champs structurés : aucune donnée nominative
 * (débiteur, occupant) n'est recopiée.
 */
export function analyserPageCir(html: string, departement: string, pageUrl: string): AnnonceBrute[] {
  const $ = cheerio.load(html);
  const annonces: AnnonceBrute[] = [];

  $('.block-text-content').each((_, bloc) => {
    const $bloc = $(bloc);
    const titre = normaliser($bloc.find('h2').first().text());
    const corps = $bloc.find('.wysiwyg-content').first();
    if (!titre || corps.length === 0) return;
    const texte = texteDe($, corps);
    if (!/mise\s+à\s+prix/i.test(texte)) return; // bloc d'en-tête, pas une annonce

    // Lien PDF : dans le bloc de liens qui suit, ou à défaut dans le bloc lui-même.
    let pdfUrl: string | undefined;
    const suivants = $bloc.nextUntil('.block-text-content');
    suivants.add($bloc).find('a[href]').each((_, a) => {
      const href = $(a).attr('href') ?? '';
      if (!pdfUrl && /\.pdf(\?|$)/i.test(href)) pdfUrl = new URL(href, pageUrl).toString();
    });

    const { typeBien, commune } = decouperTitre(titre);
    const dateVente = extraireDateVente(texte);
    annonces.push({
      id: idAnnonce(SOURCE_CIR, pdfUrl, titre, dateVente),
      source: SOURCE_CIR,
      departement,
      titre: `${typeBien}${commune ? ' - ' + commune : ''}`,
      typeBien,
      commune,
      adresse: extraireAdresse(texte),
      miseAPrix: extraireMiseAPrix(texte),
      dateVente,
      visites: extraireVisites(texte, dateVente),
      dpe: extraireDPE(texte),
      occupation: extraireOccupation(texte),
      surfaceM2: extraireSurface(texte),
      terrainM2: extraireTerrain(texte),
      garantie: extraireGarantie(texte),
      fraisForfaitPct: extraireFraisForfait(texte),
      lieuVente: extraireLieuVente(texte),
      pdfUrl,
      pageUrl,
    });
  });

  return annonces;
}
