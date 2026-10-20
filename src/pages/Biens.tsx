import { useMemo, useState } from 'react';
import { COULEUR_STATUT, Carte, type Repere } from '../composants/Carte';
import { ChampChoix } from '../composants/Champs';
import { IcMaison, IcPlus } from '../composants/Icones';
import { aller, useDonnees, useRoute } from '../contexte';
import { euros } from '../lib/calculs';
import { STATUTS, type Statut } from '../types';
import { FicheBien } from './FicheBien';

export function PageBiens({ id }: { id?: string }) {
  const { biens, creerBien, charge } = useDonnees();
  const route = useRoute();
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState<Statut | ''>((route.params.get('statut') as Statut) ?? '');
  const [voirAbandonnes, setVoirAbandonnes] = useState(false);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return biens
      .filter((b) => (statut ? b.statut === statut : voirAbandonnes || b.statut !== 'Abandonné'))
      .filter((b) => !q || [b.titre, b.adresse, b.commune, b.notes, b.proprietaireNom].join(' ').toLowerCase().includes(q))
      .sort((a, b) => b.modifieLe.localeCompare(a.modifieLe));
  }, [biens, recherche, statut, voirAbandonnes]);

  const reperes = useMemo<Repere[]>(
    () =>
      filtres
        .filter((b) => b.lat != null && b.lon != null)
        .map((b) => ({ id: b.id, lat: b.lat!, lon: b.lon!, titre: b.titre || b.adresse, couleur: COULEUR_STATUT[b.statut] })),
    [filtres],
  );

  const bien = id ? biens.find((b) => b.id === id) : undefined;
  if (id && bien) return <FicheBien bien={bien} />;
  if (id && charge && !bien) {
    return (
      <div className="panneau vide">
        <h3>Ce bien n’existe plus</h3>
        <p>Il a peut-être été supprimé, ou il a été créé sur un autre appareil. Importez une sauvegarde pour le retrouver.</p>
        <div className="barre-boutons"><a className="bouton" href="#/biens">Retour à mes biens</a></div>
      </div>
    );
  }

  return (
    <div className="pile">
      <div className="titre-page">
        <div>
          <h1>Mes biens</h1>
          <p className="discret">Les biens repérés, les annonces suivies et l’avancement de chaque dossier.</p>
        </div>
        <button className="bouton principal" onClick={() => aller(`biens/${creerBien().id}`)}>
          <IcPlus /> Ajouter un bien
        </button>
      </div>

      {charge && biens.length === 0 ? (
        <div className="panneau vide">
          <h3>Aucun bien suivi pour l’instant</h3>
          <p>Ajoutez une maison repérée lors d’une balade, ou suivez une vente aux enchères depuis l’onglet Enchères.</p>
          <div className="barre-boutons">
            <button className="bouton principal" onClick={() => aller(`biens/${creerBien().id}`)}><IcPlus /> Ajouter un bien</button>
            <a className="bouton" href="#/annonces">Voir les enchères</a>
          </div>
        </div>
      ) : (
        <div className="espace-biens">
          <div className="panneau" style={{ padding: 12 }}>
            <div className="pile" style={{ padding: '4px 4px 10px' }}>
              <label className="champ">
                <span>Rechercher</span>
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Commune, rue, propriétaire…" />
              </label>
              <ChampChoix libelle="Étape" valeur={statut} options={STATUTS} vide="Toutes les étapes en cours" onChange={setStatut} />
              {!statut && (
                <label className="petit" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={voirAbandonnes} onChange={(e) => setVoirAbandonnes(e.target.checked)} style={{ width: 18, minHeight: 18 }} />
                  Inclure les biens abandonnés
                </label>
              )}
            </div>
            {filtres.length === 0 && <p className="discret petit" style={{ padding: 8 }}>Aucun bien ne correspond.</p>}
            <ul className="liste-biens">
              {filtres.map((b) => (
                <li key={b.id}>
                  <a className="carte-bien" href={`#/biens/${b.id}`}>
                    {b.photos[0] ? <img className="vignette" src={b.photos[0]} alt="" /> : <div className="vignette"><IcMaison /></div>}
                    <div>
                      <strong>{b.titre || b.adresse || 'Bien sans nom'}</strong>
                      <span>{[b.commune, b.prixAffiche ? euros(b.prixAffiche) : ''].filter(Boolean).join(', ')}</span>
                      <span style={{ color: COULEUR_STATUT[b.statut] }}>{b.statut}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Carte reperes={reperes} onSelection={(i) => aller(`biens/${i}`)} />
            <p className="petit discret" style={{ marginTop: 8 }}>
              {reperes.length < filtres.length
                ? `${filtres.length - reperes.length} bien(s) sans adresse précise n’apparaissent pas sur la carte.`
                : 'Couleur des points : étape du dossier. Activez le calque Cadastre en zoomant.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
