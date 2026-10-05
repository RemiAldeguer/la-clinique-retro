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

Les exports et imports **JSON existants restent disponibles** dans Réglages & sauvegardes : ils sauvegardent l’atelier, sans le compte administrateur. Pour sauvegarder toute la base (atelier, révision, compte et empreinte de mot de passe, sessions et limitations), utilisez depuis la racine du projet :

```sh
npm run backup -- .backups/clinique-2026-10-05.sqlite
```

Choisissez un nouveau nom à chaque exécution. La commande charge `.env` comme le serveur et utilise le même `DATABASE_PATH` (par défaut `data/clinique.sqlite`). Les chemins relatifs de source et destination partent de la racine du projet ; les chemins absolus sont acceptés. La destination doit finir par `.sqlite`. Aucun serveur, compte de test ou compilation de l’interface n’est nécessaire.

Le serveur peut rester en fonctionnement. La commande ouvre la source existante en lecture seule et utilise **`VACUUM INTO`**, qui produit un instantané transactionnel cohérent incluant les données validées présentes dans le WAL. Elle n’initialise pas la base, ne copie pas le seul fichier principal et n’exige pas de checkpoint préalable. Les transactions non validées et les changements postérieurs à l’instantané ne sont pas inclus. Voir la [documentation SQLite](https://www.sqlite.org/lang_vacuum.html#vacuum_with_an_into_clause).

La sauvegarde est d’abord créée dans un dossier temporaire privé à côté de la destination, puis vérifiée avec `PRAGMA integrity_check` et `PRAGMA foreign_key_check`. Elle est publiée par lien physique atomique uniquement après validation, sans écraser de fichier ou lien existant. Le fichier final est autonome : aucun `-wal` ou `-shm` n’est à transporter. Les erreurs donnent un code de sortie non nul et les fichiers temporaires sont nettoyés lors d’une sortie normale. Après une interruption brutale, un dossier `.backup-*` peut subsister : ce n’est pas une sauvegarde publiée et il peut être supprimé une fois la commande arrêtée.

Utilisez un disque local persistant supportant les liens physiques, avec assez d’espace pour l’instantané. Sous Unix, les nouveaux dossiers sont privés et le fichier final a les permissions `0600`. Protégez également le dossier parent et les ACL sous Windows. Ces sauvegardes ne sont pas chiffrées et contiennent des données privées et des empreintes de mots de passe. Conservez une copie protégée sur un autre support et définissez votre fréquence et votre rétention ; cette commande ne programme ni transfert ni purge. Les bases, leurs journaux et `.backups/` sont exclus de Git. Ne placez aucune sauvegarde dans `dist/` ou un dossier servi publiquement.

### Restaurer une sauvegarde complète

1. Arrêtez toutes les instances du serveur et les commandes utilisant cette base. Conservez le répertoire de données actuel complet, y compris ses éventuels journaux, à un autre emplacement privé pour pouvoir revenir en arrière.
2. Vérifiez la sauvegarde sur une copie temporaire avec `PRAGMA integrity_check` (`ok` attendu) et `PRAGMA foreign_key_check` (aucune ligne attendue). Le test automatisé ci-dessous démontre cette restauration avec des données synthétiques ; il ne remplace pas la vérification de vos propres copies.
3. Placez le seul fichier sauvegardé au chemin `DATABASE_PATH`, dans un répertoire privé. Aucun ancien fichier `-wal`, `-shm` ou `-journal` ne doit rester à côté du fichier restauré : archivez-les avec l’ancienne base avant le remplacement, serveur arrêté. Rétablissez le propriétaire du service et les permissions du fichier (`0600` sous Unix).
4. Avant de rouvrir le serveur, lancez `npm run admin:reset` avec le même `DATABASE_PATH` et l’adresse du compte de la sauvegarde. Choisissez une nouvelle phrase de passe : cette opération conserve l’atelier et révoque les sessions restaurées, qui pourraient sinon redevenir utilisables.
5. Lancez `npm start`, connectez-vous puis vérifiez l’inventaire, les réparations et les photos. Une restauration complète remplace aussi le compte et revient à l’état sauvegardé ; les modifications ultérieures sont perdues.

Test reproductible sans données réelles, uniquement dans un répertoire temporaire supprimé à la fin :

```sh
npm run test:backup
```

Ce test conserve une connexion WAL ouverte, prouve qu’une copie brute omet des écritures, exécute la commande réelle, restaure le fichier dans une nouvelle base temporaire et vérifie son intégrité, ses données et son indépendance de la source. Il couvre aussi les erreurs et l’absence d’écrasement. Il est inclus dans `npm test` et donc dans la CI.

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

Les tests couvrent le métier, l’API d’authentification et la sauvegarde/restauration SQLite. La CI GitHub exécute les tests, le contrôle TypeScript et la compilation Vite. Les fichiers générés et les dépendances ne sont pas versionnés.

`build:offline` échoue volontairement avec une explication : une administration authentifiée n’a pas de mode HTML autonome sans serveur. L’ancienne édition séparée reste un produit local sans cette protection, pas une porte d’accès à la nouvelle base.

## Organisation

`src/` contient l’interface, le contrôle de session, les formulaires et les règles métier. `server/` contient l’API, SQLite et la gestion des mots de passe et sessions. `scripts/admin.mjs` gère la création et la récupération du compte. `tests/auth.test.mjs` teste les protections de l’API ; `tests/domain.test.cjs` conserve les tests métier.

MIT. Voir `LICENSE` et `THIRD_PARTY_NOTICES.md`. Les noms des consoles servent à l’identification ; l’application n’est pas affiliée aux fabricants.
