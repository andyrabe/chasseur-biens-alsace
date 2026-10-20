# Notes pour Claude Code

Outil personnel (en français) pour un particulier qui cherche des biens immobiliers décotés en Alsace.
Tout le texte visible, les noms de variables et les commentaires sont en français : garder cette convention.

## Commandes
- `npm run dev` : appli en local
- `npm test` : Vitest (tests dans `tests/`)
- `npm run build` : vérification TypeScript puis build Vite dans `dist/`
- `npm run veille` : met à jour `public/data/annonces.json` (`-- --local dossier/` pour analyser des pages HTML enregistrées)

## Architecture
- Appli statique Vite + React 18 + TypeScript, sans routeur : navigation par ancre (`#/biens/<id>`), voir `src/contexte.tsx`.
- Données de l'utilisateur dans IndexedDB (`idb-keyval`) via `usePersistant` dans `src/lib/store.ts`. Pas de serveur. Export/import JSON dans Réglages.
- Types partagés dans `src/types.ts` (utilisés aussi par le script de veille).
- Cartes Leaflet avec les tuiles WMTS de l'IGN (`data.geopf.fr`), géocodage `data.geopf.fr/geocodage`, parcelles via `apicarto.ign.fr/api/cadastre`.
- Veille : `scripts/veille.ts` + `scripts/lib/cir-colmar-metz.ts` (cheerio) + `scripts/lib/extract.ts` (regex sur le texte, fonctions pures) + `scripts/lib/fusion.ts` (historique).
- Workflow `.github/workflows/veille-et-publication.yml` : veille quotidienne, commit du JSON, issue GitHub pour notifier, déploiement GitHub Pages.

## Règles
- Ne jamais recopier de données nominatives des annonces (débiteurs, occupants) : seulement des champs structurés.
- Respecter le robots.txt et les conditions d'utilisation des sites. `cessions.immobilier-etat.gouv.fr` interdit la récupération automatique : il reste en source manuelle (`src/lib/sources.ts`).
- Une seule requête par page et par jour, avec une pause entre les pages.
- Si la mise en page du site des notaires change, ajouter le nouveau cas dans `tests/fixtures/` (contenu anonymisé) avant de corriger le parseur.
- Les calculs fiscaux sont des estimations : toute modification de `src/lib/calculs.ts` doit garder les tests à jour.
- Design : palette « plan cadastral » définie en variables CSS dans `src/styles.css` (papier gris-vert, bleu cadastre, rouge grès des Vosges), polices Barlow / Barlow Semi Condensed, mode sombre pris en charge.
