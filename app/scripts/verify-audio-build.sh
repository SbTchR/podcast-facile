#!/usr/bin/env bash
set -euo pipefail

test -s app/dist/index.html
test -s app/dist/audio-credits.html
test -s app/dist/audio-diagnostics.html
test -n "$(find app/dist/assets -maxdepth 1 -name '*.js' -print -quit)"
test -n "$(find app/dist/assets -maxdepth 1 -name '*.css' -print -quit)"
if grep -q "DecompressionStream\|pako\.ungzip\|\.js\.gz\|structuredClone(" app/dist/index.html app/dist/assets/index-*.js; then
  echo "Le code principal contient une ancienne dépendance de sérialisation." >&2
  exit 1
fi
grep -q '<script type="module"' app/dist/index.html
grep -q "createMediaStreamDestination" app/dist/assets/*.js
grep -q "play-and-record" app/dist/assets/*.js
grep -q "arraybuffer-v2" app/dist/assets/*.js
grep -q "audioBytes" app/dist/assets/*.js
grep -q "Ajouter un bruitage ici" app/dist/assets/*.js
grep -q "voiceCues" app/dist/assets/*.js
grep -q "Jingle d’intro" app/dist/assets/*.js
grep -q "Chocs, impacts, transitions" app/dist/assets/*.js
grep -q "Voix très aiguë" app/dist/assets/*.js
grep -q "Caverne" app/dist/assets/*.js
grep -q "Plage du fichier" app/dist/assets/*.js
grep -q "Volume de la transition" app/dist/assets/*.js
grep -q "music-chase-action" app/dist/assets/*.js
grep -q "music-acoustic-blues" app/dist/assets/*.js
grep -q "music-smooth-jazz-night" app/dist/assets/*.js
grep -q "music-hoedown" app/dist/assets/*.js
grep -q "music-pyramids" app/dist/assets/*.js
grep -q "Jazz, blues & groove" app/dist/assets/*.js
grep -q "Folk, country & banjo" app/dist/assets/*.js
grep -q "Joyeux & léger" app/dist/assets/*.js
! grep -q "music-a-chantar\|music-janequin-la-guerre\|music-monteverdi-battle\|music-o-frondens\|music-santa-maria" app/dist/assets/*.js
grep -q "sfx-medieval-battle-ambience" app/dist/assets/*.js
grep -q "Enregistrer mon propre bruitage" app/dist/assets/*.js
grep -q "Commencer avant la voix" app/dist/assets/*.js
grep -Eq "low.{0,24}\\.08.{0,24}high.{0,24}1\\.05.{0,24}\\.28" app/dist/assets/*.js
grep -q "Enregistrements réels" app/dist/assets/*.js
grep -q "Chargement…" app/dist/assets/*.js
grep -q "Coups à la porte" app/dist/assets/*.js
grep -q "Pop vocal" app/dist/assets/*.js
grep -q "Volume de la musique" app/dist/assets/*.js
grep -q "0 % = muet" app/dist/assets/*.js
grep -q "music-volume-slider" app/dist/assets/*.js app/dist/assets/*.css
grep -q "guided-v3" app/dist/assets/*.js
grep -q "Voix améliorée" app/dist/assets/*.js
grep -q "Transcrire cet essai" app/dist/assets/*.js
grep -q "guided-v5" app/dist/assets/*.js
test -n "$(find app/dist/assets -maxdepth 1 -name 'transcription.worker-*.js' -print -quit)"
test -n "$(find app/dist/assets -maxdepth 1 -name 'ort-wasm-*.wasm' -print -quit)"
test -s app/dist/licenses/transcription-notices.txt
grep -q "Une musique pour ton jingle" app/dist/assets/*.js
grep -q "Présentation" app/dist/assets/*.js
grep -q "Accroche" app/dist/assets/*.js

for id in \
  sfx-horse-gallop-pavement \
  music-medieval-story \
  sfx-sword-fight-real \
  sfx-male-scream-fear \
  sfx-cutting-beet-greens \
  sfx-gunshots-simulated \
  sfx-cannon-reveille \
  sfx-large-crowd-cheering \
  sfx-provence-market \
  sfx-fireworks-detonations \
  sfx-rotary-printing-press-1926 \
  sfx-military-drumbeat \
  sfx-1960s-factory-civil-defense-siren \
  sfx-19th-century-fire-brigade-bell; do
  grep -q "$id" app/dist/assets/*.js
done

for category in \
  "Guerres & combats" \
  "Sociétés & lieux historiques" \
  "Nature & paysages" \
  "Transports & industrie" \
  "Voix & foule" \
  "Époques historiques"; do
  grep -q "$category" app/dist/assets/*.js
done

grep -q "Les sons de la bibliothèque proviennent de sources libres ou sous licence" app/dist/assets/*.js
! grep -q "Les sons intégrés sont produits directement par l’application" app/dist/assets/*.js
grep -q "library-footer-note" app/dist/assets/*.js app/dist/assets/*.css
grep -q "library-source-link" app/dist/assets/*.js app/dist/assets/*.css
! grep -q "library-info\|library-credit" app/dist/assets/*.js
! grep -q "generated:\|synthesizeGeneratedEffect\|loadGeneratedAudio\|Créé dans l’application\|disponible hors ligne" app/dist/assets/*.js
! grep -q "Chocs métalliques / épées" app/dist/assets/*.js


for style in dynamic adventure historical mysterious serious modern-radio; do
  test -s "app/dist/audio/jingles/$style.mp3"
  test -s "app/dist/audio/jingles/$style-25.mp3"
  test -s "app/dist/audio/jingles/$style-35.mp3"
done

for style in dynamic adventure historical mysterious serious; do
  test -s "app/dist/audio/jingles/$style-pixabay-25.mp3"
  test -s "app/dist/audio/jingles/$style-pixabay-35.mp3"
done
grep -q "Pixabay Content License" app/dist/assets/*.js
grep -q "Hurry Funk Intro" app/dist/assets/*.js
grep -q "passer à 35 secondes" app/dist/assets/*.js

for ending in bell horn ship drumroll bicycle doorbell; do
  test -s "app/dist/audio/jingle-endings/$ending.wav"
done
grep -q "Ambiances et bruitages →" app/dist/assets/*.js
grep -q "jingle-ending-drumroll" app/dist/assets/*.js
node --input-type=module - <<'JS'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
for (const folder of ['curated-sounds', 'jingle-endings', 'podcast-music']) {
  const sources = JSON.parse(readFileSync(`app/public/audio/${folder}/sources.json`, 'utf8'));
  for (const source of sources) {
    const file = readFileSync(`app/dist/audio/${folder}/${source.filename}`);
    if (createHash('sha256').update(file).digest('hex') !== source.sha256) throw new Error(`Missing or changed published sound: ${source.id}`);
  }
}
JS
echo "Build audio vérifié."
