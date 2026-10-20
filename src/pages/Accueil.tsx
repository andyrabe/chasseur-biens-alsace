import { PastilleDPE } from '../composants/Champs';
import { IcPlus } from '../composants/Icones';
import { aller, useDonnees } from '../contexte';
import { euros } from '../lib/calculs';
import { DEPARTEMENTS, dateLongue, delaiLisible, joursAvant, versDate } from '../lib/dates';
import { STATUTS } from '../types';

export function PageAccueil() {
  const { biens, annonces, creerBien, annoncesMasquees } = useDonnees();

  const prochaines = (annonces?.annonces ?? [])
    .filter((a) => a.active && a.departement !== '57' && a.dateVente && joursAvant(a.dateVente) >= 0 && !annoncesMasquees.includes(a.id))
    .slice(0, 4);

  const actifs = biens.filter((b) => b.statut !== 'Abandonné' && b.statut !== 'Acquis');
  const aRelancer = actifs
    .filter((b) => ['Contacté', 'Offre faite'].includes(b.statut))
    .map((b) => ({ b, dernier: b.journal.map((e) => e.date).sort().at(-1) ?? b.creeLe.slice(0, 10) }))
    .filter(({ dernier }) => joursAvant(dernier) <= -21)
    .slice(0, 5);

  return (
    <div className="pile">
      <div className="titre-page">
        <div>
          <h1>Bonjour</h1>
          <p className="discret">
            {actifs.length === 0
              ? 'Commencez par regarder les prochaines ventes aux enchères ou ajoutez un bien repéré.'
              : `${actifs.length} bien${actifs.length > 1 ? 's' : ''} en cours de suivi.`}
          </p>
        </div>
        <button className="bouton principal" onClick={() => aller(`biens/${creerBien().id}`)}>
          <IcPlus /> Ajouter un bien repéré
        </button>
      </div>

      <section className="panneau" aria-labelledby="titre-suivi">
        <div className="panneau-entete">
          <h2 id="titre-suivi">Où en sont vos biens</h2>
          <a href="#/biens">Tous les biens</a>
        </div>
        <div className="compteurs">
          {STATUTS.filter((s) => s !== 'Abandonné').map((s) => {
            const n = biens.filter((b) => b.statut === s).length;
            return (
              <a key={s} className={`compteur${n ? ' plein' : ''}`} href={`#/biens?statut=${encodeURIComponent(s)}`}>
                <b>{n}</b>
                <span>{s}</span>
              </a>
            );
          })}
        </div>
      </section>

      <div className="grille-2">
        <section className="panneau" aria-labelledby="titre-encheres">
          <div className="panneau-entete">
            <h2 id="titre-encheres">Prochaines enchères</h2>
            <a href="#/annonces">Toutes les annonces</a>
          </div>
          {!annonces && <p className="discret">Chargement…</p>}
          {annonces && prochaines.length === 0 && <p className="discret">Aucune vente à venir pour l’instant. La liste est mise à jour chaque matin.</p>}
          <ul className="registre">
            {prochaines.map((a) => {
              const j = joursAvant(a.dateVente!);
              return (
                <li key={a.id} className="ligne-annonce" style={{ gridTemplateColumns: '84px minmax(0,1fr)' }}>
                  <div className={`date-vente${j <= 14 ? ' proche' : ''}`}>
                    <b>{versDate(a.dateVente!).getDate()}</b>
                    <span>{versDate(a.dateVente!).toLocaleString('fr-FR', { month: 'short' })}</span>
                  </div>
                  <div>
                    <div className="annonce-titre">
                      <h3>{a.titre}</h3>
                      <PastilleDPE classe={a.dpe} />
                    </div>
                    <p className="petit" style={{ margin: 0 }}>
                      <span className="nombre">Mise à prix {euros(a.miseAPrix)}</span>
                      <span className="discret"> — {DEPARTEMENTS[a.departement]}, {delaiLisible(a.dateVente!)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {annonces && (
            <p className="petit discret" style={{ marginTop: 10 }}>
              Liste mise à jour le {new Date(annonces.miseAJour).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.
            </p>
          )}
        </section>

        <section className="panneau" aria-labelledby="titre-relances">
          <h2 id="titre-relances">À relancer</h2>
          {aRelancer.length === 0 ? (
            <p className="discret">
              Rien à relancer. Les biens contactés ou avec une offre sans nouvelle depuis trois semaines apparaîtront ici.
            </p>
          ) : (
            <ul className="liste-biens">
              {aRelancer.map(({ b, dernier }) => (
                <li key={b.id}>
                  <a className="carte-bien" href={`#/biens/${b.id}`} style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <strong>{b.titre || b.adresse || 'Bien sans nom'}</strong>
                      <span>
                        {b.statut}, dernière action {dateLongue(dernier)}
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <h3 style={{ marginTop: 22, marginBottom: 8 }}>Pour bien démarrer</h3>
          <ol className="petit" style={{ paddingLeft: 20, margin: 0 }}>
            <li>Renseignez vos coordonnées dans <a href="#/reglages">Réglages</a> : elles servent pour les courriers.</li>
            <li>Ajoutez une vente qui vous intéresse depuis <a href="#/annonces">Enchères</a>, ou un bien repéré sur le terrain.</li>
            <li>Chiffrez-le pour connaître le prix à ne pas dépasser.</li>
            <li>Écrivez au propriétaire, à la mairie ou au notaire depuis <a href="#/courriers">Courriers</a>.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
