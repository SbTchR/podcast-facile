# Podcast Facile — version 3

Webapp pédagogique de montage de podcasts pour les élèves de 12 à 15 ans. Le montage se fait avec des cartes successives, sans pistes audio visibles.

## Fonctions principales

- création à partir de six modèles pédagogiques ;
- enregistrement de la voix dans le navigateur ;
- import de fichiers audio ;
- sections et blocs réorganisables ;
- réglage du volume, des fondus et du découpage ;
- musiques sous la voix et construction guidée de jingles ;
- sauvegarde locale et export des projets `.podfacile` ;
- export du mixage final en WAV ;
- interface responsive pour ordinateur, tablette et téléphone.

## Bibliothèque audio réelle

La version 3 remplace les sons synthétiques par 45 fichiers audio réels :

- 13 musiques courtes de Jason Shaw / Audionautix sous licence CC BY 3.0 ;
- 32 bruitages et ambiances provenant principalement de PDSounds.org, ainsi que d’autres contributeurs de Wikimedia Commons ;
- catégories adaptées à l’histoire, la géographie, la navigation, l’industrie, la ville, l’école, la météo et les récits ;
- source, auteur et licence affichés pour chaque fichier dans l’application.

Les fichiers ne sont pas incorporés au dépôt : ils sont chargés depuis Wikimedia Commons lors du premier aperçu ou ajout, puis le Blob est conservé dans le projet local. Le détail complet figure dans [`AUDIO_CREDITS.md`](AUDIO_CREDITS.md).

## Développement local

```bash
npm install
npm run dev
npm run check
npm run build
```

## Limites

- une connexion internet est nécessaire lors de la première utilisation d’un son de la bibliothèque ;
- la qualité et le niveau sonore varient selon les enregistrements d’origine ;
- l’export MP3 n’est pas inclus ;
- la compatibilité des fichiers personnels importés dépend du navigateur ;
- les projets très longs peuvent dépasser la mémoire disponible sur smartphone.
