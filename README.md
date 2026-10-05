Adresse de l’application : **https://sbtchr.github.io/podcast-facile/**. L’ancienne adresse `/site/` redirige vers cette version unique. Les projets locaux restent accessibles : l’origine du navigateur ne change pas.

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
- éditeur de partie à trois onglets : enregistrements vocaux, musiques de fond, ambiances et bruitages ;
- déplacement et découpe des sons sur la trame, choix d’un extrait sur une forme d’onde et aperçu du mixage avec les voix ;
- jingles en six étapes : style, titre 1 et sa réponse, présentation et sa réponse, titre 2 et sa réponse, accroche, écoute ;
- sauvegarde locale et export des projets `.podfacile` ;
- export du mixage final en MP3 (par défaut) ou WAV ;
- interface responsive pour ordinateur, tablette et téléphone.

## Sauvegarde et téléchargements

Le montage validé est enregistré automatiquement dans ce navigateur après cinq secondes sans modification. Le bouton « Sauvegarder » de la barre principale crée une copie `.podfacile` transportable : textes des voix et jingles, brouillons conservés, tous les fichiers audio (y compris les prises désactivées), découpes, ordre, pistes et réglages. « Garder le texte » permet de conserver une voix avant son enregistrement ; « Garder le brouillon » conserve un jingle incomplet. Les changements des fenêtres de montage doivent être validés avant de télécharger la sauvegarde. Une réimportation crée un nouveau projet et conserve les anciens.

Quand son sélecteur natif est disponible, Chrome ouvre « Enregistrer sous » dès le clic, en proposant Téléchargements. Safari et les navigateurs sans cette fonction affichent un fichier prêt avec un lien de téléchargement explicite. Dans Safari, le choix systématique du dossier se règle dans Réglages → Général → Emplacement de téléchargement des fichiers → Demander pour chaque téléchargement. Le site ne peut pas imposer ce réglage.

Si Chrome renvoie un `AbortError` parce que son sélecteur est intercepté, la préparation du fichier continue et le lien de téléchargement apparaît. Une annulation volontaire affiche un message explicite. Attention : un navigateur piloté par Playwright peut rediriger et renommer les téléchargements ; le site ne contrôle pas ce dossier de test.

Safari privilégie désormais l’enregistrement AAC/MP4 à 192 kbit/s ; Chrome conserve WebM/Opus. La durée retenue est celle de l’audio décodé. Le WAV reste PCM stéréo 16 bits à 44,1 kHz, avec contrôle des données et atténuation commune aux deux canaux si des crêtes dépassent la plage valide. Cette correction ne restaure pas une prise déjà dégradée à l’enregistrement. Le MP3 utilise le même mixage, encodé dans un worker avec `@breezystack/lamejs` 1.2.7 ([source](https://github.com/shijinyu/lamejs), [licence LGPL-3.0](app/public/licenses/lamejs-LGPL-3.0.txt)).

`node app/scripts/verify-project-files.mjs` vérifie la restitution des textes et des octets audio, les sons manquants, le choix du format d’enregistrement, la fenêtre de sauvegarde avant préparation du fichier, l’annulation volontaire, les sélecteurs interceptés par Chrome, le secours, les erreurs d’écriture et l’encodage WAV.

`node app/scripts/verify-mp3-export.mjs` exécute le worker de production puis décode son MP3 avec FFmpeg pour vérifier le débit, la durée, la hauteur des sons, les deux canaux, les crêtes et les erreurs de données.

## Organisation et jingles

Les boutons « Editer le jingle » et « Editer la partie » se trouvent en haut des blocs, juste avant leur trame. Les éléments utilisent les mêmes cartes compactes ; les prises du jingle possèdent une case pour les inclure ou les exclure sans les effacer. La barre discrète du carrousel indique seulement la position : les flèches, le pavé tactile ou le geste horizontal permettent de défiler. Dans une partie, trois onglets donnent accès aux enregistrements vocaux, aux musiques de fond et aux ambiances et bruitages. Le premier permet d’ajouter, modifier, déplacer ou retirer les voix, pauses/musique seule et transitions. Les boutons d’ajout ouvrent une fenêtre dédiée pour enregistrer une voix, modifier son texte ou sa transcription, choisir une pause ou une transition. Sur la trame, glisser une voix, une pause ou une transition change son ordre ; un repère montre où elle sera insérée. Sélectionner un élément donne accès à Modifier, Dupliquer et Supprimer, sans liste supplémentaire. Alt + flèche gauche/droite permet aussi de réordonner au clavier. Les prises sont gardées dans la partie avant de valider l’ensemble du montage. Une trame partage la même échelle de temps entre les voix vertes, les musiques bleues et les bruitages orange, dans l’éditeur comme sur l’écran principal. Un clic sur la trame ouvre l’éditeur : les pistes vides permettent d’ajouter un son, les clips de modifier un son ou les réglages de la voix. Le bouton « Écouter cette partie » est regroupé avec l’enregistrement et les transitions. Les sons se déplacent directement ; leurs poignées règlent le début et la fin. La forme d’onde du fichier permet de choisir l’extrait, et le lecteur fait écouter le mixage de cette partie depuis un repère. Les modifications se valident ensemble, restent annulables et ne changent pas les autres parties. Les repères suivent les enregistrements lorsqu’ils sont déplacés ; un son dont le repère a été supprimé reste visible comme « à replacer ». Les sons d’anciens projets liés directement à une voix restent lisibles et modifiables.

Le lecteur est placé au-dessus de la trame et reste visible au défilement. La barre d’espace lance ou met en pause la partie, sans gêner la saisie ou une bibliothèque ouverte. La règle place un repère au dixième de seconde ; les flèches l’ajustent de 0,1 seconde (1 seconde avec Maj). Sélectionner une voix puis « Scinder au repère » crée deux extraits du même fichier. Deux coupes isolent un passage à supprimer ; l’éditeur permet d’annuler chaque modification. Les fondus restent seulement aux extrémités extérieures, les sons suivent les morceaux et supprimer un passage referme son intervalle. Le fichier audio et les autres parties restent conservés.

Les jingles utilisent cinq morceaux choisis sur Pixabay — *Hurry Funk Intro* (Dynamique), *Spirit Of Adventure Powerful Opening* (Aventure), *Short Heroic Orchestral Loop* (Historique), *Cinematic of Emotions - Intro 11* (Mystère) et *Flash News 30 Seconds Buildup* (Sérieux) — et conservent *Funky Chunk* de Kevin MacLeod / Incompetech pour Radio. Chaque style possède deux arrangements de **25 ou 35 secondes**, conservés dans `app/public/audio/jingles/` avec leurs auteurs, sources, licences, empreintes et découpes reproductibles dans `sources.json`. Les nouvelles pistes utilisent la Pixabay Content License ; Radio et les anciennes musiques conservent leurs licences CC BY. Les phrases musicales sont sélectionnées, raccourcies ou reprises avec des raccords courts, sans changement de tempo ni de hauteur. Le script `prepare-jingle-beds.py /chemin/vers/les/originaux --version 5` reproduit les dix nouveaux arrangements. Le style choisit automatiquement la musique et le traitement du titre. Chaque nouveau jingle (`guided-v9`) propose sept prises distinctes, incluses par défaut et désactivables individuellement : titre 1 (voix 1), réponse de 2–3 mots (voix 2), présentation (voix 1 ou les deux ensemble dans une seule prise), réponse de 2–3 mots (voix 2), titre 2 avec une autre intonation (voix 1), nouvelle réponse de 2–3 mots (voix 2), puis accroche (voix 1 ou voix 2). Les réponses ne réutilisent jamais automatiquement une phrase entière. Leur texte est proposé à partir des derniers mots, puis reste modifiable. Une personne seule peut jouer les deux voix.

Le montage s’adapte aux durées des prises. Chaque réponse entre une demi-seconde avant la fin de sa phrase (avec un chevauchement plus court si la phrase est exceptionnellement brève). Les titres ont une grande réverbération stéréo de **2,6 à 3,6 secondes** selon le style, un retour de réverbération plus de trois fois plus présent et trois réflexions rapprochées. Les réponses gardent leur effet téléphone (bande resserrée, saturation légère, courte résonance et rebond), avec **12 dB d’atténuation sur tout le traitement**. La présentation et l’accroche conservent leur traitement naturel et discret. Les prises ne reçoivent aucun fondu ni changement de hauteur. Un compresseur préserve la marge lors du chevauchement de deux voix. La musique revient entre les groupes de paroles et atteint 135 % de son niveau d’ouverture en finale ; son niveau sous les voix reste réglable (32 % par défaut). Une prise peut être écoutée avec son effet ; après une réponse, l’aperçu fait entendre la phrase et la réponse ensemble.

Avec tous les éléments inclus, le budget musical minimal est de **10,5 secondes** : 3 secondes d’ouverture, trois respirations de 1,5 seconde et 3 secondes de finale. Cela laisse au maximum **14,5 secondes de présence vocale sur 25 secondes**, ou **24,5 secondes sur 35 secondes**, en tenant compte des chevauchements. Une phrase et sa réponse occupent le plus long de ces deux intervalles : la phrase seule, ou sa durée moins 0,5 seconde suivie de la réponse (la réponse démarre au plus tôt 0,15 seconde après le début d’une phrase exceptionnellement brève). Les trois groupes sont additionnés à l’accroche. Les groupes entièrement désactivés n’occupent aucun temps et ne créent pas de respiration supplémentaire. Une réponse incluse sans sa phrase démarre directement au début de son groupe. Si un seul groupe est inclus, l’ouverture et la finale partagent tout le temps musical restant ; si toutes les voix sont désactivées, la musique joue seule. Les paroles gardent toujours leur durée mesurée ; elles ne sont ni coupées ni accélérées pour tenir dans la musique.

Le temps musical disponible est la durée du fichier moins la présence vocale. Après les minima, le surplus est réparti entre les cinq passages selon des poids : ouverture et finale 1 ; après le titre 1, 1 + min(0,75, durée du premier groupe / 4) ; après la présentation, 1,2 + min(1, durée de son groupe / 6) ; après le titre 2, 0,8 + min(0,5, durée du deuxième groupe / 5). Lorsque plusieurs groupes sont inclus, l’ouverture et la finale plafonnent à 5 secondes ; leur surplus est redistribué aux passages intermédiaires. Une longue présentation reçoit ainsi une respiration plus importante et les prises courtes n’allongent plus seulement la finale.

Pour les prises manquantes, le texte est estimé à environ **140 mots par minute** (156 pour une courte réponse), avec une petite marge de départ. Ces estimations réservent provisoirement de la place aux prises incluses restantes ; chaque enregistrement remplace son estimation par sa durée réelle. La durée affichée est un conseil : le micro ne s’arrête pas automatiquement, et une prise importée n’est jamais refusée pour sa longueur. Les pauses extérieures à la phrase sont écartées. Les sept prises se préparent dans l’ordre souhaité, sans bloquer l’accès à l’écoute. La trame montre le montage des éléments inclus.

Les nouveaux jingles proposent 35 secondes par défaut. Les versions de 25 et 35 secondes restent disponibles sans perdre les voix ni les textes. Si les prises incluses tiennent aussi dans 25 secondes, l’écoute propose cette durée pour un jingle plus rythmé. Chaque prise peut être désactivée sans supprimer son audio, son texte ni ses effets, puis réactivée. Les jingles de versions guided-v3 à guided-v8 gardent leur montage jusqu’à leur modification ; leurs prises sont conservées lors du passage à guided-v9. Le fichier musical fixe toujours la durée totale et est lu une seule fois. Seuls les éléments inclus doivent avoir une prise pour valider. Si le montage complet dépasse la musique, la validation propose 35 secondes, une phrase plus courte ou la désactivation d’un élément ; les paroles ne sont jamais tronquées.

Un bruitage final peut être choisi, sans ajout automatique, parmi huit extraits locaux de moins de trois secondes : cloche, klaxon, corne de bateau, roulement de tambour, sonnette de vélo, ding-dong, ba-dum-tss et étincelle magique. Il se place après les paroles dans la finale, avec une marge à chaque extrémité et sans rallonger le jingle. Son volume reste réglable. Les anciens fichiers de musique et leurs crédits restent disponibles pour les projets existants. Les crédits des musiques et du bruitage final choisis peuvent être téléchargés depuis l’export.

## Texte à lire et transcription

Le champ de texte appartient au bloc vocal et reste dans les sauvegardes locales et `.podfacile`, même lorsqu’une nouvelle prise remplace la précédente. « Transcrire cet essai » décode la voix et la transcrit sur l’appareil dans un worker avec Whisper Small multilingue, quantifié en 8 bits, via Transformers.js 3.8.1. L’audio n’est envoyé à aucun service ; les requêtes externes téléchargent seulement les fichiers du modèle. Le moteur WASM est livré avec l’application. Le premier usage télécharge environ 250 Mo de modèle et les met en cache dans le navigateur. Le code et le moteur ne se chargent que lorsque la transcription est demandée. Le traitement peut être annulé ; les erreurs n’effacent ni l’audio ni le texte. Si le texte a déjà été écrit ou corrigé, le résultat est proposé séparément avant remplacement. Une relecture est prévue avant la nouvelle prise.

## Bibliothèque audio réelle

La bibliothèque propose 245 choix, avec deux onglets distincts pour les sons :

- 52 musiques de fond : 50 nouveautés de Scott Buckley et Kevin MacLeod / Incompetech, plus « Rêve médiéval » et « Égypte ancienne et désert » ;
- 134 bruitages courts et reconnaissables : canons, fusils, épées, chevaux, objets anciens, navigation, véhicules, reportage, animaux et ponctuations ;
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

La régression des aperçus couvre la lecture progressive, les limites d’extrait, le secours, l’annulation, les délais d’attente et les jingles vides. La régression de l’habillage couvre les repères, les extraits, les pauses entre voix, la modification et la suppression, ainsi que le rendu des anciens jingles. Le contrôle des nouveaux jingles couvre les douze arrangements, la conservation du choix de durée et des prises, les conseils de durée adaptatifs, les sept prises facultatives, les réponses indépendantes, leur chevauchement d’une demi-seconde et la protection des fenêtres musicales. Le montage adaptatif est aussi testé avec des prises de longueurs variables, les estimations du texte, les anciens budgets de capture et les cinq passages musicaux. Le montage flexible est contrôlé pour les 128 combinaisons d’éléments inclus, les réponses seules, la musique seule, les prises intégrales et les dépassements de durée. Les montages et minutages des anciennes versions restent contrôlés séparément. Les tests des pistes couvrent aussi les déplacements, les découpes, la stabilité des pistes et les modifications limitées à une partie ; les bruitages de fin sont contrôlés par leur durée, leur empreinte, leurs crédits et leur activation explicite. La capture microphone et la sortie audio Safari/iOS doivent aussi être vérifiées sur les appareils concernés selon `AUDIO_TESTING.md`.

## Limites

- une connexion internet est nécessaire lors de la première utilisation d’un son de la bibliothèque ou de la transcription ;
- la transcription peut faire des erreurs, notamment sur les noms propres ; le temps de calcul dépend de l’appareil ;
- la qualité et le niveau sonore varient selon les enregistrements d’origine ;
- le MP3 est encodé localement à 192 kbit/s, dans un worker ; aucune prise n’est envoyée à un serveur ;
- la compatibilité des fichiers personnels importés dépend du navigateur ;
- les projets très longs peuvent dépasser la mémoire disponible sur smartphone.

### Transitions radio et podcast

Le sélecteur propose 27 transitions locales CC0 : balayages, ponctuations musicales, zapping radio, impact, fanfare, carillon, roulement, scratch, buzzer et page tournée. Trois zappings supplémentaires de 6 à 8 secondes complètent le zapping court : tuner analogique, recherche de station et traversée FM. Trois pages tournées plus longues (grand livre, papier épais et feuilletage de plusieurs pages), deux buzzers (jeu télévisé et arcade), un pop, un boing, un glitch, un boom dramatique et un ding complètent la sélection pour les formats courts. Chaque carte dispose de son aperçu, utilisable avant la sélection et au volume choisi. Les anciens sons restent disponibles pour les projets enregistrés.

Sources, licences, extraits, traitements et empreintes : `app/public/audio/podcast-transitions/sources.json`. Les crêtes sont maîtrisées avant harmonisation du niveau ; les microfondus intégrés préservent les effets brefs.

```sh
python3 app/scripts/prepare-podcast-transitions.py --jobs 3
node app/scripts/verify-podcast-transitions.mjs
```
