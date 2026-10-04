#!/usr/bin/env python3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'src' / 'App.tsx').read_text(encoding='utf-8')
engine = (ROOT / 'src' / 'audio' / 'engine.ts').read_text(encoding='utf-8')
types = (ROOT / 'src' / 'types.ts').read_text(encoding='utf-8')

jingle = (ROOT / 'src' / 'components' / 'JingleWizard.tsx').read_text(encoding='utf-8')
voice_settings = (ROOT / 'src' / 'components' / 'VoiceSettings.tsx').read_text(encoding='utf-8')

checks = {
    'type Magic Boost': "export type VoiceEnhancement = 'natural' | 'magic-boost';" in types,
    'bloc vocal réglable': 'voiceEnhancement?: VoiceEnhancement;' in types,
    'jingle vocal réglable': types.count('voiceEnhancement?: VoiceEnhancement;') == 2,
    'durées de jingle': 'musicLeadSeconds?: 1 | 2 | 3 | 4;' in types and 'musicTailSeconds?: 1 | 2 | 3 | 4;' in types,
    'contrôle Magic Boost sur la trame': 'Clarté' in voice_settings and 'magic-boost' in voice_settings and 'voiceEnhancementLabels' not in app,
    'parcours vocal guidé': "['Style', 'Titre 1', 'Intro', 'Titre 2', 'Accroche', 'Écouter']" in jingle,
    'départ musical réservé': 'De 3 à 5 secondes de musique' in jingle,
    'fin musicale réservée': 'au début et à la fin' in jingle,
    'valeurs par défaut': "production: 'guided-v8'" in app and "getJingleBed('modern-radio', undefined, 'extended').id" in app,
    'égalisation de la voix': 'warmth.frequency.value = 160;' in engine and 'presence.frequency.value = 2800;' in engine,
    'compression de la voix': 'compressor.threshold.value = -20;' in engine and 'compressor.ratio.value = 3;' in engine,
    'limiteur de la voix': 'limiter.threshold.value = -1.2;' in engine and 'limiter.ratio.value = 20;' in engine,
    'routage uniquement vocal': "block.voiceEnhancement ?? 'magic-boost'" in engine and "block.jingle?.voiceEnhancement ?? 'magic-boost'" in engine,
    'limiteur de sécurité global': 'createMasterSafetyLimiter' in engine,
    'ancien compresseur global retiré': 'compressor.threshold.value = -8;' not in engine,
    'durée jingle calculée': 'jingleLeadIn(block) + voice.duration + Math.max(jingleTail(block), closingTail)' in engine,
    'lecture jingle réglable': 'const leadIn = jingleLeadIn(block);' in engine and 'const tail = jingleTail(block);' in engine,
}

failed = [label for label, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Vérifications échouées: ' + ', '.join(failed))

print('Traitement Magic Boost vocal et minutage des jingles vérifiés.')
