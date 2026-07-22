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

La réduction de bruit, la suppression d’écho et le gain automatique pendant l’enregistrement restent fournis par le navigateur. L’amélioration vocale avancée et la normalisation perceptuelle feront l’objet d’un chantier séparé.
