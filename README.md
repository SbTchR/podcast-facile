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
- ambiances en fond et bruitages pendant une voix ou entre les voix avec une pause réservée au son ;
- habillage en deux temps : musiques de fond, puis ambiances et bruitages, sur les pistes de la partie en cours ;
- déplacement et découpe des sons sur la trame, choix d’un extrait sur une forme d’onde et aperçu du mixage avec les voix ;
- jingles en six étapes : style, titre 1 et sa réponse, présentation et sa réponse, titre 2 et sa réponse, accroche, écoute ;
- sauvegarde locale et export des projets `.podfacile` ;
- export du mixage final en WAV ;
- interface responsive pour ordinateur, tablette et téléphone.

## Organisation et jingles

Dans une partie, l’élève prépare d’abord les voix, transitions et pauses. L’habillage sonore vient ensuite, avec les musiques de fond puis les ambiances et bruitages. Une trame partage la même échelle de temps entre les voix vertes, les musiques bleues et les bruitages orange, dans l’éditeur comme sur l’écran principal. Un clic sur la trame ouvre l’éditeur : les pistes vides permettent d’ajouter un son, les clips de modifier un son ou les réglages de la voix. Le bouton « Écouter cette partie » est regroupé avec l’enregistrement et les transitions. Les sons se déplacent directement ; leurs poignées règlent le début et la fin. La forme d’onde du fichier permet de choisir l’extrait, et le lecteur fait écouter le mixage de cette partie depuis un repère. Les modifications se valident ensemble, restent annulables et ne changent pas les autres parties. Les repères suivent les enregistrements lorsqu’ils sont déplacés ; un son dont le repère a été supprimé reste visible comme « à replacer ». Les sons d’anciens projets liés directement à une voix restent lisibles et modifiables.

Le lecteur est placé au-dessus de la trame et reste visible au défilement. La barre d’espace lance ou met en pause la partie, sans gêner la saisie ou une bibliothèque ouverte. La règle place un repère au dixième de seconde ; les flèches l’ajustent de 0,1 seconde (1 seconde avec Maj). Sélectionner une voix puis « Scinder au repère » crée deux extraits du même fichier. Deux coupes isolent un passage à supprimer ; l’éditeur permet d’annuler chaque modification. Les fondus restent seulement aux extrémités extérieures, les sons suivent les morceaux et supprimer un passage referme son intervalle. Le fichier audio et les autres parties restent conservés.

Les jingles utilisent cinq morceaux choisis sur Pixabay — *Hurry Funk Intro* (Dynamique), *Spirit Of Adventure Powerful Opening* (Aventure), *Short Heroic Orchestral Loop* (Historique), *Cinematic of Emotions - Intro 11* (Mystère) et *Flash News 30 Seconds Buildup* (Sérieux) — et conservent *Funky Chunk* de Kevin MacLeod / Incompetech pour Radio. Chaque style possède deux arrangements de **25 ou 35 secondes**, conservés dans `app/public/audio/jingles/` avec leurs auteurs, sources, licences, empreintes et découpes reproductibles dans `sources.json`. Les nouvelles pistes utilisent la Pixabay Content License ; Radio et les anciennes musiques conservent leurs licences CC BY. Les phrases musicales sont sélectionnées, raccourcies ou reprises avec des raccords courts, sans changement de tempo ni de hauteur. Le script `prepare-jingle-beds.py /chemin/vers/les/originaux --version 5` reproduit les dix nouveaux arrangements. Le style choisit automatiquement la musique et le traitement du titre. Chaque nouveau jingle (`guided-v7`) utilise sept prises distinctes : titre 1 (voix 1), réponse de 2–3 mots (voix 2), présentation (voix 1 ou les deux ensemble dans une seule prise), réponse de 2–3 mots (voix 2), titre 2 avec une autre intonation (voix 1), nouvelle réponse de 2–3 mots (voix 2), puis accroche (voix 1 ou voix 2). Les réponses ne réutilisent jamais automatiquement une phrase entière. Leur texte est proposé à partir des derniers mots, puis reste modifiable. Une personne seule peut jouer les deux voix.

Le montage commence par 3,2 secondes de musique. Chaque réponse entre une demi-seconde avant la fin de sa phrase (avec un chevauchement plus court si la phrase est exceptionnellement brève). Les passages musicaux de 2 secondes après le premier duo, de 2 à 3 secondes (25 s) ou 2 à 4 secondes (35 s) après la présentation, puis de 1,5 seconde après le deuxième duo sont conservés. Les titres ont une réverbération stéréo ample de 1 à 1,4 seconde selon le style. Les réponses reçoivent un effet téléphone : bande resserrée, saturation légère, courte résonance et rebond. La présentation et l’accroche gardent un traitement naturel, plus discret. Aucun fondu ni changement de hauteur n’est appliqué aux prises. Un compresseur préserve la marge lors du chevauchement de deux voix. La musique revient entre les groupes de paroles et atteint 135 % de son niveau d’ouverture en finale ; son niveau sous les voix reste réglable (32 % par défaut). Une prise peut être écoutée avec son effet immédiatement ; après une réponse, l’aperçu fait entendre la phrase et la réponse ensemble.

Chaque prise est comptée une seule fois, en tenant compte des chevauchements ; les autres prises et les passages musicaux sont réservés avant d’afficher le temps disponible. Les prises courtes rendent du temps aux phrases suivantes ; aucune parole n’est raccourcie ou accélérée. Les nouveaux jingles proposent 35 secondes par défaut, avec une option 25 secondes pour des titres et phrases très courts. Un bouton permet de passer à 35 secondes directement pendant les prises, sans perdre les voix ni les textes. Les jingles `guided-v3` à `guided-v6` déjà sauvegardés gardent leur montage jusqu’à leur modification ; leurs prises sont conservées et les nouvelles réponses doivent être enregistrées séparément avant de valider. Quand les prises courtes tiennent dans 25 secondes, l’écoute propose de réduire une longue finale de 35 secondes sans perdre de voix. Le fichier musical fixe la durée du jingle et est lu une seule fois ; au moins 3,2 secondes restent réservées au début et à la fin. Le temps encore libre prolonge la fin musicale. Un bruitage final peut être choisi, sans ajout automatique, parmi huit extraits locaux de moins de trois secondes : cloche, klaxon, corne de bateau, roulement de tambour, sonnette de vélo, ding-dong, ba-dum-tss et étincelle magique. Il se place après les paroles dans la fin musicale, sans rallonger le jingle. Son volume reste réglable. Les temps maximums sont calculés et ajustés selon les prises déjà gardées. Changer de style ou de durée conserve les voix ; une durée trop courte bloque l’enregistrement du jingle sans couper les phrases. Le micro affiche le temps restant et s’arrête à la limite. Les fichiers importés trop longs sont refusés ; les pauses extérieures à la phrase sont écartées. Les anciens fichiers de musique et leurs crédits restent disponibles pour les projets existants. Les crédits des musiques et du bruitage final choisis peuvent être téléchargés depuis l’export.

## Texte à lire et transcription

Le champ de texte appartient au bloc vocal et reste dans les sauvegardes locales et `.podfacile`, même lorsqu’une nouvelle prise remplace la précédente. « Transcrire cet essai » décode la voix et la transcrit sur l’appareil dans un worker avec Whisper Small multilingue, quantifié en 8 bits, via Transformers.js 3.8.1. L’audio n’est envoyé à aucun service ; les requêtes externes téléchargent seulement les fichiers du modèle. Le moteur WASM est livré avec l’application. Le premier usage télécharge environ 250 Mo de modèle et les met en cache dans le navigateur. Le code et le moteur ne se chargent que lorsque la transcription est demandée. Le traitement peut être annulé ; les erreurs n’effacent ni l’audio ni le texte. Si le texte a déjà été écrit ou corrigé, le résultat est proposé séparément avant remplacement. Une relecture est prévue avant la nouvelle prise.

## Bibliothèque audio réelle

La bibliothèque propose 218 choix, avec deux onglets distincts pour les sons :

- 52 musiques de fond : 50 nouveautés de Scott Buckley et Kevin MacLeod / Incompetech, plus « Rêve médiéval » et « Égypte ancienne et désert » ;
- 107 bruitages courts et reconnaissables : canons, fusils, épées, chevaux, objets anciens, navigation, véhicules, reportage, animaux et ponctuations ;
- 59 ambiances : bataille médiévale, bataille navale, marché médiéval, forge, taverne, front de la Seconde Guerre mondiale, voilier, locomotive à vapeur, paysages, foule et industrie ;
- catégories et recherche adaptées à l’histoire, la géographie et l’actualité ;
- source, auteur et licence affichés pour chaque fichier dans l’application.

Les 166 bruitages et ambiances sont des extraits CC0 de LaSonothèque et Freesound, servis localement dans `app/public/audio/curated-sounds/` (environ 35 Mo au total). Les bruitages durent au plus 12 secondes ; les ambiances durent au plus 30 secondes et peuvent être répétées sur une zone plus longue. Les scènes historiques composées portent la mention « reconstitution » ; ce ne sont pas des archives d’époque. Leur recette et les crédits de chaque composant sont conservés dans `sources.json`. Les 151 anciens sons gardent leurs identifiants pour les projets existants et les anciens raccourcis, sans encombrer le nouveau sélecteur. Les 52 musiques proposées sont des extraits instrumentaux locaux de 90 à 120 secondes, servis dans `app/public/audio/podcast-music/` (environ 112 Mo). Les 57 autres anciennes musiques restent référencées pour les projets existants, avec leurs sources d’origine. Les arrangements de jingle et les huit bruitages de fin sont également locaux.

La sélection musicale privilégie les arrangements simples et les fonds qui laissent de la place à la parole, en s’inspirant des collections de podcasting de Podcast.co et des productions minimalistes de radio de Blue Dot Sessions. Quinze catégories décrivent leur usage : **Jazz & radio**, **Acoustique & voyage**, **Piano & confidences**, **Documentaire & découverte**, **Histoire & civilisations**, **Enquête & mystère**, **Science-fiction & espace**, **Aventure & action**, **Fantaisie & humour**, **Groove & rythmes**, **Funk & hip-hop**, **Électro & dance**, **Rock & sport**, **Rythmes du monde**, **Rétro & jeux**. La palette conserve les fonds sobres et les thèmes de récit. Vingt morceaux supplémentaires apportent des rythmes plus francs et des timbres différents : funk à cuivres ou wah-wah, beat R&B, pop radio, électro de club, disco, rock, country rapide, calypso, tango, cumbia, ska et chiptune. Les passages sont choisis après l’installation du rythme, notamment après la montée de « Furious Freak » et au changement de thème de « EDM Detection Mode ». Les titres, descriptions et tags indiquent l’usage, le style et le tempo des nouveaux morceaux ; les passages les plus intenses sont destinés aux séquences d’action, transitions et finales. « Signal to Noise » utilise la version officielle sans mélodie de piano. Les 50 nouveaux fonds sont sous CC BY 4.0 ; les deux favoris gardent leurs licences initiales. Les licences de Pixabay et de nombreuses bibliothèques commerciales conviennent au podcast final, mais ne permettent pas nécessairement la redistribution des pistes seules dans une application ; elles ne servent donc pas de source à ce pack de fonds.

`python3 app/scripts/prepare-podcast-music.py --jobs 3` reconstruit les extraits depuis `selection.json` : téléchargement des originaux dans le dossier temporaire système, empreintes, découpe, niveau harmonisé à −20 LUFS, microfondus de 80 ms, MP3 stéréo à 160 kbit/s. Le tempo et la hauteur sont conservés. `sources.json` garde la provenance, les découpes et les empreintes ; `podcastMusic.ts` et la section des crédits sont générés. `--force` reconstruit les fichiers ; `--force-id IDENTIFIANT` permet de ne refaire qu’un morceau. Le niveau et les crêtes des fichiers nouvellement préparés sont contrôlés après l’encodage. L’export des crédits inclut désormais les musiques de fond et les sons effectivement utilisés, en plus des jingles, pour les joindre à la description d’un podcast publié.

Ouvrir la bibliothèque ne télécharge pas tous les sons. Les aperçus, limités à 12 secondes, utilisent la lecture progressive du navigateur : ils commencent sans attendre le téléchargement intégral. L’ajout conserve le fichier dans le projet local. Un cache en mémoire garde les 12 derniers fichiers ajoutés. Un aperçu en cours de chargement peut être annulé.

`python3 app/scripts/prepare-curated-sounds.py --jobs 4` reproduit la sélection à partir du manifeste : téléchargement des originaux dans `/tmp`, sélection des extraits, harmonisation des niveaux, MP3 à 128 kbit/s, sources, empreintes et crédits. Les fichiers déjà vérifiés sont réutilisés. `--force` les reconstruit ; `--refresh-endings` reconstruit aussi les huit extraits de fin de jingle. Les prises et projets des élèves ne sont pas modifiés.

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

La régression des aperçus couvre la lecture progressive, les limites d’extrait, le secours, l’annulation, les délais d’attente et les jingles vides. La régression de l’habillage couvre les repères, les extraits, les pauses entre voix, la modification et la suppression, ainsi que le rendu des anciens jingles. Le contrôle des nouveaux jingles couvre les douze arrangements, la conservation du choix de durée et des prises, les budgets adaptatifs, les sept prises obligatoires, les réponses indépendantes, leur chevauchement d’une demi-seconde et la protection des fenêtres musicales. Les montages et minutages des anciennes versions restent contrôlés séparément. Les tests des pistes couvrent aussi les déplacements, les découpes, la stabilité des pistes et les modifications limitées à une partie ; les bruitages de fin sont contrôlés par leur durée, leur empreinte, leurs crédits et leur activation explicite. La capture microphone et la sortie audio Safari/iOS doivent aussi être vérifiées sur les appareils concernés selon `AUDIO_TESTING.md`.

## Limites

- une connexion internet est nécessaire lors de la première utilisation d’un son de la bibliothèque ou de la transcription ;
- la transcription peut faire des erreurs, notamment sur les noms propres ; le temps de calcul dépend de l’appareil ;
- la qualité et le niveau sonore varient selon les enregistrements d’origine ;
- l’export MP3 n’est pas inclus ;
- la compatibilité des fichiers personnels importés dépend du navigateur ;
- les projets très longs peuvent dépasser la mémoire disponible sur smartphone.
