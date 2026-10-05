import { useEffect, useRef, useState } from 'react';
import type { AudioAsset } from '../types';
import { LocalTranscriber, transcriptionSamples, type TranscriptLanguage, type TranscriptionProgress } from '../audio/transcription';
import { TRANSCRIPTION_MODEL } from '../audio/transcriptionModels';

export function VoiceScript({ value, onChange, asset, start, end, disabled, onBusyChange }: {
  value: string; onChange: (text: string) => void; asset?: AudioAsset; start?: number; end?: number; disabled?: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const [language, setLanguage] = useState<TranscriptLanguage>('fr');
  const [progress, setProgress] = useState<TranscriptionProgress>();
  const [proposal, setProposal] = useState('');
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const service = useRef<LocalTranscriber | undefined>(undefined);
  const request = useRef(0);
  const currentText = useRef(value); currentText.current = value;
  useEffect(() => {
    request.current++; service.current?.cancel(); setProgress(undefined); setProposal(''); setError(''); setFinished(false); onBusyChange(false);
    return () => { request.current++; service.current?.dispose(); };
  }, [asset?.id, onBusyChange]);

  const transcribe = async () => {
    if (!asset) return;
    const token = ++request.current;
    setError(''); setFinished(false); setProposal(''); setProgress({ stage: 'loading' }); onBusyChange(true);
    try {
      const samples = await transcriptionSamples(asset.blob, start, end);
      if (token !== request.current) return;
      service.current ??= new LocalTranscriber();
      const result = await service.current.transcribe(samples, language, next => { if (token === request.current) setProgress(next); });
      if (token !== request.current) return;
      // A late result never replaces a text the pupil already wrote or corrected.
      if (!currentText.current.trim()) onChange(result.text);
      else setProposal(result.text);
      setFinished(true);
    } catch (reason) {
      if (token === request.current && !(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Impossible de transcrire cet essai.');
    } finally { if (token === request.current) { setProgress(undefined); onBusyChange(false); } }
  };
  const cancel = () => { request.current++; service.current?.cancel(); setProgress(undefined); onBusyChange(false); };

  return <div className="voice-script">
    <label className="field"><span>Texte à lire <small>facultatif</small></span><textarea rows={5} value={value} onChange={event => onChange(event.target.value)} placeholder="Écris ton texte ici, ou transcris un premier essai enregistré depuis ta feuille." /></label>
    {asset && <details className="transcript-options"><summary>Transcription automatique <small>facultatif</small></summary><div className="transcript-actions"><button className="secondary-button compact" disabled={disabled || Boolean(progress)} onClick={() => void transcribe()}>Transcrire cet essai</button><label>Langue <select aria-label="Langue de la transcription" disabled={Boolean(progress) || disabled} value={language} onChange={event => setLanguage(event.target.value as TranscriptLanguage)}><option value="fr">Français</option><option value="de">Allemand</option><option value="en">Anglais</option></select></label>{progress && <button className="ghost-button compact" onClick={cancel}>Annuler la transcription</button>}</div><p className="voice-script-note">Premier usage : téléchargement d’environ {TRANSCRIPTION_MODEL.megabytes} Mo, puis réutilisation depuis le cache.</p></details>}

    {progress && <div className="transcript-progress" role="status">{progress.stage === 'loading' ? `Préparation de la transcription${progress.percent === undefined ? '…' : ` · ${progress.percent}%`}` : 'Transcription de ton essai…'}<progress aria-label="Progression de la transcription" max={100} value={progress.stage === 'loading' ? progress.percent : undefined} /></div>}
    {proposal && <div className="transcript-proposal"><label className="field"><span>Texte reconnu dans cet essai</span><textarea rows={4} value={proposal} onChange={event => setProposal(event.target.value)} /></label><button className="secondary-button compact" onClick={() => { onChange(proposal); setProposal(''); }}>Utiliser ce texte à la place</button></div>}
    {finished && !progress && <p className="transcript-result" role="status">Relis le texte, corrige-le, puis enregistre une nouvelle prise. Le texte reste conservé.</p>}
    {error && <p className="error-box" role="alert">{error}</p>}
  </div>;
}
