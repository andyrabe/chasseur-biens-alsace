// Sources à consulter à la main : leurs conditions d'utilisation ou leur
// fichier robots.txt ne permettent pas une récupération automatique.
export interface SourceManuelle {
  nom: string;
  url: string;
  description: string;
  frequence: string;
}

export const SOURCES_MANUELLES: SourceManuelle[] = [
  {
    nom: 'Ventes immobilières de l’État',
    url: 'https://cessions.immobilier-etat.gouv.fr/',
    description: 'Biens des successions vacantes gérées par le Domaine et biens de l’État mis en vente. Filtrez sur le Haut-Rhin et le Bas-Rhin.',
    frequence: 'Chaque semaine',
  },
  {
    nom: 'Annonces des notaires',
    url: 'https://www.immobilier.notaires.fr/',
    description: 'Ventes classiques, ventes interactives et enchères notariales, souvent issues de successions.',
    frequence: 'Chaque semaine',
  },
  {
    nom: '36h-immo',
    url: 'https://www.36h-immo.com/',
    description: 'Ventes notariales interactives en ligne : les offres partent d’un prix souvent attractif.',
    frequence: 'Toutes les deux semaines',
  },
  {
    nom: 'Livre foncier d’Alsace-Moselle',
    url: 'https://www.livrefoncier.fr/',
    description: 'Pour vérifier le propriétaire inscrit et les charges (hypothèques, servitudes) d’un immeuble.',
    frequence: 'Pour chaque bien sérieux',
  },
  {
    nom: 'Cadastre',
    url: 'https://cadastre.data.gouv.fr/',
    description: 'Plan des parcelles. L’appli retrouve déjà la parcelle depuis l’adresse ; utile pour les terrains sans adresse.',
    frequence: 'Au besoin',
  },
];
