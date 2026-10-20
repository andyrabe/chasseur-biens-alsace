import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ENTREES_DEFAUT } from './lib/calculs';
import { CLES, PROFIL_VIDE, aujourdhui, nouvelId, usePersistant } from './lib/store';
import type { Annonce, Bien, FichierAnnonces, Profil } from './types';

// ---------- navigation par ancre (#/biens/123?x=y) ----------
export interface Route {
  page: string;
  id?: string;
  params: URLSearchParams;
}

function lireRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [chemin, requete] = h.split('?');
  const [page, id] = chemin.split('/');
  return { page: page || 'accueil', id: id ? decodeURIComponent(id) : undefined, params: new URLSearchParams(requete ?? '') };
}

export function aller(chemin: string) {
  window.location.hash = '#/' + chemin.replace(/^#?\/?/, '');
}

export function useRoute(): Route {
  const [route, setRoute] = useState(lireRoute);
  useEffect(() => {
    const surChangement = () => {
      setRoute(lireRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', surChangement);
    return () => window.removeEventListener('hashchange', surChangement);
  }, []);
  return route;
}

// ---------- données de l'appli ----------
interface Contexte {
  charge: boolean;
  biens: Bien[];
  enregistrerBien: (b: Bien) => void;
  supprimerBien: (id: string) => void;
  creerBien: (partiel?: Partial<Bien>) => Bien;
  profil: Profil;
  setProfil: (p: Profil) => void;
  annonces: FichierAnnonces | null;
  erreurAnnonces?: string;
  annoncesMasquees: string[];
  setAnnoncesMasquees: (v: string[] | ((p: string[]) => string[])) => void;
  derniereVisiteAnnonces?: string;
  marquerAnnoncesVues: () => void;
  nbNouvellesAnnonces: number;
  visitesSources: Record<string, string>;
  noterVisiteSource: (url: string) => void;
  notifier: (message: string) => void;
}

const Ctx = createContext<Contexte | null>(null);

export function bienVide(partiel: Partial<Bien> = {}): Bien {
  const maintenant = new Date().toISOString();
  return {
    id: nouvelId(),
    titre: '',
    adresse: '',
    commune: '',
    typeBien: 'Maison',
    occupation: 'inconnu',
    etat: '',
    origine: 'Repérage terrain',
    statut: 'Repéré',
    proprietaireNom: '',
    proprietaireAdresse: '',
    proprietaireNotes: '',
    notes: '',
    liens: '',
    photos: [],
    journal: [{ id: nouvelId(), date: aujourdhui(), texte: 'Bien ajouté au suivi' }],
    creeLe: maintenant,
    modifieLe: maintenant,
    ...partiel,
  };
}

/** Transforme une annonce de la veille en bien à suivre. */
export function bienDepuisAnnonce(a: Annonce): Partial<Bien> {
  const forfait = a.fraisForfaitPct ?? 9;
  return {
    titre: a.titre,
    commune: a.commune,
    adresse: a.adresse ? `${a.adresse}, ${a.commune}` : a.commune,
    typeBien: a.typeBien,
    surfaceM2: a.surfaceM2,
    terrainM2: a.terrainM2,
    dpe: a.dpe,
    occupation: a.occupation,
    origine: 'Enchères notariales',
    prixAffiche: a.miseAPrix,
    annonceId: a.id,
    liens: [a.pdfUrl, a.pageUrl].filter(Boolean).join('\n'),
    notes: [
      a.dateVente && `Vente aux enchères le ${new Date(a.dateVente).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: a.dateVente.includes('T') ? 'short' : undefined })}`,
      a.lieuVente && `Lieu : ${a.lieuVente}`,
      a.visites.length > 0 && `Visites : ${a.visites.map((v) => new Date(v).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: v.includes('T') ? 'short' : undefined })).join(' ; ')}`,
      a.garantie && `Garantie à verser avant les enchères : ${a.garantie.toLocaleString('fr-FR')} €`,
    ]
      .filter(Boolean)
      .join('\n'),
    calcul: {
      ...ENTREES_DEFAUT,
      prixAchat: a.miseAPrix ?? ENTREES_DEFAUT.prixAchat,
      fraisAcquisitionPct: Math.round((forfait + 6.3) * 10) / 10,
    },
  };
}

export function FournisseurDonnees({ children }: { children: ReactNode }) {
  const [biens, setBiens, chargeBiens] = usePersistant<Bien[]>(CLES.biens, []);
  const [profil, setProfil] = usePersistant<Profil>(CLES.profil, PROFIL_VIDE);
  const [annoncesMasquees, setAnnoncesMasquees] = usePersistant<string[]>(CLES.annoncesMasquees, []);
  const [derniereVisiteAnnonces, setDerniereVisite, chargeVisite] = usePersistant<string | undefined>(CLES.derniereVisiteAnnonces, undefined);
  const [visitesSources, setVisitesSources] = usePersistant<Record<string, string>>(CLES.visitesSources, {});
  const [annonces, setAnnonces] = useState<FichierAnnonces | null>(null);
  const [erreurAnnonces, setErreurAnnonces] = useState<string>();
  const [toast, setToast] = useState<string>();

  useEffect(() => {
    fetch('./data/annonces.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setAnnonces)
      .catch(() => setErreurAnnonces('Les annonces n’ont pas pu être chargées. Vérifiez votre connexion.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const enregistrerBien = useCallback(
    (b: Bien) => {
      const maj = { ...b, modifieLe: new Date().toISOString() };
      setBiens((liste) => (liste.some((x) => x.id === b.id) ? liste.map((x) => (x.id === b.id ? maj : x)) : [maj, ...liste]));
    },
    [setBiens],
  );

  const creerBien = useCallback(
    (partiel?: Partial<Bien>) => {
      const b = bienVide(partiel);
      setBiens((liste) => [b, ...liste]);
      return b;
    },
    [setBiens],
  );

  const nbNouvellesAnnonces = useMemo(() => {
    if (!annonces || !chargeVisite) return 0;
    return annonces.annonces.filter(
      (a) => a.active && a.departement !== '57' && (!derniereVisiteAnnonces || a.premiereVue > derniereVisiteAnnonces) && !annoncesMasquees.includes(a.id),
    ).length;
  }, [annonces, derniereVisiteAnnonces, annoncesMasquees, chargeVisite]);

  const valeur: Contexte = {
    charge: chargeBiens,
    biens,
    enregistrerBien,
    supprimerBien: (id) => setBiens((l) => l.filter((b) => b.id !== id)),
    creerBien,
    profil,
    setProfil,
    annonces,
    erreurAnnonces,
    annoncesMasquees,
    setAnnoncesMasquees,
    derniereVisiteAnnonces,
    marquerAnnoncesVues: () => setDerniereVisite(new Date().toISOString()),
    nbNouvellesAnnonces,
    visitesSources,
    noterVisiteSource: (url) => setVisitesSources((v) => ({ ...v, [url]: new Date().toISOString() })),
    notifier: setToast,
  };

  return (
    <Ctx.Provider value={valeur}>
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useDonnees(): Contexte {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDonnees hors du FournisseurDonnees');
  return c;
}
