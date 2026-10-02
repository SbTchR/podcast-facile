import { useCallback, useEffect, useRef, useState } from 'react';
import type { PodcastProject } from '../types';
import { getProjectDuration, playProject } from '../audio/engine';
import type { PreviewSession } from '../audio/libraryPreview';

export function useSectionPlayback(project: PodcastProject) {
  const [position, setPosition] = useState(0);
  const [status, setStatus] = useState<'stopped' | 'loading' | 'playing'>('stopped');
  const [error, setError] = useState('');
  const live = useRef(project); live.current = project;
  const session = useRef<PreviewSession | null>(null);
  const request = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const owner = useRef(`section-editor-${crypto.randomUUID()}`);
  const stop = useCallback(() => {
    request.current++;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = undefined;
    const playing = session.current; session.current = null;
    if (playing) { setPosition(playing.getElapsed()); void Promise.resolve(playing.stop()).catch(() => undefined); }
    setStatus('stopped');
  }, []);
  useEffect(() => {
    const listener = (event: Event) => { if ((event as CustomEvent).detail !== owner.current) stop(); };
    window.addEventListener('podcast-facile-stop-preview', listener);
    return () => { window.removeEventListener('podcast-facile-stop-preview', listener); stop(); };
  }, [stop]);
  const seek = (at: number) => { stop(); setPosition(at); };
  const toggle = async () => {
    if (status !== 'stopped') { stop(); return; }
    window.dispatchEvent(new CustomEvent('podcast-facile-stop-preview', { detail: owner.current }));
    const token = ++request.current;
    setError(''); setStatus('loading');
    try {
      const duration = getProjectDuration(live.current);
      const playing = await playProject(live.current, position >= duration - .05 ? 0 : Math.max(0, position));
      if (token !== request.current) { await playing.stop(); return; }
      session.current = playing; setStatus('playing');
      timer.current = window.setInterval(() => {
        const now = playing.getElapsed(); setPosition(now);
        if (now >= playing.totalDuration - .04) { stop(); setPosition(0); }
      }, 60);
    } catch (reason) { if (token === request.current) { setStatus('stopped'); setError(reason instanceof Error ? reason.message : 'Impossible de lire cette partie.'); } }
  };
  return { position, status, error, stop, seek, toggle };
}
