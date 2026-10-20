import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyserPageCir } from '../scripts/lib/cir-colmar-metz';
import {
  decouperTitre, extraireDateVente, extraireFraisForfait, extraireMiseAPrix, lireMontant, trouverDates,
} from '../scripts/lib/extract';
import { fusionner } from '../scripts/lib/fusion';

const html = readFileSync(new URL('./fixtures/cir-exemple.html', import.meta.url), 'utf-8');
const PAGE = 'https://cir-colmar-metz.notaires.fr/haut-rhin';

describe('extraction de champs', () => {
  it('lit les montants français', () => {
    expect(lireMontant('90 000,00')).toBe(90000);
    expect(lireMontant('60.000,00')).toBe(60000);
    expect(lireMontant('700.000')).toBe(700000);
  });
  it('prend la mise à prix et pas un montant suivant', () => {
    expect(extraireMiseAPrix('Mise à prix : 60.000,00 EUR\nà concurrence de DIX MILLE EUROS (10 000,00 EUR)')).toBe(60000);
  });
  it('ne confond pas les droits de 6,3185 % avec le forfait', () => {
    expect(extraireFraisForfait('Frais : droits d’enregistrement à 6,3185 %')).toBeUndefined();
  });
  it('reconnaît les dates en lettres, en majuscules et en chiffres', () => {
    expect(trouverDates('le vendredi 20 novembre2026 à 14 heures 30').map((d) => d.iso)).toEqual(['2026-11-20T14:30']);
    expect(trouverDates('MARDI 29 SEPTEMBRE 2026 A 14 HEURES 30 MINUTES').map((d) => d.iso)).toEqual(['2026-09-29T14:30']);
    expect(trouverDates('le 23/09/2026 entre 10h00 et 12h00').map((d) => d.iso)).toEqual(['2026-09-23T10:00']);
  });
  it('choisit la date de vente après le mot-clé', () => {
    expect(extraireDateVente('Visites : le 2 novembre 2026\nDate de la vente :\nLe 4 décembre 2026 à 14 h 30')).toBe('2026-12-04T14:30');
  });
  it('met la commune en forme', () => {
    expect(decouperTitre('Maison mitoyenne - SAINT-LOUIS')).toEqual({ typeBien: 'Maison mitoyenne', commune: 'Saint-Louis' });
  });
});

describe('page des notaires de Colmar-Metz', () => {
  const annonces = analyserPageCir(html, '68', PAGE);

  it('ignore le bloc d’en-tête et trouve les deux annonces', () => {
    expect(annonces).toHaveLength(2);
  });

  it('extrait les champs de la maison', () => {
    const a = annonces[0];
    expect(a.titre).toBe('Maison - Exempleville');
    expect(a.miseAPrix).toBe(45000);
    expect(a.dateVente).toBe('2026-12-04T14:30');
    expect(a.visites).toEqual(['2026-11-02T10:00', '2026-11-10T14:30']);
    expect(a.dpe).toBe('G');
    expect(a.occupation).toBe('occupé');
    expect(a.surfaceM2).toBe(112.5);
    expect(a.terrainM2).toBe(625);
    expect(a.garantie).toBe(4500);
    expect(a.fraisForfaitPct).toBe(9.5);
    expect(a.pdfUrl).toBe('https://cir-colmar-metz.notaires.fr/storage/file_manager_files/2026/11/maison-exempleville.pdf');
    expect(a.lieuVente).toContain('Colmar');
  });

  it('extrait les champs du lot de copropriété', () => {
    const a = annonces[1];
    expect(a.commune).toBe('Saint-Exemple');
    expect(a.miseAPrix).toBe(52000);
    expect(a.dateVente).toBe('2026-12-08T09:00');
    expect(a.visites).toEqual(['2026-11-23T10:00']);
    expect(a.dpe).toBe('C');
    expect(a.occupation).toBe('libre');
    expect(a.surfaceM2).toBe(64.1);
    expect(a.terrainM2).toBeUndefined();
  });

  it('ne recopie aucune donnée nominative', () => {
    expect(JSON.stringify(annonces)).not.toContain('Monsieur X');
  });
});

describe('fusion avec l’historique', () => {
  const [a, b] = analyserPageCir(html, '68', PAGE);
  const hier = new Date('2026-10-19T06:00:00Z');
  const aujourdhui = new Date('2026-10-20T06:00:00Z');

  it('signale les nouvelles annonces et garde la date de première apparition', () => {
    const j1 = fusionner([], [a], new Set(), hier);
    expect(j1.nouvelles).toHaveLength(1);
    const j2 = fusionner(j1.annonces, [a, b], new Set(), aujourdhui);
    expect(j2.nouvelles.map((n) => n.id)).toEqual([b.id]);
    expect(j2.annonces.find((x) => x.id === a.id)?.premiereVue).toBe(hier.toISOString());
  });

  it('désactive une annonce disparue, sauf si la source était en erreur', () => {
    const j1 = fusionner([], [a, b], new Set(), hier);
    const sansB = fusionner(j1.annonces, [a], new Set(), aujourdhui);
    expect(sansB.annonces.find((x) => x.id === b.id)?.active).toBe(false);
    const enErreur = fusionner(j1.annonces, [], new Set(['cir-colmar-metz:68']), aujourdhui);
    expect(enErreur.annonces.every((x) => x.active)).toBe(true);
  });
});

describe('adresse du bien', () => {
  it('trouve la voie et ignore les numéros de parcelle', async () => {
    const { extraireAdresse } = await import('../scripts/lib/extract');
    expect(extraireAdresse('A SARRE-UNION (BAS-RHIN) 67260 18 Rue du Muguet, une maison')).toBe('18 Rue du Muguet');
    expect(extraireAdresse('Section Numéro Lieudit\nIZ 79/10 RUE PIERRE BROSSOLETTE 0 04 94')).toBe('Rue Pierre Brossolette');
    expect(extraireAdresse('HV 134 RUE DE HERICOURT SOL 0 01 82')).toBe('Rue de Hericourt');
    expect(extraireAdresse('sis à STRASBOURG (67000) 3 quai Rouget de\nLisle.')).toBe('3 Quai Rouget de Lisle');
    expect(extraireAdresse('Mise à prix : 10 rue du Notaire')).toBeUndefined();
  });
});
