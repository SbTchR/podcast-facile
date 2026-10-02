import { useEffect, useRef, useState, type ComponentType, type Dispatch, type SetStateAction } from 'react';
import type { AudioAsset, JingleVoicePart, PodcastBlock } from '../types';
import { JINGLE_STYLES, getJingleBed, getJingleVariants, loadJingleBed } from '../data/jingleBeds';
import { JINGLE_ENDINGS, JINGLE_CREDIT_ENDINGS, endingPreviewPreset, type JingleEnding } from '../data/jingleEndings';
import { loadLibraryAudio } from '../data/audioLibrary';
import { createLibraryPreviewSession } from '../audio/libraryPreview';
import { analyseJingleRecording, getGuidedJinglePlan, JINGLE_PARTS, JINGLE_LEAD, JINGLE_TAIL } from '../audio/jinglePlan';
import type { PreviewSession } from '../audio/libraryPreview';
import { WizardSteps } from './WizardSteps';
import type { RegisterAsset, WizardUI } from './SectionSoundWizard';

const PART_LABELS: Record<JingleVoicePart, string> = { title: 'Titre · intonation 1', 'title-alt': 'Titre · intonation 2', intro: 'Présentation', hook: 'Accroche' };
const seconds = (value: number) => `${value.toFixed(1).replace('.', ',')} s`;
const stopPreviews = () => window.dispatchEvent(new CustomEvent('podcast-facile-stop-preview', { detail: 'jingle-step' }));

function TakePlayer({ asset, start = 0, end = asset.duration, label }: { asset: AudioAsset; start?: number; end?: number; label: string }) {
  const [url, setUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewId = `jingle-asset-${asset.id}`;
  useEffect(() => {
    const src = URL.createObjectURL(asset.blob);
    const audio = audioRef.current;
    setUrl(src);
    return () => {
      audio?.pause();
      // Cancel any pending media request before releasing its object URL.
      audio?.removeAttribute('src');
      audio?.load();
      URL.revokeObjectURL(src);
    };
  }, [asset.blob]);
  useEffect(() => {
    const stop = (event: Event) => { if ((event as CustomEvent).detail !== previewId) audioRef.current?.pause(); };
    window.addEventListener('podcast-facile-stop-preview', stop);
    return () => window.removeEventListener('podcast-facile-stop-preview', stop);
  }, [previewId]);
  return <audio ref={audioRef} className="jingle-take-audio" controls preload="metadata" aria-label={label} src={url || undefined} onLoadedMetadata={(event) => { event.currentTarget.currentTime = start; }} onPlay={(event) => { const audio = event.currentTarget; if (audio.currentTime < start || audio.currentTime >= end) audio.currentTime = start; window.dispatchEvent(new CustomEvent('podcast-facile-stop-preview', { detail: previewId })); }} onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= end) event.currentTarget.pause(); }} />;
}

export function JingleWizard({ block, assets, podcastTitle, onBlock, onRegisterAsset, onPreview, onSave, onClose, isNew, FilePicker, Preview, Recorder }: {
  block: PodcastBlock; assets: AudioAsset[]; podcastTitle: string; onBlock: Dispatch<SetStateAction<PodcastBlock>>;
  onRegisterAsset: RegisterAsset; onPreview: (block: PodcastBlock) => Promise<PreviewSession>; onSave: (block: PodcastBlock) => void; onClose: () => void; isNew: boolean;
  FilePicker: WizardUI['FilePicker']; Preview: WizardUI['Preview']; Recorder: ComponentType<{ onReady: (blob: Blob, duration: number) => Promise<void> | void; onBusyChange?: (busy: boolean) => void; maxSeconds?: number }>;
}) {
  const [step, setStep] = useState(0);
  const [titleVersion, setTitleVersion] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [loadingBed, setLoadingBed] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [bedError, setBedError] = useState('');
  const wizardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wizardRef.current?.closest('.modal')?.scrollTo({ top: 0 });
    wizardRef.current?.querySelector<HTMLHeadingElement>('.wizard-body h3')?.focus({ preventScroll: true });
  }, [step]);
  const originalLegacy = useRef(!block.jingle?.production?.startsWith('guided-') && Boolean(block.jingle?.voiceAssetId));
  const upgrading = useRef(block.jingle?.production === 'guided-v3');
  const live = useRef({ assets, onBlock, onRegisterAsset });
  live.current = { assets, onBlock, onRegisterAsset };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const jingle = block.jingle ?? { style: 'modern-radio' as const, musicLevel: 'low' as const };
  const bed = getJingleBed(jingle.style, jingle.bedId);
  const variants = getJingleVariants(jingle.style);
  const music = assets.find((asset) => asset.id === jingle.musicAssetId && asset.libraryId === bed.id);
  const plan = getGuidedJinglePlan(block, assets, bed.duration);
  const activePart: JingleVoicePart | undefined = step === 1 ? titleVersion === 1 ? 'title' : 'title-alt' : step === 2 ? 'intro' : step === 3 ? 'hook' : undefined;
  const defaults: Record<JingleVoicePart, string> = { title: podcastTitle, 'title-alt': podcastTitle, intro: 'Le podcast qui vous fait découvrir le monde.', hook: 'Épisode 1 : les aventures de Christophe Colomb.' };
  const update = (values: Partial<NonNullable<PodcastBlock['jingle']>>) => onBlock((current) => ({ ...current, jingle: { style: bed.style, musicLevel: 'low', ...current.jingle, production: 'guided-v6', ...values } }));

  useEffect(() => {
    let cancelled = false;
    setLoadingBed(true); setBedError('');
    void (async () => {
      try {
        const existing = live.current.assets.find((asset) => asset.libraryId === bed.id);
        const blob = existing ? undefined : await loadJingleBed(bed);
        if (cancelled) return;
        const asset = existing ?? await live.current.onRegisterAsset(blob!, bed.title, 'audio/mpeg', undefined, { source: 'library', libraryId: bed.id });
        if (cancelled) return;
        live.current.onBlock((current) => ({ ...current, jingle: { style: bed.style, musicLevel: 'low', ...current.jingle, production: 'guided-v6', bedId: bed.id, musicAssetId: asset.id, signatureFx: false } }));
      } catch (reason) { if (!cancelled) setBedError(reason instanceof Error ? reason.message : 'La musique ne se charge pas.'); }
      finally { if (!cancelled) setLoadingBed(false); }
    })();
    return () => { cancelled = true; };
  }, [bed.id, retry]);

  const extendJingle = () => {
    stopPreviews(); setError('');
    const longer = variants.find(item => item.variant === 'extended');
    if (longer) update({ bedId: longer.id, musicAssetId: undefined });
  };
  const moreTime = bed.variant === 'standard' ? <button className="secondary-button compact" disabled={busy || loadingBed} onClick={extendJingle}>Plus de temps : passer à 35 secondes</button> : null;
  const moveStep = (next: number) => { stopPreviews(); setError(''); setStep(next); };
  const keepTake = async (part: JingleVoicePart, blob: Blob, source: 'recording' | 'import') => {
    setError('');
    const analysis = await analyseJingleRecording(blob);
    const spokenDuration = analysis.sourceEnd - analysis.sourceStart;
    const maximum = plan.limits[part];
    if (spokenDuration > maximum + 0.025) throw new Error(`Cette phrase dure ${seconds(spokenDuration)}. Tu as ${seconds(maximum)} : raccourcis la phrase et réenregistre-la${bed.variant === 'standard' ? ', ou passe à 35 secondes' : ''}.`);
    if (spokenDuration < 0.15) throw new Error('Cette prise est trop courte. Prononce ta phrase puis termine l’enregistrement.');
    if (!mounted.current) return;
    const asset = await onRegisterAsset(blob, `${PART_LABELS[part]} du jingle`, blob.type, analysis.duration, { source });
    if (!mounted.current) return;
    onBlock((current) => ({ ...current, jingle: { style: bed.style, musicLevel: 'low', ...current.jingle, production: 'guided-v6', takes: { ...current.jingle?.takes, [part]: { assetId: asset.id, sourceStart: analysis.sourceStart, sourceEnd: analysis.sourceEnd } } } }));
  };
  const importTake = async (part: JingleVoicePart, file: File) => {
    stopPreviews(); setBusy(true);
    try { await keepTake(part, file, 'import'); } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Impossible de lire cette voix.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  const takeValid = (part: JingleVoicePart) => plan.durations[part] >= 0.15 && (plan.complete ? plan.fits : plan.durations[part] <= plan.limits[part] + 0.025);
  const earlierReady = !activePart || JINGLE_PARTS.slice(0, JINGLE_PARTS.indexOf(activePart)).every(takeValid);
  const canContinue = Boolean(music) && !loadingBed && !busy && (!activePart || (takeValid(activePart) && earlierReady));
  const ending = JINGLE_CREDIT_ENDINGS.find(item => item.id === jingle.ending?.presetId);
  const chooseEnding = async (item: JingleEnding) => {
    stopPreviews(); setBusy(true); setError('');
    try {
      const existing = assets.find(asset => asset.libraryId === item.id);
      const asset = existing ?? await onRegisterAsset(await loadLibraryAudio(endingPreviewPreset(item)), item.title, 'audio/wav', undefined, { source: 'library', libraryId: item.id });
      if (mounted.current) update({ ending: { assetId: asset.id, presetId: item.id, volume: jingle.ending?.volume ?? 65 } });
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Impossible de préparer ce bruitage.'); }
    finally { if (mounted.current) setBusy(false); }
  };

  return <div className="jingle-wizard" ref={wizardRef}>
    <WizardSteps labels={['Style', 'Titre', 'Intro', 'Accroche', 'Écouter']} step={step} onStep={busy ? undefined : moveStep} />
    <div className="wizard-body">
      {step === 0 && <>
        <h3 tabIndex={-1}>Une musique pour ton jingle</h3><p>Choisis une ambiance, puis enregistre deux intonations du titre, une présentation et une accroche.</p>
        {originalLegacy.current && <p className="jingle-production-note">Ton jingle actuel reste conservé jusqu’à « Enregistrer le jingle ».</p>}
        {upgrading.current && <p className="jingle-production-note">Tes prises sont conservées. Ajoute la deuxième intonation du titre pour essayer le nouveau montage.</p>}
        <div className="jingle-style-grid">{JINGLE_STYLES.map((item) => <button key={item.style} disabled={busy} className={bed.style === item.style ? 'selected' : ''} aria-pressed={bed.style === item.style} onClick={() => { const next = getJingleBed(item.style, undefined, bed.variant); if (next.id === bed.id) return; stopPreviews(); setError(''); update({ style: next.style, musicAssetId: undefined, bedId: next.id }); }}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
        <div className="jingle-duration-choice" role="group" aria-label="Durée du jingle"><strong>Durée du jingle</strong><div>{variants.map((item) => <button key={item.id} disabled={busy} className={bed.id === item.id ? 'selected' : ''} aria-pressed={bed.id === item.id} onClick={() => { if (item.id === bed.id) return; stopPreviews(); setError(''); update({ bedId: item.id, musicAssetId: undefined }); }}><strong>{item.duration} secondes</strong><small>{item.variant === 'standard' ? 'Titres et phrases très courts' : 'Conseillé pour parler sans se presser'}</small></button>)}</div></div>
        <div className="jingle-bed-card"><div><strong>🎵 {bed.title}</strong><span>{bed.effect}</span></div>{loadingBed ? <p role="status">Préparation de la musique…</p> : music ? <TakePlayer asset={music} label="Écouter la musique du style" /> : null}<small>{bed.author} · <a href={bed.sourcePage} target="_blank" rel="noreferrer">Source</a> · <a href={bed.licenseUrl} target="_blank" rel="noreferrer">{bed.licenseName}</a></small></div>
        <p className="jingle-production-note">{seconds(JINGLE_LEAD)} de musique au début et au moins {seconds(JINGLE_TAIL)} à la fin. Entre les phrases, la musique reprend sa place. La deuxième intonation du titre arrive après la présentation.</p>
        {plan.complete && !plan.fits && <p className="missing-audio">Tes prises sont conservées. {bed.variant === 'standard' ? 'Choisis 35 secondes pour leur laisser plus de place, ou raccourcis une phrase.' : 'Raccourcis une phrase pour tenir dans les 35 secondes.'}</p>}
      </>}
      {activePart && <>
        <h3 tabIndex={-1}>{activePart === 'title' || activePart === 'title-alt' ? 'Le même titre, deux intonations' : activePart === 'intro' ? 'Présente ton podcast en une phrase' : 'Annonce le sujet de cet épisode'}</h3>
        {step === 1 && <div className="title-take-tabs" role="group" aria-label="Intonations du titre">{([1,2] as const).map(version => <button key={version} disabled={busy || (version === 2 && !takeValid('title'))} aria-pressed={titleVersion === version} className={titleVersion === version ? 'selected' : ''} onClick={() => { stopPreviews(); setError(''); setTitleVersion(version); }}><strong>Intonation {version}</strong><small>{version === 1 ? 'Au début, puis en écho' : 'Après la présentation'}{takeValid(version === 1 ? 'title' : 'title-alt') ? ' · ✓' : ''}</small></button>)}</div>}
        <p>{activePart === 'title' ? 'Dis le titre avec une première intonation claire et assurée. Son écho reprend aussitôt après la fin de cette prise.' : activePart === 'title-alt' ? 'Prononce exactement le même titre avec une autre intonation : plus souriante, étonnée ou enthousiaste. Cette prise arrivera après la présentation.' : activePart === 'intro' ? 'Explique ce que les auditeurs vont découvrir. Ta voix sera clarifiée, avec une légère réverbération.' : 'Donne le numéro ou le sujet de l’épisode. Ta voix garde la même amélioration naturelle que la présentation.'}</p>
        <div className={`jingle-budget ${plan.limits[activePart] < 0.5 ? 'over-budget' : ''}`}><strong>Jusqu’à {seconds(plan.limits[activePart])} pour cette phrase</strong><span>Les remontées musicales sont déjà réservées. Une prise courte laisse plus de temps aux phrases suivantes. Tes prises sont conservées si tu changes de durée.</span>{moreTime}</div>
        <label className="field jingle-script"><span>Texte à prononcer <small>modifiable</small></span><textarea rows={2} value={jingle.scripts?.[activePart === 'title-alt' ? 'title' : activePart] ?? defaults[activePart]} onChange={(event) => update({ scripts: { ...jingle.scripts, [activePart === 'title-alt' ? 'title' : activePart]: event.target.value } })} /><small>Ce texte est un aide-mémoire. Enregistre-le avec ta voix.</small></label>
        {earlierReady && music && !loadingBed && plan.limits[activePart] >= 0.5 ? <Recorder key={activePart} maxSeconds={plan.limits[activePart]} onBusyChange={setBusy} onReady={async (blob) => { try { await keepTake(activePart, blob, 'recording'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Impossible de garder cette prise.'); throw reason; } }} /> : <p className="missing-audio">{!earlierReady ? `Retourne à la phrase précédente pour la raccourcir${bed.variant === 'standard' ? ', ou passe à 35 secondes' : ''}.` : 'Choisis une musique et attends sa préparation avant d’enregistrer.'}</p>}
        <fieldset className="jingle-import" disabled={busy || !music || loadingBed || !earlierReady}><FilePicker label={`Importer la voix : ${PART_LABELS[activePart].toLocaleLowerCase('fr')}`} onFile={(file) => void importTake(activePart, file)} /></fieldset>
        {jingle.takes?.[activePart] && (() => {
          const take = jingle.takes[activePart]!; const asset = assets.find((item) => item.id === take.assetId);
          return asset ? <div className={`jingle-take-card ${takeValid(activePart) ? '' : 'over-budget'}`}><div><strong>{takeValid(activePart) ? '✓ Prise gardée' : 'Phrase trop longue pour cette musique'} · {seconds(plan.durations[activePart])}</strong><button className="danger-text" disabled={busy} onClick={() => { stopPreviews(); update({ takes: { ...jingle.takes, [activePart]: undefined } }); }}>Recommencer</button></div><TakePlayer asset={asset} start={take.sourceStart} end={take.sourceEnd} label={`Écouter la prise : ${PART_LABELS[activePart]}`} /></div> : null;
        })()}
      </>}
      {step === 4 && <>
        <h3 tabIndex={-1}>{plan.ready ? 'Ton jingle est prêt à écouter' : 'Termine les prises de voix'}</h3><p>{bed.label} · {bed.title} · {seconds(plan.total)}.</p>
        <ol className="jingle-sequence" aria-label="Ordre du jingle">
          <li><strong>Musique d’intro</strong><small>{seconds(JINGLE_LEAD)}</small></li>
          <li className="spoken"><strong>Titre 1</strong><small>Intonation 1</small></li>
          <li className="spoken"><strong>Écho du titre 1</strong><small>Juste après, sans pause</small></li>
          <li><strong>La musique remonte</strong><small>{seconds(plan.musicBreaks?.afterEcho ?? 2)}</small></li>
          <li className="spoken"><strong>Présentation</strong><small>Voix claire</small></li>
          <li><strong>La musique remonte</strong><small>{seconds(plan.musicBreaks?.afterIntro ?? 2)}</small></li>
          <li className="spoken"><strong>Titre 2</strong><small>Intonation 2</small></li>
          <li><strong>La musique remonte</strong><small>{seconds(plan.musicBreaks?.afterTitle ?? 1.5)}</small></li>
          <li className="spoken"><strong>Accroche</strong><small>Voix naturelle</small></li>
          <li><strong>Musique finale</strong><small>{plan.ready ? seconds(plan.total - plan.outroStart) : `Au moins ${seconds(JINGLE_TAIL)}`}</small></li>
        </ol>
        <Preview previewId={`jingle-${block.id}-${JSON.stringify(jingle)}`} label={`Écouter le jingle complet · ${seconds(plan.total)}`} onStart={() => onPreview(block)} disabled={!plan.ready || busy || !music || loadingBed} />
        <div className="jingle-review-takes">{JINGLE_PARTS.map(part => <button key={part} className={takeValid(part) ? '' : 'over-budget'} onClick={() => { setTitleVersion(part === 'title-alt' ? 2 : 1); moveStep(part === 'title' || part === 'title-alt' ? 1 : part === 'intro' ? 2 : 3); }}><strong>{PART_LABELS[part]} · {seconds(plan.durations[part])}</strong><small>{(jingle.scripts?.[part === 'title-alt' ? 'title' : part] ?? defaults[part]) || 'Modifier cette prise'}</small><span>Réenregistrer →</span></button>)}</div>
        {!plan.ready && <div className="jingle-budget"><p className="missing-audio">Les deux intonations du titre, la présentation et l’accroche doivent tenir dans la musique. Reprends les phrases signalées{bed.variant === 'standard' ? ' ou passe à 35 secondes' : ''}.</p>{moreTime}</div>}
        <label className="field music-volume-slider"><span>Musique sous les voix · {jingle.musicVolume ?? 32}%</span><input aria-label="Musique sous les voix" type="range" min="0" max="100" value={jingle.musicVolume ?? 32} onChange={(event) => { stopPreviews(); update({ musicVolume: Number(event.target.value) }); }} /></label>
        <details className="jingle-final-sound"><summary>Bruitage final <small>facultatif</small><span>{ending?.title ?? 'Aucun bruitage'}</span></summary>
          <p>Un seul son court, après les paroles. La durée du jingle reste la même.</p>
          <button className={`secondary-button ${!jingle.ending ? 'selected' : ''}`} disabled={busy} aria-pressed={!jingle.ending} onClick={() => { stopPreviews(); update({ ending: undefined }); }}>Aucun bruitage</button>
          <div className="jingle-ending-grid">{JINGLE_ENDINGS.map(item => <div key={item.id} className={ending?.id === item.id ? 'selected' : ''}>
            <button className="ending-choice" disabled={busy} aria-pressed={ending?.id === item.id} onClick={() => void chooseEnding(item)}><span aria-hidden="true">{item.icon}</span><strong>{item.title}</strong><small>{seconds(item.duration)}</small></button>
            <Preview previewId={`ending-${item.id}`} label={`Écouter ${item.title.toLocaleLowerCase('fr')}`} disabled={busy} onStart={signal => createLibraryPreviewSession(endingPreviewPreset(item), signal)} />
          </div>)}</div>
          {jingle.ending && <label className="field music-volume-slider"><span>Volume du bruitage final · {jingle.ending.volume}%</span><input aria-label="Volume du bruitage final" type="range" min="0" max="100" value={jingle.ending.volume} onChange={event => { stopPreviews(); update({ ending: { ...jingle.ending!, volume: Number(event.target.value) } }); }} /></label>}
        </details>
        <label className="field"><span>Nom du jingle</span><input value={block.title} onChange={(event) => onBlock((current) => ({ ...current, title: event.target.value }))} /></label>
      </>}
      {bedError && <div className="error-box" role="alert">{bedError} <button className="secondary-button compact" onClick={() => setRetry((value) => value + 1)}>Réessayer</button></div>}
      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
    <div className="modal-footer"><button className="ghost-button" disabled={busy} onClick={() => step === 1 && titleVersion === 2 ? (stopPreviews(), setTitleVersion(1)) : step > 0 ? moveStep(step - 1) : onClose()}>{step > 0 ? '← Retour' : 'Annuler'}</button><span className="footer-spacer" />{step < 4 ? <button className="primary-button" disabled={!canContinue} onClick={() => step === 1 && titleVersion === 1 ? (stopPreviews(), setTitleVersion(2)) : moveStep(step + 1)}>{step === 1 && titleVersion === 1 ? 'Enregistrer l’autre intonation →' : 'Continuer →'}</button> : <button className="primary-button" disabled={busy || loadingBed || !music || !plan.ready || !block.title.trim()} onClick={() => onSave(block)}>✓ {isNew ? 'Ajouter le jingle' : 'Enregistrer le jingle'}</button>}</div>
  </div>;
}
