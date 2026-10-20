// Types partagés entre l'appli et le script de veille.

export type ClasseDPE = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Occupation = 'libre' | 'occupé' | 'inconnu';

/** Une annonce récupérée automatiquement par la veille. */
export interface Annonce {
  id: string;
  source: string;
  departement: string; // "67", "68", "57"
  titre: string;
  typeBien: string;
  commune: string;
  adresse?: string; // voie extraite de la description, ex. "18 Rue du Muguet"
  miseAPrix?: number;
  dateVente?: string; // ISO (heure locale sans fuseau, ex. 2026-11-20T14:00)
  visites: string[];
  dpe?: ClasseDPE;
  occupation: Occupation;
  surfaceM2?: number;
  terrainM2?: number;
  garantie?: number;
  fraisForfaitPct?: number;
  lieuVente?: string;
  pdfUrl?: string;
  pageUrl: string;
  premiereVue: string;
  derniereVue: string;
  active: boolean;
}

export interface EtatSource {
  nom: string;
  url: string;
  ok: boolean;
  nb: number;
  erreur?: string;
}

export interface FichierAnnonces {
  miseAJour: string;
  sources: EtatSource[];
  annonces: Annonce[];
}

/** Étapes du suivi d'un bien, dans l'ordre. */
export const STATUTS = [
  'Repéré',
  'Propriétaire identifié',
  'Contacté',
  'Visité',
  'Offre faite',
  'Compromis / adjudication',
  'Acquis',
  'Abandonné',
] as const;
export type Statut = (typeof STATUTS)[number];

export const ORIGINES = [
  'Repérage terrain',
  'Enchères notariales',
  'Enchères judiciaires',
  'Succession vacante (Domaine)',
  'Mairie',
  'Annonce notaire',
  'Annonce particulier',
  'Autre',
] as const;
export type Origine = (typeof ORIGINES)[number];

export interface EvenementJournal {
  id: string;
  date: string; // AAAA-MM-JJ
  texte: string;
}

export interface Bien {
  id: string;
  titre: string;
  adresse: string;
  commune: string;
  codeInsee?: string;
  lat?: number;
  lon?: number;
  parcelle?: string; // ex. "68224 000 IZ 0079"
  typeBien: string;
  surfaceM2?: number;
  terrainM2?: number;
  dpe?: ClasseDPE;
  occupation: Occupation;
  etat: string;
  origine: Origine;
  statut: Statut;
  prixAffiche?: number;
  proprietaireNom: string;
  proprietaireAdresse: string;
  proprietaireNotes: string;
  notes: string;
  liens: string;
  annonceId?: string;
  photos: string[]; // data URL compressées
  journal: EvenementJournal[];
  calcul?: EntreesCalcul;
  creeLe: string;
  modifieLe: string;
}

export interface Profil {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
}

/** Entrées du calculateur de rentabilité. */
export interface EntreesCalcul {
  prixAchat: number;
  fraisAcquisitionPct: number; // frais de notaire ou forfait enchères + droits
  fraisAnnexes: number; // diagnostics, géomètre, avocat, raccordements…
  travaux: number;
  imprevusPct: number;
  dureePortageMois: number;
  taxeFonciereAn: number;
  chargesMois: number; // assurance, énergie, abonnements pendant le portage
  // financement
  apport: number;
  tauxCreditPct: number;
  dureeCreditAns: number;
  fraisCredit: number; // dossier, garantie
  // revente
  prixRevente: number;
  fraisVentePct: number; // agence, diagnostics vendeur
  regimeFiscal: 'particulier' | 'personnalise';
  tauxPersonnalisePct: number;
  // location
  loyerMois: number;
  vacanceMoisAn: number;
  chargesNonRecupAn: number;
  gestionPct: number;
  assurancePnoAn: number;
  // objectif pour l'offre max
  margeCiblePct: number;
}
