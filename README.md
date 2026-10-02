# Podcast Facile — version 3

Webapp pédagogique de création de podcasts pour les élèves de 12 à 15 ans. Le podcast se construit avec des cartes successives, avec un habillage sonore compact sous les voix de chaque partie.

Le parcours propose quatre repères : enregistrer les voix, placer les musiques de fond, ajouter les bruitages, puis écouter et télécharger. Un bouton ouvre directement l’enregistrement de l’introduction. Les réglages facultatifs restent accessibles dans des panneaux repliables. Les jingles encore vides sont signalés et ne créent pas de silence dans le fichier final.

## Fonctions principales

- plan pédagogique guidé, adaptable par l’élève ;
- enregistrement de la voix avec un texte à lire conservé entre les prises ;
- transcription locale facultative d’un essai, en français, allemand ou anglais, puis correction et réenregistrement ;
- import de fichiers audio ;
- sections et blocs réorganisables ;
- réglage du volume, des fondus et du découpage ;
- musiques de fond sur toute une partie ou une zone, plusieurs musiques possibles ;
- bruitages pendant une voix ou entre les voix avec une pause réservée au son ;
- habillage en deux temps : musiques de fond, puis bruitages, sur les pistes de la partie en cours ;
- déplacement et découpe des sons sur la trame, choix d’un extrait sur une forme d’onde et aperçu du mixage avec les voix ;
- jingles en cinq étapes : style, deux intonations du titre, présentation, accroche, écoute ;
- sauvegarde locale et export des projets `.podfacile` ;
- export du mixage final en WAV ;
- interface responsive pour ordinateur, tablette et téléphone.

## Organisation et jingles

Dans une partie, l’élève prépare d’abord les voix, transitions et pauses. L’habillage sonore vient ensuite, avec les musiques de fond puis les bruitages. Une trame partage la même échelle de temps entre les voix vertes, les musiques bleues et les bruitages orange, dans l’éditeur comme sur l’écran principal. Un clic sur la trame ouvre l’éditeur : les pistes vides permettent d’ajouter un son, les clips de modifier un son ou les réglages de la voix. Le bouton « Écouter cette partie » est regroupé avec l’enregistrement et les transitions. Les sons se déplacent directement ; leurs poignées règlent le début et la fin. La forme d’onde du fichier permet de choisir l’extrait, et le lecteur fait écouter le mixage de cette partie depuis un repère. Les modifications se valident ensemble, restent annulables et ne changent pas les autres parties. Les repères suivent les enregistrements lorsqu’ils sont déplacés ; un son dont le repère a été supprimé reste visible comme « à replacer ». Les sons d’anciens projets liés directement à une voix restent lisibles et modifiables.

Les jingles utilisent cinq morceaux choisis sur Pixabay — *Hurry Funk Intro* (Dynamique), *Spirit Of Adventure Powerful Opening* (Aventure), *Short Heroic Orchestral Loop* (Historique), *Cinematic of Emotions - Intro 11* (Mystère) et *Flash News 30 Seconds Buildup* (Sérieux) — et conservent *Funky Chunk* de Kevin MacLeod / Incompetech pour Radio. Chaque style possède deux arrangements de **25 ou 35 secondes**, conservés dans `app/public/audio/jingles/` avec leurs auteurs, sources, licences, empreintes et découpes reproductibles dans `sources.json`. Les nouvelles pistes utilisent la Pixabay Content License ; Radio et les anciennes musiques conservent leurs licences CC BY. Les phrases musicales sont sélectionnées, raccourcies ou reprises avec des raccords courts, sans changement de tempo ni de hauteur. Le script `prepare-jingle-beds.py /chemin/vers/les/originaux --version 5` reproduit les dix nouveaux arrangements. Le style choisit automatiquement la musique et le traitement du titre. Chaque nouveau jingle (`guided-v5`) utilise quatre prises : deux intonations du même titre, une présentation et une accroche. Le titre 1 commence après 3,2 secondes de musique ; l’intonation 2 démarre 1,5 seconde après le début du titre 1, avec le rappel électrique audible. La présentation commence après la dernière des deux fins de titre, puis le titre 1 revient après la présentation. Les pauses se resserrent lorsque les paroles sont longues : 0,3 à 0,83 seconde avant la présentation, 0,12 à 0,3 seconde avant le retour du titre, puis au moins 0,4 seconde de relance musicale avant l’accroche. Les voix reçoivent une légère réverbération et aucun fondu. Les budgets tiennent compte des deux lectures du titre 1 et du chevauchement initial. Les titres sont guidés vers des prises courtes ; la présentation récupère le temps disponible en réservant une accroche utilisable. Une fois les autres prises enregistrées, réenregistrer une phrase permet de récupérer toute la durée encore disponible. Un bouton permet de passer à 35 secondes directement pendant les prises, sans perdre les voix ni les textes. Les jingles `guided-v3` et `guided-v4` déjà sauvegardés gardent leur montage jusqu’à leur modification ; les jingles à trois prises demandent une deuxième intonation avant de valider. La musique remonte après le retour du titre ; le curseur « Musique sous les voix » règle directement son niveau relatif (32 % par défaut, 0 % pour couper la musique pendant les paroles). Le fichier musical fixe la durée du jingle et est lu une seule fois ; 3,2 secondes restent réservées au début et à la fin. Après l’accroche, la musique remonte à 135 % de son niveau d’ouverture. Un bruitage final peut être choisi, sans ajout automatique, parmi six extraits locaux de moins de trois secondes : cloche, klaxon, corne de bateau, roulement de tambour, sonnette de vélo et ding-dong. Il se place après les paroles dans la fin musicale, sans rallonger le jingle. Son volume reste réglable. Les temps maximums sont calculés et ajustés selon les prises déjà gardées. Changer de style ou de durée conserve les voix ; une durée trop courte bloque l’enregistrement du jingle sans couper les phrases. Le micro affiche le temps restant et s’arrête à la limite. Les fichiers importés trop longs sont refusés ; les pauses extérieures à la phrase sont écartées. Les anciens fichiers de musique et leurs crédits restent disponibles pour les projets existants. Les crédits des musiques et du bruitage final choisis peuvent être téléchargés depuis l’export.

## Texte à lire et transcription

Le champ de texte appartient au bloc vocal et reste dans les sauvegardes locales et `.podfacile`, même lorsqu’une nouvelle prise remplace la précédente. « Transcrire cet essai » décode la voix et la transcrit sur l’appareil dans un worker avec Whisper Tiny multilingue, quantifié en 8 bits, via Transformers.js 3.8.1. L’audio n’est envoyé à aucun service ; les requêtes externes téléchargent seulement les fichiers du modèle. Le moteur WASM est livré avec l’application. Le premier usage télécharge environ 40 Mo de modèle et les met en cache dans le navigateur. Le code et le moteur ne se chargent que lorsque la transcription est demandée. Le traitement peut être annulé ; les erreurs n’effacent ni l’audio ni le texte. Si le texte a déjà été écrit ou corrigé, le résultat est proposé séparément avant remplacement. Une relecture est prévue avant la nouvelle prise.

## Bibliothèque audio réelle

La bibliothèque contient 210 fichiers audio réels :

- 59 musiques, dont des compositions de Jason Shaw / Audionautix ;
- 151 bruitages et ambiances provenant notamment de PDSounds.org et de Wikimedia Commons ;
- catégories adaptées à l’histoire, la géographie, la navigation, l’industrie, la ville, l’école, la météo et les récits ;
- source, auteur et licence affichés pour chaque fichier dans l’application.

Les fichiers de cette bibliothèque générale ne sont pas incorporés au dépôt. Les musiques de jingle, leurs deux durées et les six bruitages de fin sont servis localement avec l’application. Les aperçus, limités à 12 secondes, utilisent la lecture progressive du navigateur : ils commencent sans attendre le téléchargement intégral. L’ajout télécharge toujours le fichier complet pour conserver le son dans le projet local. Un cache en mémoire conserve les 12 derniers fichiers ajoutés. La source de secours reste disponible en cas d’erreur, et un aperçu en cours de chargement peut être annulé.

La lecture utilise les événements et l’arrêt de chargement de [`HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load). La connexion et les serveurs externes peuvent encore influer sur le délai. Les sources et licences sont accessibles depuis chaque son et dans la page de crédits de l’application.

## Développement local

```bash
cd app
npm install
npm run dev
npm run check
npm run build
```

Les sources complètes dans `app/src/` sont désormais maintenues directement. Le script historique de reconstruction les préserve lorsqu’il reconnaît la version de l’interface élèves. Il ne faut pas les remplacer par les anciens fragments `app-parts/`.

Vérifications depuis la racine :

```bash
bash app/scripts/verify-audio-source.sh
bash app/scripts/verify-audio-build.sh
```

La régression des aperçus couvre la lecture progressive, les limites d’extrait, le secours, l’annulation, les délais d’attente et les jingles vides. La régression de l’habillage couvre les repères, les extraits, les pauses entre voix, la modification et la suppression, ainsi que le rendu des anciens jingles. Le contrôle des nouveaux jingles couvre les douze arrangements, la conservation du choix de durée et des prises, les budgets adaptatifs, les quatre prises obligatoires, le retour du premier titre et la protection des fenêtres musicales. Les tests des pistes couvrent aussi les déplacements, les découpes, la stabilité des pistes et les modifications limitées à une partie ; les bruitages de fin sont contrôlés par leur durée, leur empreinte, leurs crédits et leur activation explicite. La capture microphone et la sortie audio Safari/iOS doivent aussi être vérifiées sur les appareils concernés selon `AUDIO_TESTING.md`.

## Limites

- une connexion internet est nécessaire lors de la première utilisation d’un son de la bibliothèque ou de la transcription ;
- la transcription peut faire des erreurs, notamment sur les noms propres ; le temps de calcul dépend de l’appareil ;
- la qualité et le niveau sonore varient selon les enregistrements d’origine ;
- l’export MP3 n’est pas inclus ;
- la compatibilité des fichiers personnels importés dépend du navigateur ;
- les projets très longs peuvent dépasser la mémoire disponible sur smartphone.
