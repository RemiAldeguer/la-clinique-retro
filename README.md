# La Clinique Rétro

**Réparer. Préserver. Rejouer.**

Inventaire de consoles et gestion de réparations. La version 2 ajoute une administration authentifiée et un stockage serveur. Toute l’application de gestion est réservée au compte administrateur : inventaire, dossiers, stock, réglages et exports.

## Démarrage

Prérequis : Node.js **22.16 ou supérieur**, npm et un terminal interactif. Le module natif `node:sqlite` est utilisé ; Node 22 affiche actuellement un avertissement expérimental à son chargement.

```sh
git clone https://github.com/RemiAldeguer/la-clinique-retro.git
cd la-clinique-retro
npm install
npm run admin:create
npm run build
npm start
```

Pour une copie déjà clonée, remplacez les deux premières commandes par `git pull` dans le projet.

Ouvrez **http://127.0.0.1:3040** et connectez-vous avec l’adresse et la phrase de passe choisies dans `admin:create`. La saisie du mot de passe n’est pas affichée. Aucun compte ni mot de passe par défaut n’est fourni ; aucune inscription publique n’existe. La commande refuse d’écraser un administrateur existant.

L’atelier serveur commence vide. Les données de démonstration sont accessibles, après connexion, dans **Réglages & sauvegardes**. Le premier compte doit être créé sur le serveur qui héberge réellement l’application, avec le même `DATABASE_PATH` que l’API.

## Fonctionnalités

Tableau de bord, fiches consoles, photos, emplacement, coûts, stock et pièces, dossier patient, journal d’intervention, Kanban, chronomètre, tests de validation, impressions, exports JSON/CSV et restauration. Une seule réparation active par console et une validation des tests avant clôture restent imposées par les règles métier existantes.

**Administration :** connexion et déconnexion, rôle administrateur vérifié sur les routes API, changement de mot de passe avec vérification de l’ancien et révocation de toutes les sessions. La déconnexion efface les données chargées en mémoire par l’interface. Les autres onglets de la même origine reçoivent la déconnexion ; chaque requête serveur vérifie de toute façon la session.

## Migrer l’ancienne application locale

1. Dans l’ancienne application, exportez une sauvegarde JSON avant de changer d’adresse ou de navigateur.
2. Connectez-vous à cette version, puis ouvrez **Réglages & sauvegardes → Restaurer ou migrer des données**.
3. Importez le JSON et confirmez avec `RESTAURER`. Il remplace l’atelier du serveur, pas le compte administrateur.
4. Vérifiez les consoles, les réparations et les photos avant de supprimer vos anciennes copies locales.

Aucun transfert ni effacement de l’ancien localStorage n’est automatique. Lorsqu’une sauvegarde ancienne est accessible sur la même origine, un bouton permet de la récupérer. L’authentification **ne protège pas rétroactivement** les fichiers HTML autonomes, les exports JSON ou le localStorage de l’ancienne version. Protégez ou supprimez ces copies après une migration vérifiée.

Les nouvelles données d’atelier sont dans SQLite, pas dans localStorage. Un changement n’est confirmé qu’après validation serveur. Pendant l’enregistrement, les nouvelles actions sont bloquées. En cas d’échec ou de conflit, un écran permet de récupérer le brouillon JSON puis de recharger l’état serveur ; aucun écrasement concurrent n’est effectué automatiquement. Une expiration de session peut faire perdre une modification non confirmée : ne fermez pas l’onglet pendant l’enregistrement.

## Configuration et hébergement

Le fichier `.env` est facultatif en local. Copiez `.env.example` pour personnaliser la configuration. Il est exclu de Git, comme les bases et le dossier `data/`.

| Variable | Usage |
| --- | --- |
| `APP_ORIGIN` | Origine exacte du navigateur, sans chemin ni slash final. Par défaut `http://127.0.0.1:3040`. Obligatoire et HTTPS en production. |
| `NODE_ENV` | Utilisez `production` sur le serveur public. |
| `HOST` | Interface d’écoute. Par défaut `127.0.0.1`, derrière le proxy local. |
| `PORT` | Port de l’API et du site, par défaut `3040`. |
| `DATABASE_PATH` | Base SQLite persistante, par défaut `data/clinique.sqlite`. Le chemin relatif part de la racine du projet. |

En production, installez l’application sur un serveur Node avec un disque persistant et un reverse proxy HTTPS. Servez l’interface et `/api/` sous **la même origine** et préservez les en-têtes `Origin` du navigateur. L’API refuse de démarrer en production sans origine HTTPS. N’exposez pas directement son port HTTP ; le proxy assure la terminaison TLS. Le dossier de données ne doit jamais être servi par le proxy.

Cette version vise un atelier personnel avec un administrateur et **une instance serveur**. N’utilisez pas la base SQLite sur un système de fichiers réseau ou dans plusieurs réplicas. GitHub Pages et un hébergement purement statique ne peuvent pas faire fonctionner cette authentification. Le code peut rester public sans publier le compte ou les données.

Le serveur ne fait pas confiance aux en-têtes `X-Forwarded-For` fournis par les clients : derrière un proxy, la limitation IP est donc partagée. Ajoutez une limitation appropriée au niveau de votre proxy sans supprimer les contrôles applicatifs. Le hachage scrypt demande environ 128 Mio par calcul ; prévoyez une marge mémoire, avec au maximum deux calculs simultanés.

## Sécurité mise en place

- Mot de passe de 15 à 128 caractères, hachage scrypt (`N=131072`, `r=8`, `p=1`) et sel aléatoire unique ; aucune valeur secrète dans le code frontend ou les variables Vite.
- Identifiant de session aléatoire de 256 bits, empreinte SHA-256 seulement dans la base. Cookie `HttpOnly`, `SameSite=Strict`, `Secure` et préfixe `__Host-` sous HTTPS.
- Durée maximale de 8 heures et expiration après 30 minutes sans activité API. Les vérifications périodiques de session n’allongent pas l’inactivité.
- Vérification d’origine sur les écritures, y compris la connexion, et jeton CSRF sur les autres mutations authentifiées.
- Limitation persistante des tentatives par adresse, par connexion réseau et globale, erreurs de connexion génériques et calcul comparable pour une adresse inconnue.
- Autorisation serveur à chaque lecture ou écriture des données, validation métier, limitation de taille et contrôle de révision pour éviter les modifications perdues.
- En-têtes de sécurité, refus de mise en cache des réponses, blocage de l’encadrement dans une page tierce ; aucun secret dans les journaux d’erreur.

Ce socle ne remplace pas un audit de sécurité. Il ne comprend pas de MFA, de gestion multi-utilisateurs, de connexion sociale ni de récupération par e-mail. La base n’est pas chiffrée par l’application : les accès système, le disque et les sauvegardes doivent être protégés par l’exploitant.

## Changement et récupération du mot de passe

Dans l’application : **Réglages & sauvegardes → Compte administrateur**. Le mot de passe actuel est requis. Toutes les sessions sont invalidées après le changement.

En cas d’oubli, depuis le terminal du serveur avec le même chemin de base :

```sh
npm run admin:reset
```

Cette commande exige l’adresse du compte existant et une nouvelle phrase de passe saisie sans affichage. Elle conserve l’inventaire et révoque les sessions. Aucun secret ne doit être collé dans une issue GitHub ou un message public.

## Sauvegardes

Exportez régulièrement un JSON depuis l’application. Pour sauvegarder aussi le compte, utilisez une sauvegarde SQLite cohérente ; une copie du seul fichier `.sqlite` pendant que le serveur fonctionne peut omettre le journal WAL. Le plus simple pour un atelier personnel est d’arrêter le serveur puis de sauvegarder le répertoire de données protégé. Testez vos restaurations et protégez ces copies, qui incluent les données privées et les empreintes de mots de passe.

## Développement

Après `npm install` et la création du compte, utilisez deux terminaux :

```sh
# Terminal 1 : API, origine de développement attendue par le serveur.
npm run dev:server

# Terminal 2 : interface et proxy /api.
npm run dev
```

Ouvrez exactement `http://127.0.0.1:5173`. Le nom `localhost`, un autre port ou un slash dans `APP_ORIGIN` n’est pas équivalent. Le serveur de développement utilise les ports 3040 et 5173. N’utilisez pas le mode développement en production.

```sh
npm test
npm run typecheck
npm run build
```

Les tests couvrent le métier et l’API d’authentification. La CI GitHub exécute les tests, le contrôle TypeScript et la compilation Vite. Les fichiers générés et les dépendances ne sont pas versionnés.

`build:offline` échoue volontairement avec une explication : une administration authentifiée n’a pas de mode HTML autonome sans serveur. L’ancienne édition séparée reste un produit local sans cette protection, pas une porte d’accès à la nouvelle base.

## Organisation

`src/` contient l’interface, le contrôle de session, les formulaires et les règles métier. `server/` contient l’API, SQLite et la gestion des mots de passe et sessions. `scripts/admin.mjs` gère la création et la récupération du compte. `tests/auth.test.mjs` teste les protections de l’API ; `tests/domain.test.cjs` conserve les tests métier.

MIT. Voir `LICENSE` et `THIRD_PARTY_NOTICES.md`. Les noms des consoles servent à l’identification ; l’application n’est pas affiliée aux fabricants.
