import type { ReactNode } from 'react';
import { IcAccueil, IcAnnonces, IcBiens, IcCalcul, IcCourrier, IcReglages } from './composants/Icones';
import { useDonnees, useRoute } from './contexte';
import { PageAccueil } from './pages/Accueil';
import { PageAnnonces } from './pages/Annonces';
import { PageBiens } from './pages/Biens';
import { PageCalcul } from './pages/Calcul';
import { PageCourriers } from './pages/Courriers';
import { PageReglages } from './pages/Reglages';

const ONGLETS: { page: string; libelle: string; icone: ReactNode }[] = [
  { page: 'accueil', libelle: 'Accueil', icone: <IcAccueil /> },
  { page: 'annonces', libelle: 'Enchères', icone: <IcAnnonces /> },
  { page: 'biens', libelle: 'Mes biens', icone: <IcBiens /> },
  { page: 'calcul', libelle: 'Chiffrer', icone: <IcCalcul /> },
  { page: 'courriers', libelle: 'Courriers', icone: <IcCourrier /> },
  { page: 'reglages', libelle: 'Réglages', icone: <IcReglages /> },
];

export function App() {
  const route = useRoute();
  const { nbNouvellesAnnonces } = useDonnees();

  let contenu: ReactNode;
  switch (route.page) {
    case 'annonces': contenu = <PageAnnonces />; break;
    case 'biens': contenu = <PageBiens id={route.id} />; break;
    case 'calcul': contenu = <PageCalcul bienId={route.params.get('bien') ?? undefined} />; break;
    case 'courriers': contenu = <PageCourriers bienId={route.params.get('bien') ?? undefined} modeleId={route.params.get('modele') ?? undefined} />; break;
    case 'reglages': contenu = <PageReglages />; break;
    default: contenu = <PageAccueil />;
  }

  return (
    <>
      <header className="entete">
        <div className="entete-contenu">
          <a className="marque" href="#/accueil">
            <img src="./icone.svg" alt="" />
            <div>
              <strong>Chasseur de biens</strong>
              <span>Haut-Rhin et Bas-Rhin</span>
            </div>
          </a>
          <nav className="onglets" aria-label="Sections">
            {ONGLETS.map((o) => (
              <a key={o.page} className="onglet" href={`#/${o.page}`} aria-current={route.page === o.page || (o.page === 'accueil' && !ONGLETS.some((x) => x.page === route.page)) ? 'page' : undefined}>
                {o.icone}
                <span>{o.libelle}</span>
                {o.page === 'annonces' && nbNouvellesAnnonces > 0 && (
                  <span className="pastille-onglet" aria-label={`${nbNouvellesAnnonces} nouvelles`}>{nbNouvellesAnnonces}</span>
                )}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main>{contenu}</main>
    </>
  );
}
