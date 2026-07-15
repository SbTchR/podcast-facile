# Podcast Facile

Webapp pédagogique de montage de podcasts pour les élèves de 12 à 15 ans. Le montage se fait avec des cartes successives, sans pistes audio visibles.

## Fonctions de la V1

- création à partir de six modèles pédagogiques ;
- sections repliables et réorganisables ;
- blocs voix, musique, bruitage, pause, jingle et transition ;
- enregistrement au microphone avec compte à rebours, pause et reprise ;
- import WAV, MP3, M4A, OGG et WebM selon le navigateur, limité à 50 Mo ;
- découpage simple par début et fin ;
- volumes et fondus exprimés avec des mots simples ;
- effets voix téléphone, écho, grave et aiguë ;
- musique de fond avec ducking automatique ;
- jingles guidés ;
- lecture d’un bloc ou du podcast complet ;
- sauvegarde automatique dans IndexedDB ;
- export/import d’un projet `.podfacile` ;
- export du mixage final en WAV avec limiteur de crête ;
- interface responsive et commandes alternatives au glisser-déposer.

## Développement local

```bash
npm install
npm run dev
```

## Vérification et compilation

```bash
npm run check
npm run build
```

Le dossier `dist/` peut être hébergé sur n’importe quel hébergement statique. Le workflow GitHub Actions inclus publie automatiquement l’application sur GitHub Pages après chaque push sur `main`.

## Limites assumées de la V1

- export WAV uniquement ; l’export MP3 n’est pas inclus pour éviter une dépendance d’encodage lourde et fragile ;
- la bibliothèque audio externe est vide tant que des fichiers avec licences vérifiées ne sont pas sélectionnés ;
- les transitions intégrées sont générées localement par Web Audio API ;
- la compatibilité réelle des formats importés dépend du navigateur et du système ;
- les projets très longs ou contenant de nombreux gros fichiers peuvent dépasser la mémoire disponible, surtout sur smartphone.

## Personnalisation

Le nom et le texte d’accueil se trouvent au début de `src/App.tsx`. Les couleurs principales se trouvent dans les variables CSS au début de `src/styles.css`.
