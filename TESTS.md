# Validation

## Tests automatisés

`npm test` compile les règles métier existantes puis exécute les tests Node.js, sans service externe.

- 32 tests métier : transitions, clôture, stocks, chronomètre, calculs, imports et exports.
- 20 tests de sécurité et d’intégration serveur : hachage avec sel, origine et HTTPS, accès anonyme refusé, absence de création publique de compte, erreurs génériques, cookies et empreinte de session, CSRF, persistance, validation, conflits de révision, limites JSON, déconnexion, expiration absolue et inactive, limitation des tentatives, changement de mot de passe et révocation des sessions, en-têtes et cloisonnement des fichiers.

Les 52 tests ont été exécutés localement avec succès lors de l’ajout de l’authentification, sous Node 22.16.0. Les identifiants fixes dans les tests sont uniquement des fixtures synthétiques ; l’application ne les installe jamais au démarrage.

La CI vérifie aussi les types et la compilation Vite. Consulter le résultat du workflow associé au commit pour son état réel.

## Sauvegarde et restauration SQLite

`npm run test:backup` exécute trois tests sans dépendance externe et sans données réelles. Ils sont aussi inclus dans `npm test` : instantané d’une base WAL ouverte avec écritures validées et transaction non validée, restauration autonome dans une base temporaire, intégrité et références, conservation du compte et des tables serveur, indépendance de la source, permissions Unix, refus des arguments invalides et des sources absentes ou corrompues, refus d’écraser une destination et nettoyage des fichiers temporaires. Tous les fichiers de test sont synthétiques et supprimés après exécution.

## Limites

Ces tests ne constituent ni un audit indépendant ni un test d’intrusion exhaustif. Le parcours visuel Chromium n’a pas pu être exécuté dans l’environnement de préparation : la navigation locale était bloquée par la politique du navigateur. Les comportements d’interface, d’accessibilité, de synchronisation d’onglets, d’import volumineux et de déploiement HTTPS doivent également être vérifiés sur l’hébergement cible.

## Recette de déploiement

Créer le compte depuis le terminal du serveur, vérifier la connexion et le refus d’un mot de passe incorrect, ajouter une console et recharger la page, tester l’import d’une copie de sauvegarde, se déconnecter puis appeler directement `/api/store` (401 attendu). Vérifier le cookie `Secure` sous HTTPS et l’absence de secrets dans le bundle. Modifier le mot de passe et vérifier que les sessions précédentes ne donnent plus accès à l’API. Tester la sauvegarde et la restauration du volume SQLite.
