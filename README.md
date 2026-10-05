# La Clinique Rétro

**Réparer. Préserver. Rejouer.**

Application d’atelier personnel pour inventorier des consoles, suivre leurs réparations et gérer les pièces détachées. Interface en français, adaptée à l’ordinateur et au téléphone.

## Démarrer le projet

Prérequis : Node.js 22.12 ou supérieur et npm.

```sh
git clone https://github.com/RemiAldeguer/la-clinique-retro.git
cd la-clinique-retro
npm install
npm run dev
```

Ouvrez l’adresse locale affichée par Vite. L’application contient **12 consoles, 9 dossiers et 8 références fictifs**. Pour commencer votre propre collection : **Réglages & sauvegardes → Commencer avec un atelier vide**, puis saisissez `EFFACER`.

## Fonctionnalités

- **Tableau de bord** : collection, réparations actives, alertes de stock et dernières interventions.
- **Inventaire** : marque, modèle, variante, numéro de série, état technique et esthétique, prix, valeur estimée, emplacement, accessoires, notes, photos et archives.
- **Dossier patient** : historique de chaque console, interventions et coûts cumulés.
- **Atelier Kanban** : réception, diagnostic, pièces à commander, attente de pièces, réparation, tests et clôture. Les issues « Irréparable » et « Abandonnée » sont également disponibles.
- **Interventions** : journal horodaté, diagnostic, priorité, échéance, pièces, chronomètre, sessions manuelles, checklist de tests et dossier imprimable.
- **Stock** : références, compatibilités, fournisseurs, seuils et coûts. La consommation d’une pièce diminue le stock et fige son coût dans le dossier.
- **Sauvegardes** : export et restauration JSON, inventaire CSV, validation des imports.

Une seule réparation peut être ouverte par console. La clôture « Terminée » exige que tous les tests soient réussis ou non applicables, avec au moins un test réussi. La réouverture et les modifications de pièces réinitialisent les tests.

## Construire une version distribuable

### Site statique

```sh
npm run build
npm start
```

La compilation Vite génère `dist/`. Le serveur local fourni sert ce dossier à `http://127.0.0.1:4173`, uniquement sur votre ordinateur. `Ctrl+C` l’arrête. La commande `npm run preview` constitue une autre option locale.

### Fichier HTML autonome

```sh
npm run build:offline
```

Ouvrez ensuite `dist/index.html` directement dans votre navigateur. Le JavaScript, React et les styles sont incorporés au fichier : aucune connexion n’est nécessaire pour l’utiliser. L’installation des dépendances et la construction initiale nécessitent cependant npm et une connexion.

Les deux modes de construction utilisent le même dossier `dist/`. Exécutez `build:offline` en dernier pour obtenir l’édition autonome. Le fichier `index.html` à la racine est l’entrée de développement, **pas** la version à ouvrir directement.

Ce dépôt contient les sources, les scripts et les tests. Les dépendances, le runtime précompilé et les fichiers générés ne sont pas versionnés : ils sont reconstruits depuis les sources. Le fichier HTML autonome livré séparément reste utilisable indépendamment du dépôt.

## Données et limites

**Les données restent dans le navigateur. GitHub ne sauvegarde pas votre inventaire.** Le stockage dépend du navigateur, de son profil et de l’adresse utilisée. Il n’y a pas de compte utilisateur, de backend, de synchronisation entre appareils, de portail client, de facturation ou de QR codes dans cette version.

Exportez régulièrement un JSON et conservez-en une copie indépendante. Avant de changer d’adresse, de navigateur ou de mode de lancement, exportez puis restaurez vos données. Évitez la navigation privée. Les photos augmentent le volume stocké et les quotas varient selon le navigateur.

Le chronomètre continue à compter lorsqu’il est démarré, même si l’application est fermée. Arrêtez-le après chaque intervention. La valorisation du temps et les valeurs des consoles sont indicatives : ce ne sont ni des factures ni des cotations automatiques.

Le dépôt est distinct d’un hébergement de l’application. Publier le code ne met pas automatiquement le site en ligne. N’ajoutez pas de sauvegardes personnelles, de photos privées ou de secrets au dépôt.

## Tests

```sh
npm test
npm run typecheck
npm run build
```

`npm test` recompile les deux modules métier depuis TypeScript puis exécute 32 tests Node.js : transitions, tests de clôture, stock, chronomètre, coûts, import et échappement CSV. Voir `TESTS.md` pour les limites de validation.

## Organisation

```text
src/domain.ts       Entités, validation et règles métier
src/seed.ts         Démonstration fictive
src/store.tsx       Persistance locale et sauvegardes
src/ui.tsx          Composants et illustrations SVG
src/forms.tsx       Formulaires
src/pages.tsx       Dashboard, inventaire, atelier, stock et réglages
src/details.tsx     Dossiers, pièces, tests, photos et temps
src/App.tsx         Navigation et notifications
src/styles.css     Interface responsive et impression
scripts/            Construction autonome, serveur local et compilation des tests
tests/              Tests métier
```

## Licence

MIT, voir `LICENSE` et `THIRD_PARTY_NOTICES.md`. Les illustrations sont des SVG génériques. Les noms des consoles servent d’exemples d’identification ; l’application n’est pas affiliée aux fabricants.
