// Stockage local dans le navigateur (IndexedDB) : vos biens, notes et
// coordonnées ne quittent jamais votre appareil. Export/import en JSON
// pour les sauvegarder ou les passer du PC au téléphone.
import { get, set } from 'idb-keyval';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Bien, Profil } from '../types';

export const CLES = {
  biens: 'biens',
  profil: 'profil',
  visitesSources: 'visitesSources',
  annoncesMasquees: 'annoncesMasquees',
  derniereVisiteAnnonces: 'derniereVisiteAnnonces',
} as const;

export const PROFIL_VIDE: Profil = { nom: '', adresse: '', telephone: '', email: '' };

/** État persistant : se charge depuis IndexedDB puis s'y enregistre à chaque changement. */
export function usePersistant<T>(cle: string, defaut: T): [T, (v: T | ((prec: T) => T)) => void, boolean] {
  const [valeur, setValeur] = useState<T>(defaut);
  const [charge, setCharge] = useState(false);
  const pret = useRef(false);

  useEffect(() => {
    let actif = true;
    get<T>(cle)
      .then((v) => {
        if (actif && v !== undefined) setValeur(v);
      })
      .catch(() => {})
      .finally(() => {
        if (actif) {
          pret.current = true;
          setCharge(true);
        }
      });
    return () => {
      actif = false;
    };
  }, [cle]);

  const modifier = useCallback(
    (v: T | ((prec: T) => T)) => {
      setValeur((prec) => {
        const suivant = typeof v === 'function' ? (v as (p: T) => T)(prec) : v;
        if (pret.current) set(cle, suivant).catch((e) => console.error('Enregistrement impossible', e));
        return suivant;
      });
    },
    [cle],
  );

  return [valeur, modifier, charge];
}

export interface Sauvegarde {
  format: 'chasseur-biens-alsace';
  version: 1;
  exporteLe: string;
  biens: Bien[];
  profil: Profil;
  visitesSources: Record<string, string>;
  annoncesMasquees: string[];
}

export async function exporterTout(): Promise<Sauvegarde> {
  return {
    format: 'chasseur-biens-alsace',
    version: 1,
    exporteLe: new Date().toISOString(),
    biens: (await get<Bien[]>(CLES.biens)) ?? [],
    profil: (await get<Profil>(CLES.profil)) ?? PROFIL_VIDE,
    visitesSources: (await get<Record<string, string>>(CLES.visitesSources)) ?? {},
    annoncesMasquees: (await get<string[]>(CLES.annoncesMasquees)) ?? [],
  };
}

/** Importe une sauvegarde. Les biens de même identifiant sont remplacés par la version la plus récente. */
export async function importerTout(donnees: unknown): Promise<{ biens: number }> {
  const s = donnees as Partial<Sauvegarde>;
  if (s?.format !== 'chasseur-biens-alsace' || !Array.isArray(s.biens)) {
    throw new Error('Ce fichier n’est pas une sauvegarde de Chasseur de biens.');
  }
  const actuels = (await get<Bien[]>(CLES.biens)) ?? [];
  const parId = new Map(actuels.map((b) => [b.id, b]));
  for (const b of s.biens) {
    const existant = parId.get(b.id);
    if (!existant || existant.modifieLe < b.modifieLe) parId.set(b.id, b);
  }
  await set(CLES.biens, [...parId.values()]);
  if (s.profil && !(await get<Profil>(CLES.profil))?.nom) await set(CLES.profil, s.profil);
  if (s.visitesSources) {
    const v = (await get<Record<string, string>>(CLES.visitesSources)) ?? {};
    await set(CLES.visitesSources, { ...s.visitesSources, ...v });
  }
  if (s.annoncesMasquees) {
    const m = new Set((await get<string[]>(CLES.annoncesMasquees)) ?? []);
    s.annoncesMasquees.forEach((id) => m.add(id));
    await set(CLES.annoncesMasquees, [...m]);
  }
  return { biens: s.biens.length };
}

export const nouvelId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function telechargerFichier(nom: string, contenu: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
