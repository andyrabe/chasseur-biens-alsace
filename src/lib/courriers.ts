// Modèles de courriers. Ton courtois et factuel : on propose, on ne presse pas.
import type { Bien, Profil } from '../types';
import { euros } from './calculs';

export interface DonneesCourrier {
  profil: Profil;
  bien?: Bien;
  montant?: number;
  validiteJours: number;
  projet: string;
  destinataireNom: string;
  destinataireAdresse: string;
}

export interface Courrier {
  objet: string;
  corps: string;
}

export interface Modele {
  id: string;
  titre: string;
  quand: string;
  avecMontant?: boolean;
  destinataireParDefaut: (b?: Bien) => { nom: string; adresse: string };
  rediger: (d: DonneesCourrier) => Courrier;
}

const designation = (b?: Bien) => {
  if (!b) return 'bien situé [adresse à compléter]';
  const morceaux = [`bien situé ${b.adresse || b.commune || '[adresse à compléter]'}`];
  if (b.parcelle) morceaux.push(`cadastré ${b.parcelle}`);
  return morceaux.join(', ');
};

const signature = (p: Profil) =>
  [p.nom || '[Votre nom]', p.telephone, p.email].filter(Boolean).join('\n');

export const MODELES: Modele[] = [
  {
    id: 'premier-contact',
    titre: 'Premier contact avec le propriétaire',
    quand: 'Vous avez repéré un bien inoccupé et identifié son propriétaire ou ses héritiers.',
    destinataireParDefaut: (b) => ({ nom: b?.proprietaireNom ?? '', adresse: b?.proprietaireAdresse ?? '' }),
    rediger: ({ profil, bien, projet }) => ({
      objet: `Votre bien ${bien?.commune ? 'à ' + bien.commune : ''}`.trim(),
      corps: `Madame, Monsieur,

Je me permets de vous écrire au sujet du ${designation(bien)}, dont vous êtes, je crois, propriétaire.

Ce bien semble inoccupé depuis un certain temps. Je recherche un logement à rénover dans le secteur${projet ? ` pour ${projet}` : ''}, et je souhaitais savoir si vous envisageriez de le vendre.

Si c’est le cas, je serais heureux d’en discuter avec vous, sans engagement de votre part, et de le visiter à votre convenance. Si ce n’est pas d’actualité, je vous prie de m’excuser pour ce dérangement ; je ne vous relancerai pas.

Vous pouvez me joindre par téléphone ou par courriel aux coordonnées ci-dessous.

Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.

${signature(profil)}`,
    }),
  },
  {
    id: 'offre-achat',
    titre: 'Proposition d’achat au propriétaire',
    quand: 'Après une visite, pour formaliser un prix. Faites-la relire par un notaire si vous avez un doute.',
    avecMontant: true,
    destinataireParDefaut: (b) => ({ nom: b?.proprietaireNom ?? '', adresse: b?.proprietaireAdresse ?? '' }),
    rediger: ({ profil, bien, montant, validiteJours }) => ({
      objet: `Proposition d’achat — ${bien?.adresse || bien?.commune || 'votre bien'}`,
      corps: `Madame, Monsieur,

Suite à ${bien?.statut === 'Visité' ? 'la visite du' : 'nos échanges au sujet du'} ${designation(bien)}, je vous propose de l’acquérir au prix de ${montant ? euros(montant) : '[montant]'} (${montant ? montantEnLettres(montant) : '[montant en lettres]'}), frais de notaire à ma charge en sus.

Cette proposition tient compte de l’état du bien et des travaux nécessaires. Elle est faite sous les conditions suivantes :
- obtention d’un financement, le cas échéant ;
- absence d’inscription, de servitude ou de charge au Livre foncier qui ne serait pas levée avant la vente ;
- remise des diagnostics obligatoires ne révélant pas de désordre non connu à ce jour.

Elle reste valable ${validiteJours} jours à compter de la date de ce courrier. En cas d’accord, je vous propose de confier la rédaction du compromis au notaire de votre choix.

Je reste à votre disposition pour en parler.

Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.

${signature(profil)}`,
    }),
  },
  {
    id: 'mairie',
    titre: 'Mairie : bien abandonné ou sans maître',
    quand: 'Le propriétaire est introuvable. Seule la commune peut engager la procédure ; vous pouvez lui proposer de racheter le bien ensuite.',
    destinataireParDefaut: (b) => ({ nom: `Monsieur le Maire${b?.commune ? ' de ' + b.commune : ''}`, adresse: `Mairie${b?.commune ? '\n' + b.commune : ''}` }),
    rediger: ({ profil, bien, projet }) => ({
      objet: `Bien inoccupé — ${bien?.adresse || '[adresse]'}`,
      corps: `Monsieur le Maire,

Je me permets de vous signaler le ${designation(bien)}, qui paraît abandonné depuis plusieurs années.

Je n’ai pas réussi à identifier de propriétaire en mesure de le vendre. Si la commune a engagé, ou envisage d’engager, une procédure de bien sans maître ou de déclaration d’état d’abandon manifeste, je serais très intéressé par une acquisition une fois le bien entré dans le patrimoine communal.

Mon projet : ${projet || '[décrivez votre projet : rénovation pour y habiter, logement locatif, etc.]'}.

Je me tiens à votre disposition pour vous le présenter et vous remercie par avance de l’attention que vous porterez à ma demande.

Je vous prie d’agréer, Monsieur le Maire, l’expression de ma haute considération.

${signature(profil)}`,
    }),
  },
  {
    id: 'domaine',
    titre: 'Domaine : bien d’une succession vacante',
    quand: 'Le propriétaire est décédé sans héritier connu. Le Domaine (DGFiP) gère et vend ces biens.',
    destinataireParDefaut: () => ({
      nom: 'Pôle de gestion des patrimoines privés\nDirection régionale des Finances publiques',
      adresse: '[adresse du pôle compétent pour le Haut-Rhin ou le Bas-Rhin]',
    }),
    rediger: ({ profil, bien }) => ({
      objet: `Demande d’information — ${bien?.adresse || '[adresse]'}`,
      corps: `Madame, Monsieur,

Je suis intéressé par l’acquisition du ${designation(bien)}.

D’après mes informations, son propriétaire serait décédé. Pourriez-vous m’indiquer si ce bien dépend d’une succession dont votre service assure la curatelle et, le cas échéant, s’il est prévu de le mettre en vente et selon quelles modalités ?

Je souhaiterais être informé de cette vente afin de pouvoir y participer.

Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.

${signature(profil)}`,
    }),
  },
  {
    id: 'notaire-adjudication',
    titre: 'Notaire chargé d’une adjudication',
    quand: 'Avant des enchères : obtenir le cahier des charges et préparer la visite.',
    destinataireParDefaut: () => ({ nom: 'Maître [nom du notaire]', adresse: '[adresse de l’étude]' }),
    rediger: ({ profil, bien }) => ({
      objet: `Adjudication — ${bien?.titre || bien?.adresse || '[bien]'}`,
      corps: `Maître,

Je suis intéressé par l’adjudication du ${designation(bien)}, annoncée par votre étude.

Pourriez-vous me transmettre le cahier des charges ainsi que les diagnostics et documents disponibles (procès-verbal descriptif, état des inscriptions au Livre foncier, charges de copropriété le cas échéant) ? Je vous confirme également ma présence à la visite prévue.

Merci de m’indiquer les conditions d’admission aux enchères (montant et modalités de la garantie, pièces à fournir).

Je vous prie d’agréer, Maître, l’expression de mes salutations distinguées.

${signature(profil)}`,
    }),
  },
];

// ---- montant en lettres (utile dans une offre d'achat) ----
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function moinsDeCent(n: number): string {
  if (n <= 16) return UNITES[n];
  if (n < 20) return 'dix-' + UNITES[n - 10];
  if (n < 70) {
    const d = Math.floor(n / 10), u = n % 10;
    return DIZAINES[d] + (u === 0 ? '' : u === 1 ? '-et-un' : '-' + UNITES[u]);
  }
  if (n < 80) return 'soixante' + (n === 71 ? '-et-onze' : '-' + moinsDeCent(n - 60));
  if (n === 80) return 'quatre-vingts';
  return 'quatre-vingt-' + moinsDeCent(n - 80);
}

function moinsDeMille(n: number): string {
  const c = Math.floor(n / 100), r = n % 100;
  const centaines = c === 0 ? '' : c === 1 ? 'cent' : UNITES[c] + '-cent' + (r === 0 ? 's' : '');
  if (r === 0) return centaines || 'zéro';
  return (centaines ? centaines + '-' : '') + moinsDeCent(r);
}

export function montantEnLettres(montant: number): string {
  const n = Math.round(montant);
  if (n === 0) return 'zéro euro';
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  const parties: string[] = [];
  if (millions) parties.push(millions === 1 ? 'un-million' : moinsDeMille(millions).replace(/cents$/, 'cent') + '-millions');
  if (milliers) parties.push(milliers === 1 ? 'mille' : moinsDeMille(milliers).replace(/(cent|vingt)s$/, '$1') + '-mille');
  if (reste) parties.push(moinsDeMille(reste));
  const texte = parties.join('-');
  return `${texte}${millions && !milliers && !reste ? ' d’euros' : ' euros'}`;
}
