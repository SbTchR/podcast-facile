# Podcast Facile — version 2

Webapp pédagogique de montage de podcasts pour les élèves de 12 à 15 ans. Le montage se fait avec des cartes successives, sans pistes audio visibles.

## Fonctions principales

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

## Bibliothèques audio intégrées

La version 2 ajoute 96 sons générés localement :

- 20 musiques de fond et de jingle ;
- 76 bruitages ;
- recherche par mots-clés ;
- filtres par catégories ;
- écoute avant ajout ;
- utilisation dans les blocs musique et bruitage, sous une voix et dans les jingles.

Les catégories sont pensées pour les podcasts scolaires : histoire militaire et sociale, navigation, industrialisation, XXe siècle, paysages, météo, risques naturels, villes, mobilités, école, objets, récits et transitions radio. Aucun fichier sonore externe n’est inclus : les sons sont synthétisés dans le navigateur à la demande.

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

## Limites assumées de la V2

- export WAV uniquement ; l’export MP3 n’est pas inclus pour éviter une dépendance d’encodage lourde et fragile ;
- les sons procéduraux privilégient la clarté et la légèreté ; ils ne prétendent pas remplacer une banque de sons professionnelle ;
- la compatibilité réelle des formats importés dépend du navigateur et du système ;
- les projets très longs ou contenant de nombreux gros fichiers peuvent dépasser la mémoire disponible, surtout sur smartphone.
