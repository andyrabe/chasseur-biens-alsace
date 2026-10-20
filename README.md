# Chasseur de biens — Alsace

Outil personnel pour repérer, suivre et chiffrer des biens immobiliers décotés dans le Haut-Rhin et le Bas-Rhin.

## Ce que fait l'appli

- **Enchères** : chaque matin, une tâche automatique récupère les ventes aux enchères immobilières publiées par la Chambre des notaires de Colmar-Metz (en Alsace-Moselle, les saisies sont vendues par des notaires). Mise à prix, date de vente, visites, DPE, occupation, garantie, lien vers l'annonce PDF. Vous recevez un e-mail de GitHub quand de nouvelles ventes apparaissent.
- **Mes biens** : une fiche par bien repéré, avec carte IGN, calque du cadastre, recherche automatique de la parcelle depuis l'adresse, photos, journal des actions et étapes du dossier (repéré, propriétaire identifié, contacté, visité, offre, acquis).
- **Chiffrer** : coût de revient, marge nette à la revente (plus-value des particuliers estimée), rendement et cash-flow en location, et surtout le **prix d'achat à ne pas dépasser** pour atteindre la marge visée.
- **Courriers** : lettres prêtes à imprimer pour le propriétaire (premier contact, offre d'achat), la mairie (bien abandonné ou sans maître), le Domaine (succession vacante) et le notaire chargé d'une adjudication.

Vos biens, notes et photos restent **dans votre navigateur** (rien n'est envoyé sur un serveur). Pour les passer du PC au téléphone : Réglages, puis Exporter et Importer.

## Mise en ligne (une seule fois)

La veille tourne chaque matin dans l'onglet **Actions**, que l'appli soit publiée ou non. Pour l'utiliser depuis un navigateur ou un téléphone, choisissez l'une de ces deux options :

**Option A : Vercel (dépôt privé possible, gratuit).** Sur vercel.com, « Add New… → Project », importez ce dépôt et validez (Vite est détecté tout seul). Chaque mise à jour de la veille republie l'appli automatiquement.

**Option B : GitHub Pages (dépôt public obligatoire sur un compte gratuit).**
1. Settings → General → passez le dépôt en **Public**. Il ne contient aucune donnée personnelle : vos biens restent dans votre navigateur, et la veille ne recopie aucun nom de débiteur ou d'occupant.
2. Settings → Pages → **Source : GitHub Actions**.
3. Actions → « Veille et publication » → **Run workflow**. L'appli sera à l'adresse `https://<votre-nom>.github.io/chasseur-biens-alsace/`.

Sur le téléphone, ouvrez l'adresse puis « Ajouter à l'écran d'accueil » : l'appli s'ouvre comme une application.

Pour recevoir les e-mails de nouvelles annonces, vérifiez que vous « regardez » le dépôt (bouton **Watch**, option « All Activity » ou « Issues »).

## Travailler sur l'outil avec Claude Code

```bash
git clone https://github.com/<votre-nom>/<nom-du-depot>.git
cd <nom-du-depot>
npm install
npm run dev        # appli sur http://localhost:5173
npm test           # tests du calculateur et de la veille
npm run veille     # lance la veille à la main
```

Le fichier `CLAUDE.md` explique l'organisation du code à Claude Code. Exemples de demandes : « ajoute une source d'annonces », « ajoute un champ année de construction à la fiche », « la veille est en panne, corrige le parseur ».

## Organisation

```
src/                 l'appli (React + TypeScript)
  pages/             Accueil, Enchères, Mes biens, Fiche, Chiffrer, Courriers, Réglages
  lib/calculs.ts     calculs de rentabilité et de plus-value
  lib/courriers.ts   modèles de lettres
  lib/geo.ts         adresse, cadastre et cartes (services publics de l'IGN)
scripts/veille.ts    la veille quotidienne
scripts/lib/         lecture des pages des notaires, fusion avec l'historique
public/data/         annonces.json, mis à jour par la veille
tests/               tests automatiques (npm test)
```

## À savoir

- La procédure des biens vacants et sans maître est réservée aux communes ; un particulier peut signaler un bien et proposer de le racheter ensuite.
- Les impayés de taxe foncière sont couverts par le secret fiscal.
- Les chiffres sont des estimations : faites valider chaque opération par un notaire.
