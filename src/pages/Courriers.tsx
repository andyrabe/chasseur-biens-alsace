import { useEffect, useMemo, useState } from 'react';
import { ChampChoix, ChampNombre, ChampTexte } from '../composants/Champs';
import { IcCopier, IcImprimer } from '../composants/Icones';
import { aller, useDonnees } from '../contexte';
import { MODELES } from '../lib/courriers';
import { aujourdhui, nouvelId } from '../lib/store';

export function PageCourriers({ bienId, modeleId }: { bienId?: string; modeleId?: string }) {
  const { biens, profil, enregistrerBien, notifier } = useDonnees();
  const bien = bienId ? biens.find((b) => b.id === bienId) : undefined;
  const [idModele, setIdModele] = useState(modeleId ?? (bien?.proprietaireNom ? 'premier-contact' : 'mairie'));
  const modele = MODELES.find((m) => m.id === idModele) ?? MODELES[0];
  const [montant, setMontant] = useState<number | undefined>(bien?.calcul ? undefined : bien?.prixAffiche);
  const [validite, setValidite] = useState<number | undefined>(15);
  const [projet, setProjet] = useState('');
  const [lieu, setLieu] = useState('');
  const [dest, setDest] = useState(modele.destinataireParDefaut(bien));
  const [corps, setCorps] = useState('');
  const [objet, setObjet] = useState('');
  const [retouche, setRetouche] = useState(false);

  // Nouveau modèle ou nouveau bien : destinataire par défaut.
  useEffect(() => {
    setDest(modele.destinataireParDefaut(bien));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idModele, bien?.id]);

  const genere = useMemo(
    () => modele.rediger({ profil, bien, montant, validiteJours: validite ?? 15, projet, destinataireNom: dest.nom, destinataireAdresse: dest.adresse }),
    [modele, profil, bien, montant, validite, projet, dest],
  );

  useEffect(() => {
    if (!retouche) {
      setCorps(genere.corps);
      setObjet(genere.objet);
    }
  }, [genere, retouche]);

  const expediteur = [profil.nom || '[Votre nom]', profil.adresse || '[Votre adresse]', profil.telephone, profil.email].filter(Boolean).join('\n');
  const dateLettre = `${lieu ? lieu + ', le ' : 'Le '}${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const texteComplet = `${expediteur}\n\n${dest.nom}\n${dest.adresse}\n\n${dateLettre}\n\nObjet : ${objet}\n\n${corps}`;

  const noterEnvoi = () => {
    if (!bien) return;
    enregistrerBien({
      ...bien,
      statut: bien.statut === 'Repéré' || bien.statut === 'Propriétaire identifié' ? 'Contacté' : bien.statut,
      journal: [...bien.journal, { id: nouvelId(), date: aujourdhui(), texte: `Courrier envoyé : ${modele.titre.toLowerCase()} (${dest.nom.split('\n')[0] || 'destinataire'})` }],
    });
    notifier('Envoi noté dans le journal du bien');
  };

  return (
    <div className="pile">
      <div className="titre-page ne-pas-imprimer">
        <div>
          <h1>Courriers</h1>
          <p className="discret">Des lettres prêtes à imprimer, remplies avec la fiche du bien et vos coordonnées. Relisez-les et adaptez-les.</p>
        </div>
      </div>

      {!profil.nom && (
        <div className="alerte info ne-pas-imprimer">
          Vos coordonnées ne sont pas encore renseignées. <a href="#/reglages">Ajoutez-les dans Réglages</a> pour qu’elles apparaissent sur les lettres.
        </div>
      )}

      <div className="grille-2" style={{ gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.2fr)' }}>
        <section className="panneau ne-pas-imprimer">
          <fieldset>
            <legend>Quelle lettre ?</legend>
            <div className="pile" role="radiogroup" aria-label="Modèle de lettre">
              {MODELES.map((m) => (
                <label key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name="modele" checked={m.id === idModele} onChange={() => { setIdModele(m.id); setRetouche(false); }} style={{ width: 18, minHeight: 18, marginTop: 3, flex: 'none' }} />
                  <span>
                    <strong style={{ fontWeight: 600 }}>{m.titre}</strong>
                    <span className="petit discret" style={{ display: 'block' }}>{m.quand}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Détails</legend>
            <div className="pile">
              <ChampChoix
                libelle="Bien concerné"
                valeur={bien?.id ?? ''}
                options={biens.map((b) => ({ valeur: b.id, libelle: b.titre || b.adresse || 'Bien sans nom' }))}
                vide="Aucun (à compléter à la main)"
                onChange={(id) => { setRetouche(false); aller(id ? `courriers?bien=${id}&modele=${idModele}` : `courriers?modele=${idModele}`); }}
              />
              <ChampTexte libelle="Destinataire" valeur={dest.nom} onChange={(v) => setDest((d) => ({ ...d, nom: v }))} multiligne lignes={2} />
              <ChampTexte libelle="Adresse du destinataire" valeur={dest.adresse} onChange={(v) => setDest((d) => ({ ...d, adresse: v }))} multiligne lignes={3} />
              {modele.avecMontant && (
                <div className="grille-champs">
                  <ChampNombre libelle="Prix proposé" valeur={montant} onChange={setMontant} unite="€" aide={bien?.calcul ? 'Voir le prix maximal dans le chiffrage' : undefined} />
                  <ChampNombre libelle="Validité de l’offre" valeur={validite} onChange={setValidite} unite="jours" />
                </div>
              )}
              {(idModele === 'premier-contact' || idModele === 'mairie') && (
                <ChampTexte libelle="Votre projet" valeur={projet} onChange={setProjet} placeholder="y habiter après rénovation, créer deux logements…" />
              )}
              <ChampTexte libelle="Ville d’envoi" valeur={lieu} onChange={setLieu} placeholder="Colmar" />
            </div>
          </fieldset>
        </section>

        <div className="pile">
          <div className="barre-boutons ne-pas-imprimer">
            <button className="bouton principal" onClick={() => window.print()}><IcImprimer /> Imprimer ou enregistrer en PDF</button>
            <button className="bouton" onClick={() => navigator.clipboard.writeText(texteComplet).then(() => notifier('Lettre copiée'), () => notifier('Copie impossible : sélectionnez le texte à la main'))}><IcCopier /> Copier</button>
            {bien && <button className="bouton" onClick={noterEnvoi}>Noter l’envoi</button>}
            {retouche && <button className="bouton" onClick={() => setRetouche(false)}>Revenir au texte d’origine</button>}
          </div>
          <article className="lettre" aria-label="Aperçu de la lettre">
            <div className="exp">{expediteur}</div>
            <div className="dest">{dest.nom}{'\n'}{dest.adresse}</div>
            <div className="lieu-date">{dateLettre}</div>
            <div className="objet">
              Objet :{' '}
              <input
                aria-label="Objet"
                value={objet}
                onChange={(ev) => { setObjet(ev.target.value); setRetouche(true); }}
                style={{ display: 'inline', width: 'calc(100% - 72px)', border: 'none', background: 'transparent', padding: 0, minHeight: 0, fontWeight: 600, color: 'inherit' }}
              />
            </div>
            <textarea aria-label="Texte de la lettre" className="corps-ecran" value={corps} onChange={(ev) => { setCorps(ev.target.value); setRetouche(true); }} />
            <div className="corps-impression">{corps}</div>
          </article>
          <p className="petit discret ne-pas-imprimer">Le texte est modifiable directement dans la lettre.</p>
        </div>
      </div>
    </div>
  );
}
