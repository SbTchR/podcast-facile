import { useEffect, useRef, useState } from 'react';
import type { AudioAsset } from '../types';

/** One real waveform, one selected region. Pointer and keyboard handles share bounds. */
export function AudioExcerpt({ asset, start, end, onChange, compact = false }: { asset: AudioAsset; start: number; end: number; onChange: (start: number, end: number) => void; compact?: boolean }) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [position, setPosition] = useState(start);
  const [playing, setPlaying] = useState(false);
  const playMode = useRef<'excerpt' | 'file'>('excerpt');
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const previewId = useRef(`excerpt-${crypto.randomUUID()}`);
  const latest = useRef({ start, end });
  latest.current = { start, end };
  const duration = Math.max(0.05, asset.duration);
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const stop = () => { audioRef.current?.pause(); setPlaying(false); };
  useEffect(() => {
    let cancelled = false;
    const objectUrl = URL.createObjectURL(asset.blob);
    setUrl(objectUrl); setPeaks([]); setError('');
    const context = new AudioContext();
    void asset.blob.arrayBuffer().then((bytes) => context.decodeAudioData(bytes)).then((buffer) => {
      const data = buffer.getChannelData(0);
      const bars = 160;
      const stride = Math.max(1, Math.floor(data.length / bars));
      const values = Array.from({ length: bars }, (_, bar) => {
        let peak = 0;
        const begin = bar * stride;
        for (let i = begin; i < Math.min(data.length, begin + stride); i += Math.max(1, Math.floor(stride / 100))) peak = Math.max(peak, Math.abs(data[i]));
        return peak;
      });
      const max = Math.max(0.01, ...values);
      if (!cancelled) setPeaks(values.map((value) => value / max));
    }).catch(() => { if (!cancelled) setError('La forme d’onde est indisponible. Tu peux choisir les temps ci-dessous.'); }).finally(() => { void context.close(); });
    const audio = audioRef.current;
    return () => { cancelled = true; audio?.pause(); audio?.removeAttribute('src'); audio?.load(); URL.revokeObjectURL(objectUrl); };
  }, [asset.blob]);
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = start; }
    setPosition(start); setPlaying(false);
  }, [start, end]);
  useEffect(() => {
    const listener = (event: Event) => { if ((event as CustomEvent<string>).detail !== previewId.current) { audioRef.current?.pause(); setPlaying(false); } };
    window.addEventListener('podcast-facile-stop-preview', listener);
    return () => window.removeEventListener('podcast-facile-stop-preview', listener);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio && audio.currentTime >= (playMode.current === 'file' ? duration : latest.current.end)) { audio.pause(); setPlaying(false); }
    }, 25);
    return () => window.clearInterval(timer);
  }, [playing, duration]);
  const setBoundary = (edge: 'start' | 'end', value: number) => {
    const current = latest.current;
    onChange(edge === 'start' ? clamp(value, 0, current.end - 0.05) : current.start, edge === 'end' ? clamp(value, current.start + 0.05, duration) : current.end);
  };
  const atPointer = (clientX: number) => { const rect = waveRef.current!.getBoundingClientRect(); return clamp((clientX - rect.left) / rect.width * duration, 0, duration); };
  const toggle = async (from = start, wholeFile = false) => {
    playMode.current = wholeFile ? 'file' : 'excerpt';
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { stop(); return; }
    window.dispatchEvent(new CustomEvent('podcast-facile-stop-preview', { detail: previewId.current }));
    audio.currentTime = from;
    try { await audio.play(); setPlaying(true); setError(''); } catch { setError('Impossible de lire cet extrait. Vérifie le format du fichier.'); }
  };
  return <div className={`excerpt-editor ${compact ? 'compact' : ''}`}>
    <div className="setting-title-row"><strong>{asset.name}</strong><button className="ghost-button compact" onClick={() => onChange(0, duration)}>Tout garder</button></div>
    {!compact && <p>Déplace les deux poignées pour encadrer l’extrait à garder. Clique sur l’onde pour placer un repère, puis écoute depuis ce repère.</p>}
    <div ref={waveRef} className="excerpt-wave" onClick={(event) => { if ((event.target as HTMLElement).closest('[role="slider"]')) return; stop(); const at = atPointer(event.clientX); setPosition(at); if (audioRef.current) audioRef.current.currentTime = at; }}>
      {peaks.length > 0 ? <svg viewBox="0 0 640 100" preserveAspectRatio="none" aria-hidden="true">{peaks.map((peak, index) => <rect key={index} x={index * 4} y={50 - Math.max(2, peak * 42)} width="2.5" height={Math.max(4, peak * 84)} fill={index / peaks.length * duration >= start && index / peaks.length * duration <= end ? '#2365dc' : '#bac5d7'} />)}</svg> : <div className="wave-loading">{error ? 'Sélection par les temps' : 'Préparation de la forme d’onde…'}</div>}
      <div className="excerpt-selection" style={{ left: `${start / duration * 100}%`, width: `${(end - start) / duration * 100}%` }} />
      <div className="excerpt-playhead" style={{ left: `${position / duration * 100}%` }} />
      {(['start', 'end'] as const).map((edge) => <div key={edge} className={`excerpt-handle ${edge}`} role="slider" tabIndex={0} aria-label={edge === 'start' ? 'Début de l’extrait' : 'Fin de l’extrait'} aria-valuemin={edge === 'start' ? 0 : start + 0.05} aria-valuemax={edge === 'start' ? end - 0.05 : duration} aria-valuenow={edge === 'start' ? start : end} aria-valuetext={`${(edge === 'start' ? start : end).toFixed(1)} secondes`} style={{ left: `${(edge === 'start' ? start : end) / duration * 100}%` }}
        onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); stop(); }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setBoundary(edge, atPointer(event.clientX)); }}
        onKeyDown={(event) => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const value = edge === 'start' ? start : end; setBoundary(edge, event.key === 'Home' ? 0 : event.key === 'End' ? duration : value + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : 0.1)); }}><span>{edge === 'start' ? 'Début' : 'Fin'}</span></div>)}
    </div>
    <audio ref={audioRef} src={url || undefined} preload="auto" playsInline onEnded={() => setPlaying(false)} onTimeUpdate={(event) => { setPosition(event.currentTarget.currentTime); if (playing && event.currentTarget.currentTime >= (playMode.current === 'file' ? duration : latest.current.end)) stop(); }} />
    <div className="excerpt-play-row"><button className="secondary-button" onClick={() => void toggle()}>{playing ? 'Ⅱ Arrêter' : '▶ Écouter l’extrait'}</button><strong>{(end - start).toFixed(1)} s gardées</strong></div><button className="ghost-button compact" onClick={() => void toggle(position, true)}>▶ Écouter depuis le repère · {position.toFixed(1)} s</button>
    <details className={`excerpt-precise ${compact ? '' : 'expanded'}`} open={!compact}><summary>Temps précis de l’extrait</summary><div className="excerpt-times">{(['start','end'] as const).map((edge) => <label className="field" key={edge}><span>{edge === 'start' ? 'Début' : 'Fin'} dans le fichier (s)</span><input aria-label={edge === 'start' ? 'Début (secondes)' : 'Fin (secondes)'} type="number" min={edge === 'start' ? 0 : start + 0.05} max={edge === 'start' ? end - 0.05 : duration} step="0.1" value={Number((edge === 'start' ? start : end).toFixed(2))} onChange={(event) => setBoundary(edge, Number(event.target.value))} />{!compact && <button className="ghost-button compact" onClick={() => setBoundary(edge, position)}>{edge === 'start' ? 'Commencer ici' : 'Finir ici'} · {position.toFixed(1)} s</button>}</label>)}</div></details>
    {error && <p role="status">{error}</p>}
  </div>;
}
