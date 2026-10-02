import type { PodcastBlock, VoiceEffect, VoiceEnhancement, VolumeLevel } from '../types';

const effects: [VoiceEffect, string][] = [['none', 'Aucun effet'], ['phone', 'Téléphone'], ['echo', 'Rêve'], ['distant', 'Caverne'], ['deep', 'Voix grave'], ['high', 'Voix aiguë'], ['very-high', 'Voix très aiguë']];
const enhancements: [VoiceEnhancement, string][] = [['natural', 'Naturelle'], ['magic-boost', 'Voix améliorée']];
const levels: [VolumeLevel, string][] = [['low', 'Plus faible'], ['normal', 'Normal'], ['high', 'Plus fort']];

export function VoiceSettings({ block, onChange }: { block: PodcastBlock; onChange: (values: Partial<PodcastBlock>) => void }) {
  return <div className="sound-inspector voice-inspector">
    <h4>{block.title}</h4>
    <div className="voice-setting-row"><span>Clarté</span><div className="option-grid compact-options">{enhancements.map(([value, label]) => <button key={value} aria-pressed={(block.voiceEnhancement ?? 'magic-boost') === value} className={(block.voiceEnhancement ?? 'magic-boost') === value ? 'selected' : ''} onClick={() => onChange({ voiceEnhancement: value })}>{label}</button>)}</div></div>
    <div className="voice-setting-row"><span>Volume</span><div className="option-grid compact-options">{levels.map(([value, label]) => <button key={value} aria-pressed={block.volume === value} className={block.volume === value ? 'selected' : ''} onClick={() => onChange({ volume: value })}>{label}</button>)}</div></div>
    <details className="optional-settings"><summary>Transformer la voix <small>facultatif</small></summary><div className="option-grid compact-options">{effects.map(([value, label]) => <button key={value} aria-pressed={block.voiceEffect === value} className={block.voiceEffect === value ? 'selected' : ''} onClick={() => onChange({ voiceEffect: value })}>{label}</button>)}</div></details>
    <details className="optional-settings"><summary>Fondus de la voix <small>facultatif</small></summary><div className="settings-columns">{(['fadeIn', 'fadeOut'] as const).map(key => <label key={key} className="field"><span>{key === 'fadeIn' ? 'Début' : 'Fin'}</span><select value={block[key]} onChange={event => onChange({ [key]: event.target.value })}><option value="none">Direct</option><option value="short">Fondu court</option><option value="normal">Fondu doux</option></select></label>)}</div></details>
  </div>;
}
