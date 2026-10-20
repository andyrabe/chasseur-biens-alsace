import { useEffect, useMemo, useRef, useState } from 'react';
import { Carte, COULEUR_STATUT } from '../composants/Carte';
import { ChampChoix, ChampNombre, ChampTexte } from '../composants/Champs';
import { IcCalcul, IcCourrier, IcRetour } from '../composants/Icones';
import { RechercheAdresse } from '../composants/RechercheAdresse';
import { aller, useDonnees } from '../contexte';
import { alerteDPE, calculer, euros, pct, prixAchatMaximal } from '../lib/calculs';
import { chercherAdresses, libelleParcelle, liensUtiles, parcelleAuPoint } from '../lib/geo';
import { compresserPhoto } from '../lib/image';
import { aujourdhui, nouvelId } from '../lib/store';
import { ORIGINES, STATUTS, type Bien, type ClasseDPE, type Occupation } from '../types';

const TYPES = ['Maison', 'Maison mitoyenne', 'Corps de ferme', 'Appartement', 'Immeuble', 'Terrain', 'Grange / dépendance', 'Local', 'Autre'];

export function FicheBien({ bien }: { bien: Bien }) {
  const { enregistrerBien, supprimerBien, notifier } = useDonnees();
  const [b, setB] = useState<Bien>(bien);
  const [recherCadastre, setRechercheCadastre] = useState<'idle' | 'en-cours' | 'erreur'>('idle');
  const [nouvelEvenement, setNouvelEvenement] = useState('');
  const premier = useRef(true);

  useEffect(() => {
    setB(bien);
    premier.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bien.id]);

  // Enregistrement automatique, regroupé pour ne pas écrire à chaque frappe,
  // et forcé en quittant la fiche pour ne rien perdre.
  const dernier = useRef(b);
  const aEnregistrer = useRef(false);
  const supprime = useRef(false);
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    dernier.current = b;
    aEnregistrer.current = true;
    const t = setTimeout(() => {
      if (supprime.current) return;
      enregistrerBien(b);
      aEnregistrer.current = false;
    }, 500);
    return () => clearTimeout(t);
  }, [b, enregistrerBien]);
  useEffect(
    () => () => {
      if (aEnregistrer.current && !supprime.current) enregistrerBien(dernier.current);
    },
    [enregistrerBien],
  );

  const maj = (partiel: Partial<Bien>) => setB((x) => ({ ...x, ...partiel }));
  const ajouterEvenement = (texte: string, date = aujourdhui()) =>
    setB((x) => ({ ...x, journal: [...x.journal, { id: nouvelId(), date, texte }] }));

  const changerStatut = (s: Bien['statut']) => {
    if (s === b.statut) return;
    setB((x) => ({ ...x, statut: s, journal: [...x.journal, { id: nouvelId(), date: aujourdhui(), texte: `Étape : ${s}` }] }));
  };

  const localiser = async (lat: number, lon: number, partiel: Partial<Bien> = {}) => {
    maj({ lat, lon, ...partiel });
    setRechercheCadastre('en-cours');
    try {
      const p = await parcelleAuPoint(lat, lon);
      setRechercheCadastre('idle');
      if (p) {
        setB((x) => ({
          ...x,
          parcelle: libelleParcelle(p),
          codeInsee: p.codeInsee,
          commune: x.commune || p.commune,
          terrainM2: x.terrainM2 ?? p.contenanceM2,
        }));
      }
    } catch {
      setRechercheCadastre('erreur');
    }
  };

  // Bien venu d'une annonce : on le place automatiquement si l'adresse est assez précise.
  useEffect(() => {
    if (!b.annonceId || b.lat != null || !/\b(rue|avenue|place|quai|chemin|route|impasse|all[ée]e|boulevard|faubourg)\b/i.test(b.adresse)) return;
    let actif = true;
    chercherAdresses(b.adresse)
      .then((res) => {
        const r = res.find((x) => x.commune.toLowerCase() === b.commune.toLowerCase() && x.score > 0.5 && x.precision !== 'municipality');
        if (actif && r) localiser(r.lat, r.lon, { adresse: r.label, codeInsee: r.codeInsee });
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id]);

  const ajouterPhotos = async (fichiers: FileList | null) => {
    if (!fichiers) return;
    try {
      const nouvelles = await Promise.all([...fichiers].map((f) => compresserPhoto(f)));
      setB((x) => ({ ...x, photos: [...x.photos, ...nouvelles] }));
    } catch (e) {
      notifier((e as Error).message);
    }
  };

  const centre = useMemo(() => (b.lat != null && b.lon != null ? { lat: b.lat, lon: b.lon, zoom: 18 } : undefined), [b.lat, b.lon]);
  const reperes = useMemo(
    () => (b.lat != null && b.lon != null ? [{ id: b.id, lat: b.lat, lon: b.lon, titre: b.titre || b.adresse, couleur: COULEUR_STATUT[b.statut] }] : []),
    [b.id, b.lat, b.lon, b.titre, b.adresse, b.statut],
  );
  const resultat = b.calcul ? calculer(b.calcul) : undefined;
  const offreMax = b.calcul ? prixAchatMaximal(b.calcul) : undefined;
  const alerte = alerteDPE(b.dpe);
  const indexStatut = STATUTS.indexOf(b.statut);
  const journalTrie = [...b.journal].sort((x, y) => y.date.localeCompare(x.date));

  return (
    <div className="pile">
      <div className="barre-boutons" style={{ justifyContent: 'space-between' }}>
        <a className="bouton petit" href="#/biens"><IcRetour /> Mes biens</a>
        <div className="barre-boutons">
          <button className="bouton petit" onClick={() => { enregistrerBien(b); aller(`calcul?bien=${b.id}`); }}><IcCalcul /> Chiffrer</button>
          <button className="bouton petit" onClick={() => { enregistrerBien(b); aller(`courriers?bien=${b.id}`); }}><IcCourrier /> Écrire</button>
        </div>
      </div>

      <div>
        <input
          aria-label="Nom du bien"
          value={b.titre}
          onChange={(e) => maj({ titre: e.target.value })}
          placeholder="Nom du bien, ex. Maison rue des Vignes"
          style={{ font: '600 1.8rem/1.2 var(--police-titre)', background: 'transparent', border: 'none', padding: '4px 0', borderBottom: '1px dashed var(--trait)', borderRadius: 0 }}
        />
      </div>

      <div>
        <div className="ruban" role="group" aria-label="Étape du dossier">
          {STATUTS.map((s, i) => (
            <button
              key={s}
              type="button"
              className={[s === b.statut ? 'actuel' : '', s !== 'Abandonné' && b.statut !== 'Abandonné' && i < indexStatut ? 'franchi' : '', s === 'Abandonné' ? 'abandon' : ''].join(' ')}
              aria-pressed={s === b.statut}
              onClick={() => changerStatut(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grille-2">
        <div className="pile">
          <section className="panneau">
            <fieldset>
              <legend>Localisation</legend>
              <div className="pile">
                <RechercheAdresse
                  valeur={b.adresse}
                  onChange={(v) => maj({ adresse: v })}
                  onChoix={(a) => localiser(a.lat, a.lon, { adresse: a.label, commune: a.commune, codeInsee: a.codeInsee })}
                />
                <Carte reperes={reperes} centre={centre} cadastre petite onClic={(lat, lon) => localiser(lat, lon)} />
                <p className="petit discret" style={{ margin: 0 }}>
                  {recherCadastre === 'en-cours' && 'Recherche de la parcelle…'}
                  {recherCadastre === 'erreur' && 'Le service du cadastre ne répond pas. Réessayez en cliquant sur la carte.'}
                  {recherCadastre === 'idle' && (b.parcelle ? <>Parcelle : <strong>{b.parcelle}</strong>. Cliquez sur la carte pour corriger.</> : 'Cliquez sur la parcelle dans la carte pour la retrouver.')}
                </p>
              </div>
            </fieldset>
            {(b.lat != null || b.codeInsee) && (
              <fieldset>
                <legend>Pour étudier le bien</legend>
                <ul className="liens-utiles">
                  {liensUtiles(b).map((l) => (
                    <li key={l.libelle}>
                      <a href={l.url} target="_blank" rel="noreferrer">{l.libelle}</a>
                      <small>{l.aide}</small>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
          </section>

          <section className="panneau">
            <fieldset>
              <legend>Le bien</legend>
              <div className="grille-champs">
                <ChampChoix libelle="Type" valeur={b.typeBien} options={TYPES.includes(b.typeBien) ? TYPES : [b.typeBien, ...TYPES]} onChange={(v) => maj({ typeBien: v })} />
                <ChampNombre libelle="Surface habitable" valeur={b.surfaceM2} onChange={(v) => maj({ surfaceM2: v })} unite="m²" />
                <ChampNombre libelle="Terrain" valeur={b.terrainM2} onChange={(v) => maj({ terrainM2: v })} unite="m²" />
                <ChampChoix<ClasseDPE> libelle="DPE" valeur={b.dpe ?? ''} options={['A', 'B', 'C', 'D', 'E', 'F', 'G']} vide="Inconnu" onChange={(v) => maj({ dpe: (v || undefined) as ClasseDPE | undefined })} />
                <ChampChoix<Occupation> libelle="Occupation" valeur={b.occupation} options={[{ valeur: 'inconnu', libelle: 'Inconnue' }, { valeur: 'libre', libelle: 'Libre' }, { valeur: 'occupé', libelle: 'Occupé' }]} onChange={(v) => maj({ occupation: v })} />
                <ChampNombre libelle="Prix demandé ou mise à prix" valeur={b.prixAffiche} onChange={(v) => maj({ prixAffiche: v })} unite="€" />
                <ChampChoix libelle="Origine" valeur={b.origine} options={ORIGINES} onChange={(v) => maj({ origine: v })} />
              </div>
              <div style={{ marginTop: 12 }}>
                <ChampTexte libelle="État constaté" valeur={b.etat} onChange={(v) => maj({ etat: v })} multiligne lignes={3} placeholder="Toiture, menuiseries, humidité, volets fermés depuis…" />
              </div>
              {alerte && <div className={`alerte ${alerte.niveau}`} style={{ marginTop: 12 }}>{alerte.message}</div>}
            </fieldset>
          </section>

          <section className="panneau">
            <fieldset>
              <legend>Photos</legend>
              <div className="photos">
                {b.photos.map((src, i) => (
                  <div className="photo" key={i}>
                    <img src={src} alt={`Photo ${i + 1}`} />
                    <button aria-label="Supprimer la photo" onClick={() => maj({ photos: b.photos.filter((_, j) => j !== i) })}>×</button>
                  </div>
                ))}
                <label className="ajout-photo">
                  Ajouter des photos
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { ajouterPhotos(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
            </fieldset>
          </section>
        </div>

        <div className="pile">
          <section className="panneau">
            <fieldset>
              <legend>Journal</legend>
              <form
                className="barre-boutons"
                style={{ marginBottom: 14, flexWrap: 'nowrap' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!nouvelEvenement.trim()) return;
                  ajouterEvenement(nouvelEvenement.trim());
                  setNouvelEvenement('');
                }}
              >
                <input aria-label="Nouvelle action" value={nouvelEvenement} onChange={(e) => setNouvelEvenement(e.target.value)} placeholder="Appel à la mairie, visite, réponse du notaire…" />
                <button className="bouton" type="submit">Noter</button>
              </form>
              <ul className="journal">
                {journalTrie.map((e) => (
                  <li key={e.id}>
                    <time dateTime={e.date}>{new Date(e.date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                    {e.texte}
                  </li>
                ))}
              </ul>
            </fieldset>
          </section>

          <section className="panneau">
            <fieldset>
              <legend>Chiffrage</legend>
              {resultat ? (
                <>
                  <table className="tableau-chiffres">
                    <tbody>
                      <tr><td>Coût de revient (achat, frais, travaux)</td><td className="nombre">{euros(resultat.coutRevient)}</td></tr>
                      <tr><td>Marge nette à la revente</td><td className="nombre">{euros(resultat.margeNette)} ({pct(resultat.margeNettePct)})</td></tr>
                      <tr><td>Rendement net en location</td><td className="nombre">{pct(resultat.rendementNetPct)}</td></tr>
                      <tr><td>Cash-flow mensuel en location</td><td className="nombre">{euros(resultat.cashflowMensuel)}</td></tr>
                    </tbody>
                  </table>
                  {offreMax !== undefined && (
                    <div className="offre-max">
                      <span className="petit">Prix d’achat à ne pas dépasser pour {pct(b.calcul!.margeCiblePct, 0)} de marge</span>
                      <b className="nombre">{offreMax > 0 ? euros(offreMax) : 'Marge inatteignable'}</b>
                    </div>
                  )}
                </>
              ) : (
                <p className="discret">Pas encore chiffré. Estimez les travaux et le prix de revente pour connaître le prix maximal à proposer.</p>
              )}
              <div className="barre-boutons" style={{ marginTop: 12 }}>
                <button className="bouton" onClick={() => { enregistrerBien(b); aller(`calcul?bien=${b.id}`); }}><IcCalcul /> {resultat ? 'Modifier le chiffrage' : 'Chiffrer ce bien'}</button>
              </div>
            </fieldset>
          </section>

          <section className="panneau">
            <fieldset>
              <legend>Propriétaire</legend>
              <p className="petit discret" style={{ marginTop: -4 }}>
                Ces informations restent dans votre navigateur. Sources possibles : voisins, mairie, Livre foncier, notaire.
              </p>
              <div className="pile">
                <ChampTexte libelle="Nom" valeur={b.proprietaireNom} onChange={(v) => maj({ proprietaireNom: v })} />
                <ChampTexte libelle="Adresse postale" valeur={b.proprietaireAdresse} onChange={(v) => maj({ proprietaireAdresse: v })} multiligne lignes={3} />
                <ChampTexte libelle="Notes" valeur={b.proprietaireNotes} onChange={(v) => maj({ proprietaireNotes: v })} multiligne lignes={3} placeholder="Héritiers, décès, contact via le voisin…" />
              </div>
            </fieldset>
          </section>

          <section className="panneau">
            <fieldset>
              <legend>Notes et liens</legend>
              <div className="pile">
                <ChampTexte libelle="Notes" valeur={b.notes} onChange={(v) => maj({ notes: v })} multiligne lignes={5} />
                <ChampTexte libelle="Liens (un par ligne)" valeur={b.liens} onChange={(v) => maj({ liens: v })} multiligne lignes={3} />
                {b.liens.trim() && (
                  <ul className="petit" style={{ margin: 0, paddingLeft: 18 }}>
                    {b.liens.split('\n').filter((l) => /^https?:\/\//.test(l.trim())).map((l) => (
                      <li key={l}><a href={l.trim()} target="_blank" rel="noreferrer">{l.trim().replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}</a></li>
                    ))}
                  </ul>
                )}
              </div>
            </fieldset>
          </section>

          <div className="barre-boutons" style={{ justifyContent: 'flex-end' }}>
            <button
              className="bouton danger"
              onClick={() => {
                if (window.confirm('Supprimer définitivement ce bien et son historique ?')) {
                  supprime.current = true;
                  supprimerBien(b.id);
                  notifier('Bien supprimé');
                  aller('biens');
                }
              }}
            >
              Supprimer ce bien
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
