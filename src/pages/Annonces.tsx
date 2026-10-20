import { useEffect, useMemo, useState } from 'react';
import { ChampNombre, PastilleDPE } from '../composants/Champs';
import { IcCalcul, IcPdf, IcPlus } from '../composants/Icones';
import { aller, bienDepuisAnnonce, useDonnees } from '../contexte';
import { euros } from '../lib/calculs';
import { DEPARTEMENTS, dateCourte, dateLongue, delaiLisible, joursAvant, versDate } from '../lib/dates';
import { SOURCES_MANUELLES } from '../lib/sources';
import type { Annonce } from '../types';

type Periode = 'a-venir' | 'passees' | 'toutes';

export function PageAnnonces() {
  const d = useDonnees();
  const [departements, setDepartements] = useState<string[]>(['68', '67']);
  const [periode, setPeriode] = useState<Periode>('a-venir');
  const [prixMax, setPrixMax] = useState<number>();
  const [voirMasquees, setVoirMasquees] = useState(false);
  // Repère de « nouveauté » figé à l'ouverture de la page, puis on marque comme vu.
  const [reference] = useState(d.derniereVisiteAnnonces);
  useEffect(() => {
    if (d.annonces) d.marquerAnnoncesVues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.annonces]);

  const liste = useMemo(() => {
    return (d.annonces?.annonces ?? []).filter((a) => {
      if (!departements.includes(a.departement)) return false;
      if (!voirMasquees && d.annoncesMasquees.includes(a.id)) return false;
      if (prixMax && (a.miseAPrix ?? 0) > prixMax) return false;
      const j = a.dateVente ? joursAvant(a.dateVente) : 0;
      if (periode === 'a-venir' && (j < 0 || !a.active)) return false;
      if (periode === 'passees' && j >= 0 && a.active) return false;
      return true;
    }).sort((a, b) => {
      const ka = a.dateVente ?? '9999';
      const kb = b.dateVente ?? '9999';
      return periode === 'passees' ? kb.localeCompare(ka) : ka.localeCompare(kb);
    });
  }, [d.annonces, d.annoncesMasquees, departements, prixMax, periode, voirMasquees]);

  const suivre = (a: Annonce) => {
    const existant = d.biens.find((b) => b.annonceId === a.id);
    if (existant) return aller(`biens/${existant.id}`);
    const b = d.creerBien(bienDepuisAnnonce(a));
    d.notifier('Bien ajouté à votre suivi');
    aller(`biens/${b.id}`);
  };

  const chiffrer = (a: Annonce) => {
    const existant = d.biens.find((b) => b.annonceId === a.id) ?? d.creerBien(bienDepuisAnnonce(a));
    aller(`calcul?bien=${existant.id}`);
  };

  const basculerDep = (dep: string) =>
    setDepartements((l) => (l.includes(dep) ? l.filter((x) => x !== dep) : [...l, dep]));

  const sourcesKO = d.annonces?.sources.filter((s) => !s.ok) ?? [];

  return (
    <div className="pile">
      <div className="titre-page">
        <div>
          <h1>Ventes aux enchères</h1>
          <p className="discret">
            En Alsace-Moselle, les saisies immobilières sont vendues aux enchères par des notaires. Cette liste reprend
            chaque matin les annonces publiées par la Chambre des notaires de Colmar-Metz.
          </p>
        </div>
      </div>

      {d.erreurAnnonces && <div className="alerte bloquant">{d.erreurAnnonces}</div>}
      {sourcesKO.length > 0 && (
        <div className="alerte attention">
          Dernière mise à jour incomplète : {sourcesKO.map((s) => `${s.nom} (${s.erreur})`).join(', ')}. Les annonces déjà connues restent affichées.
        </div>
      )}

      <div className="filtres">
        <div className="champ">
          <span>Départements</span>
          <div className="segments">
            {['68', '67', '57'].map((dep) => (
              <button key={dep} type="button" aria-pressed={departements.includes(dep)} onClick={() => basculerDep(dep)}>
                {DEPARTEMENTS[dep]}
              </button>
            ))}
          </div>
        </div>
        <div className="champ">
          <span>Ventes</span>
          <div className="segments">
            {([['a-venir', 'À venir'], ['passees', 'Passées'], ['toutes', 'Toutes']] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={periode === v} onClick={() => setPeriode(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: 170 }}>
          <ChampNombre libelle="Mise à prix maximale" valeur={prixMax} onChange={setPrixMax} unite="€" />
        </div>
        <label className="petit" style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 10 }}>
          <input type="checkbox" checked={voirMasquees} onChange={(e) => setVoirMasquees(e.target.checked)} style={{ width: 18, minHeight: 18 }} />
          Afficher les annonces masquées
        </label>
      </div>

      {d.annonces && liste.length === 0 && (
        <div className="panneau vide">
          <h3>Aucune annonce ne correspond</h3>
          <p>Élargissez les filtres, ou revenez demain : la liste est mise à jour chaque matin.</p>
        </div>
      )}

      <ul className="registre">
        {liste.map((a) => {
          const j = a.dateVente ? joursAvant(a.dateVente) : undefined;
          const nouvelle = !reference || a.premiereVue > reference;
          const suivi = d.biens.find((b) => b.annonceId === a.id);
          const masquee = d.annoncesMasquees.includes(a.id);
          return (
            <li key={a.id} className={`ligne-annonce${j !== undefined && j < 0 ? ' passee' : ''}`}>
              <div className={`date-vente${j !== undefined && j >= 0 && j <= 14 ? ' proche' : ''}`}>
                {a.dateVente ? (
                  <>
                    <b>{versDate(a.dateVente).getDate()}</b>
                    <span>{versDate(a.dateVente).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                    <small>{delaiLisible(a.dateVente)}</small>
                  </>
                ) : (
                  <span className="discret">Date à vérifier</span>
                )}
              </div>
              <div>
                <div className="annonce-titre">
                  <h3>{a.titre}</h3>
                  <span className="etiquette">{DEPARTEMENTS[a.departement]}</span>
                  {nouvelle && a.active && <span className="etiquette gres">Nouvelle</span>}
                  {suivi && <span className="etiquette bleu">Suivi : {suivi.statut}</span>}
                </div>
                <dl className="annonce-faits">
                  <div><dt>DPE</dt><dd><PastilleDPE classe={a.dpe} /></dd></div>
                  <div>
                    <dt>Occupation</dt>
                    <dd>{a.occupation === 'libre' ? 'Libre' : a.occupation === 'occupé' ? 'Occupé' : 'Non précisée'}</dd>
                  </div>
                  {a.surfaceM2 && <div><dt>Surface</dt><dd className="nombre">{a.surfaceM2.toLocaleString('fr-FR')} m²</dd></div>}
                  {a.terrainM2 && <div><dt>Terrain</dt><dd className="nombre">{a.terrainM2.toLocaleString('fr-FR')} m²</dd></div>}
                  {a.garantie && <div><dt>Garantie</dt><dd className="nombre">{euros(a.garantie)}</dd></div>}
                  {a.fraisForfaitPct && <div><dt>Frais</dt><dd>{a.fraisForfaitPct.toLocaleString('fr-FR')} % + droits</dd></div>}
                </dl>
                {a.visites.length > 0 && (
                  <p className="petit" style={{ margin: '0 0 4px' }}>
                    <span className="discret">Visites : </span>
                    {a.visites.map(dateCourte).join(', ')}
                  </p>
                )}
                {a.lieuVente && (
                  <p className="petit discret" style={{ margin: 0 }}>
                    {a.dateVente && <>Vente le {dateLongue(a.dateVente)}, </>}
                    {a.lieuVente}
                  </p>
                )}
                {a.occupation === 'occupé' && (
                  <p className="petit" style={{ margin: '6px 0 0', color: 'var(--ocre)' }}>
                    Bien occupé : prévoir des délais et des frais pour obtenir la libération des lieux.
                  </p>
                )}
              </div>
              <div className="prix-ligne">
                <div>
                  <span className="petit discret">Mise à prix</span>
                  <b className="nombre">{euros(a.miseAPrix)}</b>
                </div>
                <div className="barre-boutons">
                  {a.pdfUrl && (
                    <a className="bouton petit" href={a.pdfUrl} target="_blank" rel="noreferrer">
                      <IcPdf /> Annonce
                    </a>
                  )}
                  <button className="bouton petit" onClick={() => chiffrer(a)}>
                    <IcCalcul /> Chiffrer
                  </button>
                  <button className="bouton petit principal" onClick={() => suivre(a)}>
                    {suivi ? 'Ouvrir la fiche' : <><IcPlus /> Suivre</>}
                  </button>
                  <button
                    className="bouton petit"
                    onClick={() => d.setAnnoncesMasquees((l) => (masquee ? l.filter((x) => x !== a.id) : [...l, a.id]))}
                  >
                    {masquee ? 'Réafficher' : 'Masquer'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="panneau" aria-labelledby="titre-autres" style={{ marginTop: 28 }}>
        <h2 id="titre-autres">Autres sources à consulter vous-même</h2>
        <p className="discret">
          Ces sites n’autorisent pas la récupération automatique. Ouvrez-les depuis ici : l’appli note la date de votre dernier passage.
        </p>
        <ul className="liens-utiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {SOURCES_MANUELLES.map((s) => {
            const vu = d.visitesSources[s.url];
            return (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" onClick={() => d.noterVisiteSource(s.url)}>
                  {s.nom}
                </a>
                <small>{s.description}</small>
                <small>
                  {s.frequence}.{' '}
                  {vu ? `Dernière visite ${new Date(vu).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.` : 'Jamais consulté.'}
                </small>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="avertissement">
        Les informations sont extraites automatiquement des annonces et peuvent comporter des erreurs. Avant d’enchérir,
        lisez l’annonce complète et le cahier des charges auprès du notaire chargé de la vente.
      </p>
    </div>
  );
}
