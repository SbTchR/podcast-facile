import { memo, useEffect, useRef, useState } from 'react';
import type { AudioAsset, PodcastBlock, PodcastProject, SectionAudioLayer } from '../types';
import { formatTime, getTimeline } from '../audio/engine';
import { resolveSectionLayers } from '../audio/sectionLayers';
import { assetWaveform, clampTime, roundTime } from '../audio/sectionTimeline';

const Waveform = memo(function Waveform({ asset, from = 0, to = asset?.duration ?? 0, repeat = false, length }: { asset?: AudioAsset; from?: number; to?: number; repeat?: boolean; length?: number }) {
  const [peaks, setPeaks] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false; setPeaks([]);
    if (asset) void assetWaveform(asset).then(values => { if (!cancelled) setPeaks(values); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [asset?.blob]);
  if (!asset || !peaks.length) return null;
  const span = Math.max(0.05, to - from);
  const bars = 120;
  const path = Array.from({ length: bars }, (_, i) => {
    const elapsed = i / bars * (length ?? span);
    const source = from + (repeat ? elapsed % span : Math.min(span, elapsed));
    const peak = peaks[Math.min(peaks.length - 1, Math.floor(source / asset.duration * peaks.length))] ?? 0;
    const height = Math.max(1, peak * 13);
    return `M${i * 3 + 1},${15 - height}v${height * 2}`;
  }).join('');
  return <svg className="track-waveform" viewBox="0 0 360 30" preserveAspectRatio="none" aria-hidden="true"><path d={path} stroke="currentColor" strokeWidth="1.5" /></svg>;
});

export function SectionTimeline({ project, selectedId, selectedVoiceId, phase, playhead, onSeek, onSelect, onSelectVoice, onOpenTrack, onEdit, compact = false }: {
  project: PodcastProject; selectedId?: string; phase?: 'music' | 'sfx'; playhead?: number;
  selectedVoiceId?: string; onSelectVoice?: (block: PodcastBlock) => void; onOpenTrack?: (kind: 'music' | 'sfx') => void;
  onSeek?: (time: number) => void; onSelect?: (layer: SectionAudioLayer) => void;
  onEdit?: (layer: SectionAudioLayer, action: 'move' | 'start' | 'end', time: number) => void; compact?: boolean;
}) {
  const timeline = getTimeline(project);
  const duration = timeline.at(-1)?.end ?? 0;
  const layers = project.sections[0]?.audioLayers ?? [];
  const resolved = resolveSectionLayers(project, timeline);
  const gesture = useRef<{ layer: SectionAudioLayer; action: 'move' | 'start' | 'end'; pointer: number; x: number; at: number; width: number } | null>(null);
  const tickCount = compact ? 4 : 7;
  const position = (start: number, end: number) => ({ left: `${start / Math.max(0.05, duration) * 100}%`, width: `${Math.max(0.15, (end - start) / Math.max(0.05, duration) * 100)}%` });
  const seek = (event: React.MouseEvent<HTMLElement>) => {
    if (!onSeek) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek(clampTime(roundTime((event.clientX - rect.left) / rect.width * duration), 0, Math.max(0, duration - 0.05)));
  };
  const begin = (event: React.PointerEvent<HTMLElement>, layer: SectionAudioLayer, action: 'move' | 'start' | 'end') => {
    const item = resolved.find(candidate => candidate.layer.id === layer.id);
    if (!item || !onEdit || layer.pauseBlockId || (phase && layer.kind !== phase)) return;
    event.stopPropagation(); event.preventDefault();
    onSelect?.(layer); event.currentTarget.setPointerCapture(event.pointerId);
    const rail = event.currentTarget.closest('.track-rail')!;
    gesture.current = { layer, action, pointer: event.pointerId, x: event.clientX, width: rail.getBoundingClientRect().width, at: action === 'end' ? item.end : item.start };
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onEdit?.(current.layer, current.action, current.at + (event.clientX - current.x) / current.width * duration);
  };
  const finish = () => { gesture.current = null; };
  const head = playhead === undefined ? null : <i className="track-playhead" style={{ left: `${Math.min(100, playhead / Math.max(.05, duration) * 100)}%` }} />;
  const legacy = timeline.flatMap(entry => {
    const block = entry.block;
    const pre = block.background?.startBefore ? Math.min(3, Math.max(1, block.background.startBeforeSeconds ?? 2)) : 0;
    const post = block.background?.continueAfter ? Math.min(3, Math.max(1, block.background.continueAfterSeconds ?? 2)) : 0;
    const rate = ((block.trimEnd - block.trimStart) || block.duration) / Math.max(.05, entry.duration - pre - post);
    const items: { id: string; kind: 'music' | 'sfx'; title: string; assetId: string; start: number; end: number; sourceStart: number; sourceEnd: number; repeat?: boolean }[] = [];
    if (block.background) items.push({ id: `legacy-${block.id}`, kind: 'music', title: `Fond · ${block.title}`, assetId: block.background.assetId, start: entry.start, end: entry.end, sourceStart: 0, sourceEnd: project.assets.find(a => a.id === block.background!.assetId)?.duration ?? 0, repeat: true });
    for (const cue of block.voiceCues ?? []) {
      const asset = project.assets.find(item => item.id === cue.assetId);
      if (!asset) continue;
      const start = entry.start + pre + clampTime(cue.at, 0, (block.trimEnd - block.trimStart) || block.duration) / rate;
      const sourceStart = clampTime(cue.sourceStart ?? 0, 0, asset.duration - .05);
      const sourceEnd = clampTime(cue.sourceEnd ?? sourceStart + cue.duration, sourceStart + .05, asset.duration);
      const end = Math.min(entry.end - post, start + sourceEnd - sourceStart);
      if (end > start) items.push({ id: cue.id, kind: 'sfx', title: `Bruitage · ${block.title}`, assetId: cue.assetId, start, end, sourceStart, sourceEnd });
    }
    return items;
  });
  return <div className={`section-timeline ${compact ? 'compact' : ''}`} aria-label={`Trame de ${project.sections[0]?.title ?? 'la partie'}`}>
    <div className="track-row track-ruler"><span className="track-label">Temps</span><div className="track-rail" role={onSeek ? 'slider' : undefined} tabIndex={onSeek ? 0 : undefined} aria-label={onSeek ? 'Repère d’écoute' : undefined} aria-valuemin={onSeek ? 0 : undefined} aria-valuemax={onSeek ? duration : undefined} aria-valuenow={onSeek ? playhead ?? 0 : undefined} aria-valuetext={onSeek ? `${(playhead ?? 0).toFixed(1)} secondes` : undefined} onKeyDown={event => {
      if (!onSeek || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const at = event.key === 'Home' ? 0 : event.key === 'End' ? duration - .1 : (playhead ?? 0) + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : .1);
      onSeek(clampTime(roundTime(at), 0, Math.max(0, duration - .05)));
    }} onClick={event => onOpenTrack ? onOpenTrack('music') : seek(event)}>{Array.from({ length: tickCount + 1 }, (_, index) => <span key={index} style={{ left: `${index / tickCount * 100}%` }}>{formatTime(index / tickCount * duration)}</span>)}{head}</div></div>
    <div className="track-row"><strong className="track-label">Voix</strong><div className="track-rail" onClick={seek}>{timeline.filter(e => e.duration > 0).map(entry => {
      const asset = project.assets.find(item => item.id === entry.block.assetId);
      const voice = entry.block.type === 'voice';
      const background = entry.block.background;
      const pre = voice && background?.startBefore ? Math.min(3, Math.max(1, background.startBeforeSeconds ?? 2)) : 0;
      const post = voice && background?.continueAfter ? Math.min(3, Math.max(1, background.continueAfterSeconds ?? 2)) : 0;
      return <div key={entry.block.id} role={voice && onSelectVoice ? 'button' : undefined} tabIndex={voice && onSelectVoice ? 0 : undefined} aria-label={voice && onSelectVoice ? `Régler la voix : ${entry.block.title}` : undefined} aria-pressed={voice && onSelectVoice ? selectedVoiceId === entry.block.id : undefined} className={`track-clip narrative ${voice ? 'voice' : 'pause'} ${selectedVoiceId === entry.block.id ? 'selected' : ''}`} style={position(entry.start + pre, entry.end - post)} title={entry.block.title} onClick={event => { if (voice && onSelectVoice) { event.stopPropagation(); onSelectVoice(entry.block); } }} onKeyDown={event => { if (voice && onSelectVoice && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelectVoice(entry.block); } }}><strong>{entry.block.type === 'silence' ? 'Pause/Musique seule' : entry.block.title}</strong>{voice && <Waveform asset={asset} from={entry.block.trimStart} to={entry.block.trimEnd || asset?.duration} />}</div>;
    })}{head}</div></div>
    {(['music', 'sfx'] as const).flatMap(kind => {
      const matching = layers.filter(layer => layer.kind === kind);
      if (!matching.length && !legacy.some(layer => layer.kind === kind)) return <div className={`track-row ${phase && phase !== kind ? 'inactive' : ''}`} key={kind}><strong className="track-label">{kind === 'music' ? 'Musique' : 'Sons'}</strong><div className="track-rail empty" onClick={event => onOpenTrack ? onOpenTrack(kind) : seek(event)}>{onOpenTrack ? <button className="track-add" aria-label={kind === 'music' ? 'Ajouter une musique sur la trame' : 'Ajouter une ambiance ou un bruitage sur la trame'} onClick={event => { event.stopPropagation(); onOpenTrack(kind); }}>{kind === 'music' ? '＋ Musique' : '＋ Son'}</button> : <span>{kind === 'music' ? 'Aucune musique de fond' : 'Aucune ambiance ni bruitage'}</span>}{head}</div></div>;
      return matching.map((layer, index) => {
        const item = resolved.find(candidate => candidate.layer.id === layer.id);
        const editable = Boolean(onEdit && !layer.pauseBlockId && (!phase || phase === kind));
        const active = layer.id === selectedId;
        return <div key={layer.id} className={`track-row ${phase && phase !== kind ? 'inactive' : ''}`}><strong className={`track-label ${kind === 'sfx' ? 'track-named' : ''}`}><span>{kind === 'music' ? 'Musique' : layer.soundGroup === 'ambience' ? 'Ambiance' : 'Bruitage'} {matching.length > 1 ? index + 1 : ''}</span>{kind === 'sfx' && <small title={layer.title}>{layer.title}</small>}</strong><div className="track-rail" onClick={event => onOpenTrack ? onOpenTrack(kind) : seek(event)}>
          {item ? <div role="button" tabIndex={0} aria-label={`${layer.title} · ${item.start.toFixed(1)} à ${item.end.toFixed(1)} secondes`} aria-pressed={active} className={`track-clip ${kind} ${layer.soundGroup === 'ambience' ? 'ambience' : ''} ${active ? 'selected' : ''} ${editable ? 'editable' : ''}`} style={position(item.start, item.end)} title={`${layer.title} · ${item.start.toFixed(1)}–${item.end.toFixed(1)} s`}
            onClick={event => { event.stopPropagation(); onSelect?.(layer); }} onPointerDown={event => begin(event, layer, 'move')} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(layer); } if (editable && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); onEdit?.(layer, 'move', item.start + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : .1)); } }}>
            <strong>{layer.title}</strong><Waveform asset={project.assets.find(asset => asset.id === layer.assetId)} from={item.sourceStart} to={item.sourceEnd} repeat={layer.repeat} length={item.end - item.start} />
            {active && editable && (['start', 'end'] as const).map(edge => <span key={edge} className={`track-handle ${edge}`} role="slider" tabIndex={0} aria-label={`${edge === 'start' ? 'Début' : 'Fin'} de ${layer.title}`} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={edge === 'start' ? item.start : item.end} aria-valuetext={`${(edge === 'start' ? item.start : item.end).toFixed(1)} secondes`} onPointerDown={event => begin(event, layer, edge)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
              onKeyDown={event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.stopPropagation(); event.preventDefault(); onEdit?.(layer, edge, event.key === 'Home' ? 0 : event.key === 'End' ? duration : (edge === 'start' ? item.start : item.end) + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : .1)); }} />)}
          </div> : <button className="track-unplaced" onClick={() => onSelect?.(layer)}>À replacer · {layer.title}</button>}{head}</div></div>;
      });
    })}
    {legacy.map(layer => <div className="track-row legacy" key={layer.id}><strong className="track-label">{layer.kind === 'music' ? 'Fond lié' : 'Son lié'}</strong><div className="track-rail" onClick={() => { const voice = timeline.find(entry => entry.block.background?.assetId === layer.assetId || entry.block.voiceCues?.some(cue => cue.id === layer.id)); if (voice) onSelectVoice?.(voice.block); }}><div className={`track-clip ${layer.kind}`} style={position(layer.start, layer.end)} title={layer.title}><strong>{layer.title}</strong><Waveform asset={project.assets.find(a => a.id === layer.assetId)} from={layer.sourceStart} to={layer.sourceEnd} repeat={layer.repeat} length={layer.end - layer.start} /></div>{head}</div></div>)}
  </div>;
}
