import { useRef, useState } from 'react';
import { ChampTexte } from '../composants/Champs';
import { useDonnees } from '../contexte';
import { exporterTout, importerTout, telechargerFichier } from '../lib/store';

export function PageReglages() {
  const { profil, setProfil, biens, notifier } = useDonnees();
  const fichier = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string>();

  const exporter = async () => {
    const s = await exporterTout();
    telechargerFichier(`chasseur-biens-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(s));
    notifier('Sauvegarde téléchargée');
  };

  const importer = async (f?: File) => {
    if (!f) return;
    setErreur(undefined);
    try {
      const { biens: n } = await importerTout(JSON.parse(await f.text()));
      notifier(`${n} bien(s) importé(s)`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setErreur(e instanceof SyntaxError ? 'Ce fichier n’est pas lisible : choisissez un fichier .json exporté depuis l’appli.' : (e as Error).message);
    }
  };

  return (
    <div className="pile" style={{ maxWidth: 820 }}>
      <div className="titre-page">
        <h1>Réglages</h1>
      </div>

      <section className="panneau">
        <fieldset>
          <legend>Vos coordonnées</legend>
          <p className="discret petit" style={{ marginTop: -4 }}>Elles apparaissent en en-tête et en signature des courriers.</p>
          <div className="grille-champs" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            <ChampTexte libelle="Nom et prénom" valeur={profil.nom} onChange={(v) => setProfil({ ...profil, nom: v })} />
            <ChampTexte libelle="Téléphone" type="tel" valeur={profil.telephone} onChange={(v) => setProfil({ ...profil, telephone: v })} />
            <ChampTexte libelle="Courriel" type="email" valeur={profil.email} onChange={(v) => setProfil({ ...profil, email: v })} />
          </div>
          <div style={{ marginTop: 12 }}>
            <ChampTexte libelle="Adresse postale" valeur={profil.adresse} onChange={(v) => setProfil({ ...profil, adresse: v })} multiligne lignes={3} />
          </div>
        </fieldset>
      </section>

      <section className="panneau">
        <fieldset>
          <legend>Sauvegarde et autres appareils</legend>
          <p>
            Vos biens, photos et notes sont enregistrés uniquement dans ce navigateur ({biens.length} bien{biens.length > 1 ? 's' : ''}).
            Pour les retrouver sur votre téléphone, exportez-les ici puis importez le fichier sur l’autre appareil.
            Faites aussi une sauvegarde de temps en temps : vider les données du navigateur les efface.
          </p>
          <div className="barre-boutons">
            <button className="bouton principal" onClick={exporter}>Exporter mes données</button>
            <button className="bouton" onClick={() => fichier.current?.click()}>Importer une sauvegarde</button>
            <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => { importer(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {erreur && <div className="alerte bloquant" style={{ marginTop: 12 }}>{erreur}</div>}
          <p className="petit discret" style={{ marginTop: 10 }}>L’import ajoute les biens du fichier et garde la version la plus récente de chacun : rien n’est effacé.</p>
        </fieldset>
      </section>

      <section className="panneau">
        <fieldset>
          <legend>Ce qu’il faut savoir</legend>
          <div className="petit">
            <p>
              <strong>Biens sans maître.</strong> La procédure d’acquisition des biens vacants et sans maître est réservée aux communes
              (ou à l’État). Un particulier ne peut pas la lancer lui-même, mais peut signaler un bien à la mairie et proposer
              de le racheter une fois qu’il appartient à la commune.
            </p>
            <p>
              <strong>Impayés de taxe foncière.</strong> Ils sont couverts par le secret fiscal : aucune liste publique n’existe.
              Payer la dette d’un propriétaire ne donne aucun droit sur son bien.
            </p>
            <p>
              <strong>Alsace-Moselle.</strong> La propriété est prouvée par le Livre foncier. Avant toute offre, faites vérifier par un
              notaire le propriétaire inscrit et les charges (hypothèques, servitudes).
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong>Les chiffres</strong> du calculateur sont des estimations. Ils ne remplacent pas l’avis d’un notaire,
              d’un conseiller financier ou d’un professionnel du bâtiment.
            </p>
          </div>
        </fieldset>
      </section>
    </div>
  );
}
