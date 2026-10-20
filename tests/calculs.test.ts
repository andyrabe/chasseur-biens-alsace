import { describe, expect, it } from 'vitest';
import {
  abattementIR, abattementPS, alerteDPE, apresEcheances, calculer, ENTREES_DEFAUT,
  impotPlusValueParticulier, mensualite, prixAchatMaximal,
} from '../src/lib/calculs';

describe('crédit', () => {
  it('calcule une mensualité classique', () => {
    // 100 000 € sur 20 ans à 4 % : environ 605,98 €
    expect(mensualite(100000, 4, 240)).toBeCloseTo(605.98, 1);
  });
  it('gère le taux zéro', () => {
    expect(mensualite(12000, 0, 12)).toBe(1000);
  });
  it('donne intérêts et capital restant après quelques mois', () => {
    const r = apresEcheances(100000, 4, 240, 12);
    expect(r.interets).toBeGreaterThan(3900);
    expect(r.interets).toBeLessThan(4000);
    expect(r.restantDu).toBeLessThan(100000);
    expect(r.restantDu).toBeGreaterThan(96000);
  });
});

describe('plus-value des particuliers', () => {
  it('applique les abattements pour durée de détention', () => {
    expect(abattementIR(3)).toBe(0);
    expect(abattementIR(6)).toBe(6);
    expect(abattementIR(21)).toBe(96);
    expect(abattementIR(22)).toBe(100);
    expect(abattementPS(22)).toBe(28);
    expect(abattementPS(30)).toBe(100);
  });
  it('taxe une revente rapide à 36,2 %', () => {
    const r = impotPlusValueParticulier({
      prixAchat: 100000, fraisAcquisitionReels: 8000, travaux: 20000,
      prixCessionNet: 168000, dureeDetentionMois: 12,
    });
    expect(r.plusValueBrute).toBe(40000);
    expect(r.total).toBeCloseTo(40000 * 0.362, 2);
  });
  it('retient le forfait de 7,5 % si les frais réels sont plus faibles', () => {
    const r = impotPlusValueParticulier({
      prixAchat: 100000, fraisAcquisitionReels: 1000, travaux: 0,
      prixCessionNet: 120000, dureeDetentionMois: 12,
    });
    expect(r.prixAcquisitionMajore).toBe(107500);
  });
  it('ne taxe pas une moins-value', () => {
    const r = impotPlusValueParticulier({
      prixAchat: 100000, fraisAcquisitionReels: 8000, travaux: 0,
      prixCessionNet: 100000, dureeDetentionMois: 12,
    });
    expect(r.total).toBe(0);
  });
});

describe('calcul complet', () => {
  it('donne des résultats cohérents avec les valeurs par défaut', () => {
    const r = calculer(ENTREES_DEFAUT);
    expect(r.fraisAcquisition).toBe(6400);
    expect(r.travauxAvecImprevus).toBe(46000);
    expect(r.coutRevient).toBe(80000 + 6400 + 1500 + 46000 + 2000);
    expect(r.emprunt).toBe(r.coutRevient - 30000);
    expect(r.margeNette).toBeLessThan(r.margeAvantImpot);
    expect(r.rendementBrutPct).toBeGreaterThan(0);
  });
  it('trouve un prix maximal qui respecte la marge cible', () => {
    const max = prixAchatMaximal(ENTREES_DEFAUT);
    expect(max).toBeGreaterThan(0);
    expect(calculer({ ...ENTREES_DEFAUT, prixAchat: max }).margeNettePct).toBeGreaterThanOrEqual(ENTREES_DEFAUT.margeCiblePct);
    expect(calculer({ ...ENTREES_DEFAUT, prixAchat: max + 2000 }).margeNettePct).toBeLessThan(ENTREES_DEFAUT.margeCiblePct);
  });
  it('renvoie 0 si la marge cible est inatteignable', () => {
    expect(prixAchatMaximal({ ...ENTREES_DEFAUT, prixRevente: 10000 })).toBe(0);
  });
});

describe('alertes DPE', () => {
  it('bloque la classe G', () => {
    expect(alerteDPE('G')?.niveau).toBe('bloquant');
  });
  it('prévient pour la classe F avant 2028', () => {
    expect(alerteDPE('F', new Date('2026-10-20'))?.niveau).toBe('attention');
    expect(alerteDPE('F', new Date('2028-02-01'))?.niveau).toBe('bloquant');
  });
});
