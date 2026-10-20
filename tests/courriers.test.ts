import { describe, expect, it } from 'vitest';
import { MODELES, montantEnLettres } from '../src/lib/courriers';
import { PROFIL_VIDE } from '../src/lib/store';

describe('montant en lettres', () => {
  it('écrit les montants courants', () => {
    expect(montantEnLettres(80000)).toBe('quatre-vingt-mille euros');
    expect(montantEnLettres(95000)).toBe('quatre-vingt-quinze-mille euros');
    expect(montantEnLettres(200000)).toBe('deux-cent-mille euros');
    expect(montantEnLettres(71500)).toBe('soixante-et-onze-mille-cinq-cents euros');
    expect(montantEnLettres(1200000)).toBe('un-million-deux-cent-mille euros');
    expect(montantEnLettres(1000000)).toBe('un-million d’euros');
  });
});

describe('modèles de courriers', () => {
  it('produisent tous un texte complet sans bien associé', () => {
    for (const m of MODELES) {
      const c = m.rediger({ profil: PROFIL_VIDE, validiteJours: 15, projet: '', destinataireNom: '', destinataireAdresse: '', montant: 50000 });
      expect(c.objet.length).toBeGreaterThan(5);
      expect(c.corps).toContain('[Votre nom]');
      expect(c.corps).not.toContain('undefined');
    }
  });
});

describe('grammaire des lettres', () => {
  it('n’écrit jamais « de le »', () => {
    for (const m of MODELES) {
      const c = m.rediger({ profil: PROFIL_VIDE, validiteJours: 15, projet: '', destinataireNom: '', destinataireAdresse: '' });
      expect(c.corps).not.toMatch(/\bde le bien\b/);
    }
  });
});
