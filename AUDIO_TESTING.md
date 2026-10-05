# Matrice de test audio

Cette matrice doit être exécutée après toute modification du moteur audio, de l’enregistrement ou des sources externes.

## Navigateurs à vérifier

- Safari sur macOS
- Safari sur iPhone ou iPad
- Chrome sur macOS

## Test rapide des sources

Ouvrir `site/audio-diagnostics.html`, puis :

1. lancer tous les tests ;
2. vérifier que les deux fichiers Wikimedia sont téléchargés et décodés ;
3. vérifier séparément les quatre fichiers Pixabay ;
4. tester l’autorisation du microphone ;
5. copier le journal technique si un test échoue.

## Parcours fonctionnel complet

1. Créer un projet neuf.
2. Enregistrer une voix d’au moins 20 secondes.
3. Couper environ deux secondes au début et à la fin.
4. Ajouter une musique de fond.
5. Ajouter deux bruitages synchronisés à des moments différents.
6. Écouter sans effet vocal.
7. Tester l’effet téléphone et l’écho.
8. Tester la voix grave : aucune fin ne doit être coupée et les bruitages doivent rester synchronisés.
9. Tester la voix aiguë : aucun blanc artificiel ne doit rester après la voix et les bruitages doivent rester synchronisés.
10. Sauvegarder, fermer, rouvrir et réécouter le projet.
11. Exporter en WAV et écouter le fichier complet.
12. Exporter une sauvegarde `.podfacile`, la réimporter et vérifier tous les éléments.

## Jingle guidé avec deux intonations du titre

1. Préparer un jingle et parcourir les six styles : les cinq pistes Pixabay sélectionnées doivent remplacer les anciens morceaux, Radio doit conserver Funky Chunk ; chaque style doit charger sa propre musique locale, avec ses crédits. Vérifier les deux durées de 25 et 35 secondes ; changer de style doit conserver la durée choisie.
2. Enregistrer deux fois le même titre avec des intonations différentes, puis la présentation et l’accroche. Vérifier le texte à lire, le temps restant, la pause/reprise du micro et l’arrêt automatique à la limite.
3. Importer une phrase trop longue : elle doit être refusée avec une indication de durée, sans effacer la prise précédente.
4. Passer d’une musique longue à une musique courte : les prises sont conservées ; si elles dépassent le temps disponible, la suite reste bloquée jusqu’à une correction ou un autre style.
5. Écouter : 3,2 secondes de musique au départ, titre 1, rappel avec l’intonation 2 démarrant 1,5 seconde après le début du titre 1, pause de 0,3 à 0,83 seconde après la dernière fin de titre selon la place disponible, présentation claire, retour du titre 1 après 0,12 à 0,3 seconde, relance musicale d’au moins 0,4 seconde, accroche naturelle avec la même amélioration que la présentation, puis 3,2 secondes de conclusion musicale. La fin musicale remonte davantage après l’accroche. Aucun bruitage final n’est ajouté par défaut ; choisir un des six sons proposés doit le placer après les paroles, dans la même durée musicale. À 32 %, la musique sous les paroles doit être plus présente qu’auparavant ; à 0 %, elle doit se couper seulement pendant les paroles.
6. Changer d’étape ou démarrer le micro pendant un aperçu : les autres lecteurs doivent s’arrêter.
7. Sauvegarder et rouvrir ; exporter en WAV puis en `.podfacile` et réimporter. Le jingle doit garder ses quatre prises de voix, son choix de 25 ou 35 secondes et exactement la durée de sa musique. Avec des prises qui tiennent dans 35 secondes mais pas dans 25, passer à 25 doit conserver les voix et bloquer la validation ; revenir à 35 doit rendre le jingle prêt sans réenregistrement.
8. À l’étape Présentation, vérifier que le temps inutilisé par les titres augmente le budget. Enregistrer des prises près des limites : les pauses doivent se resserrer, aucune voix ne doit être coupée et la fin musicale doit rester réservée. Le bouton « passer à 35 secondes » doit garder les quatre prises, les textes et l’étape en cours.
9. Télécharger les crédits des musiques et du bruitage final choisis (Pixabay Content License pour les nouvelles pistes, CC BY pour Radio et les anciennes sources). Vérifier aussi qu’un ancien jingle à prise unique garde son rendu tant que le nouveau parcours n’est pas enregistré, et qu’un jingle guidé existant conserve sa musique et ses crédits tant qu’il n’est pas modifié.

## Critères de réussite

- aucune erreur JavaScript visible ;
- aucune voix coupée ;
- aucun blanc ajouté par les effets grave ou aigu ;
- bruitages synchronisés après application des effets ;
- musique de fond maintenue pendant toute la voix ;
- sauvegarde locale et réimportation intactes ;
- export WAV lisible jusqu’à la dernière seconde ;
- fichiers Pixabay téléchargés et décodés dans le navigateur testé.

## Limites connues

La réduction de bruit, la suppression d’écho et le gain automatique pendant l’enregistrement restent fournis par le navigateur. Les phrases des nouveaux jingles reçoivent une égalisation, une compression et un niveau ajusté ; ces traitements ne remplacent pas une prise de son claire. Les tests du micro physique et de la sortie audio Safari/iOS doivent être exécutés sur ces appareils.

## Pistes de la partie et fin du jingle

1. Préparer deux parties, avec trois voix dans la première. Cliquer sur la piste de musique : seule cette partie apparaît, avec les voix vertes, les musiques bleues et les bruitages orange sur la même règle.
2. Ajouter deux musiques, les déplacer et tirer leurs bords. Écouter avec les voix depuis un repère ; mettre en pause et reprendre. La découpe d’un son non répété doit suivre son extrait source ; un son répété garde son extrait et change sa zone de couverture.
3. Continuer vers les bruitages. Déplacer un son, réserver une pause après une voix puis retirer cette pause : la durée de la partie doit retrouver sa valeur initiale. Importer et retirer un autre son.
4. Enregistrer : l’écran principal doit afficher toutes les pistes. Annuler une modification, rétablir, puis rouvrir le projet. L’autre partie doit rester inchangée. Fermer l’éditeur par « Annuler » doit conserver les positions enregistrées.
5. Dans l’écoute finale d’un jingle, ouvrir « Bruitage final ». Vérifier les six aperçus, choisir un son, régler son volume et essayer « Aucun bruitage ». Le choix et le volume doivent survivre à la sauvegarde et à l’export `.podfacile` ; les crédits téléchargés doivent correspondre au son retenu.
6. Vérifier sur ordinateur et téléphone : aucun débordement horizontal, contrôles accessibles en faisant défiler le dialogue, boutons de validation visibles.


## Texte à lire, transcription et réglages de voix

1. Ouvrir une voix : le texte à lire est vide dans un ancien projet. Importer ou enregistrer un essai, puis le transcrire. Le texte doit être éditable. Vérifier français, puis les autres langues avec des paroles correspondantes.
2. Corriger le texte, puis retranscrire : la correction doit être conservée et le nouveau texte proposé à part. Remplacer la prise, sauvegarder, rouvrir et réimporter une sauvegarde : le texte corrigé reste attaché au bloc.
3. Annuler une transcription en cours et fermer le dialogue : aucun résultat tardif ne doit modifier une autre prise. Une prise silencieuse produit un message sans télécharger le modèle.
4. Bloquer les connexions externes après le premier téléchargement, puis rouvrir la voix et transcrire : le modèle doit provenir du cache et le moteur de l’application. Surveiller les requêtes : aucun envoi de l’audio, seulement des téléchargements au premier usage.
5. Cliquer sur une voix dans la trame : volume, clarté et effets sont disponibles dans l’éditeur des pistes. Changer un effet, écouter avec les musiques, valider et annuler/rétablir. La fenêtre d’enregistrement ne propose plus ces traitements.
6. Vérifier la page principale : pas de titre explicatif de trame, pas de boutons « Modifier les pistes », pas de liste « X sons ajoutés ». Le lecteur de partie est à droite des actions d’enregistrement sur ordinateur. Les pistes vides offrent l’ajout au clavier et à la souris.
7. Supprimer le repère d’un son : sélectionner « À replacer », cliquer « Placer au repère d’écoute », puis valider. Aucun champ numérique de placement n’est nécessaire.

## Export Safari et adresse unique (5 octobre 2026)

Les boucles de retour des échos pouvaient bloquer ou faire planter WebKit pendant la création des sources de l’OfflineAudioContext. Les trois traitements concernés utilisent désormais des répétitions sans cycle, avec les mêmes délais et niveaux ; seule la queue sous -80 dB est omise. Les sources ne démarrent qu’une fois le graphe entièrement construit : Safari ne cumule plus à chaque nouveau nœud le bruit de sa protection contre le fingerprinting. Sur WebKit, un AudioWorklet capture le signal réel du mixage avant la lecture du tampon hors ligne, qui pouvait encore ajouter du bruit audible ; les réglages de confidentialité du navigateur restent inchangés. Le test `verify-echo-rendering.mjs` contrôle les graphes de jingle par défaut et après modification des curseurs, ainsi que la réponse impulsionnelle.

Vérification dans Safari macOS réel : le petit graphe avec l’ancienne boucle fait planter la page ; le projet de 35 secondes avec sept prises de jingle termine le WAV et le MP3 corrigés. FFprobe confirme 44,1 kHz, stéréo et MP3 192 kbit/s. Chrome vérifie le téléchargement effectif, l’aperçu audio, les données/textes de la sauvegarde, l’affichage mobile, les crédits en dernier et l’absence d’erreur JavaScript. La comparaison des deux MP3 de ce projet donne une corrélation de 99,9 %, avec un niveau RMS presque identique. Safari iOS reste à vérifier sur appareil.

L’application est ouverte à `https://sbtchr.github.io/podcast-facile/`, sans paramètre de version. Ses ressources compilées restent dans `site/`, qui ne contient plus d’autre entrée d’application : `site/index.html` redirige vers la racine. Le workflow reconstruit ce déploiement à chaque publication. Le stockage conserve la même origine, donc les projets locaux restent disponibles.
