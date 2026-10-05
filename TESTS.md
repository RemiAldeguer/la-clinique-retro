# Validation et limites

## Rejouer les tests

```sh
npm install
npm test
npm run typecheck
npm run build
npm run build:offline
```

`npm test` recompile les modules `domain.ts` et `seed.ts` dans `tests/.compiled/`, puis exécute les 32 tests de `tests/domain.test.cjs`. Les fichiers compilés ne sont pas versionnés.

La suite vérifie les données de démonstration et l’atelier vide, l’unicité des réparations ouvertes, le cycle de vie, les tests de clôture, les réouvertures, la consommation et le retour des pièces, le gel des coûts, le chronomètre, les montants, la validation d’import et la neutralisation des formules CSV.

## Livraison initiale

L’édition HTML initialement livrée a réussi 32 tests métier et 24 vérifications d’interface sous Chromium. Les parcours d’interface utilisaient un stockage simulé et des interceptions de téléchargements : ils ne validaient pas la persistance réelle à une origine, les téléchargements natifs ou le dialogue d’impression.

Les dépendances npm n’ont pas pu être téléchargées dans l’environnement initial. La publication GitHub conserve les sources métier et d’interface, mais remplace le runtime React précompilé par une construction depuis npm. Le script de construction autonome utilise esbuild pour incorporer JavaScript et CSS.

## Vérification sur le navigateur utilisé au quotidien

Créez une console, fermez puis rouvrez l’application à la même adresse et dans le même profil. Vérifiez la persistance, exportez une sauvegarde JSON, restaurez-la et imprimez un dossier. Testez les photos et surveillez le quota local avant de saisir une collection volumineuse.

La suite métier ne remplace pas ces contrôles réels sur Safari, Firefox ou un téléphone. Il n’y a pas de validation multi-utilisateur ni de backend dans cette version.
