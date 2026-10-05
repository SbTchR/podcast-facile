import { useEffect, useRef, useState, type ComponentType, type Dispatch, type SetStateAction } from 'react';
import type { AudioAsset, JingleVoicePart, PodcastBlock } from '../types';
import { JINGLE_STYLES, getJingleBed, getJingleVariants, loadJingleBed } from '../data/jingleBeds';
import { JINGLE_ENDINGS, JINGLE_CREDIT_ENDINGS, endingPreviewPreset, type JingleEnding } from '../data/jingleEndings';
import { loadLibraryAudio } from '../data/audioLibrary';
import { createLibraryPreviewSession } from '../audio/libraryPreview';
import { analyseJingleRecording, getGuidedJinglePlan } from '../audio/jinglePlan';
import type { PreviewSession } from '../audio/libraryPreview';
import { RADIO_JINGLE_PARTS, JINGLE_PART_LABELS as PART_LABELS, isJingleEcho, isJinglePartEnabled, jinglePartSpeaker } from '../audio/jingleParts';
import { previewRadioJingleTakes, jingleVoiceEffectDefaults } from '../audio/radioJingleVoice';
import { JingleTiming } from './JingleTiming';
import { WizardSteps } from './WizardSteps';
import type { RegisterAsset, WizardUI } from './SectionSoundWizard';

const STEP_PARTS: JingleVoicePart[][] = [[], ['title', 'title-echo'], ['intro', 'intro-echo'], ['title-alt', 'title-alt-echo'], ['hook'], []];
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

export function JingleWizard({ block, assets, podcastTitle, onBlock, onRegisterAsset, onPreview, onSave, onClose, isNew, FilePicker, Preview, Recorder, initialPart }: {
  initialPart?: JingleVoicePart; block: PodcastBlock; assets: AudioAsset[]; podcastTitle: string; onBlock: Dispatch<SetStateAction<PodcastBlock>>;
  onRegisterAsset: RegisterAsset; onPreview: (block: PodcastBlock) => Promise<PreviewSession>; onSave: (block: PodcastBlock) => void; onClose: () => void; isNew: boolean;
  FilePicker: WizardUI['FilePicker']; Preview: WizardUI['Preview']; Recorder: ComponentType<{ onReady: (blob: Blob, duration: number) => Promise<void> | void; onBusyChange?: (busy: boolean) => void; maxSeconds?: number; showHint?: boolean }>;
}) {
  const [step, setStep] = useState(() => initialPart ? STEP_PARTS.findIndex(parts => parts.includes(initialPart)) : 0);
  const [takeKind, setTakeKind] = useState<'main' | 'echo'>(() => initialPart && isJingleEcho(initialPart) ? 'echo' : 'main');
  const [busy, setBusy] = useState(false);
  const [loadingBed, setLoadingBed] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [bedError, setBedError] = useState('');
  const wizardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wizardRef.current?.closest('.modal')?.scrollTo({ top: 0 });
    wizardRef.current?.querySelector<HTMLHeadingElement>('.wizard-body h3')?.focus({ preventScroll: true });
  }, [step, takeKind]);
  const originalLegacy = useRef(!block.jingle?.production?.startsWith('guided-') && Boolean(block.jingle?.voiceAssetId));
  const upgrading = useRef(Boolean(block.jingle?.production?.startsWith('guided-') && block.jingle.production !== 'guided-v7' && block.jingle.production !== 'guided-v8' && block.jingle.production !== 'guided-v9'));
  const live = useRef({ assets, onBlock, onRegisterAsset });
  live.current = { assets, onBlock, onRegisterAsset };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const jingle = block.jingle ?? { style: 'modern-radio' as const, musicLevel: 'low' as const };
  const bed = getJingleBed(jingle.style, jingle.bedId);
  const variants = getJingleVariants(jingle.style);
  const music = assets.find((asset) => asset.id === jingle.musicAssetId && asset.libraryId === bed.id);
  const planningJingle = { ...jingle, production: 'guided-v9' as const, scripts: { ...jingle.scripts, title: jingle.scripts?.title ?? podcastTitle } };
  const plan = getGuidedJinglePlan({ ...block, jingle: planningJingle }, assets, bed.duration);
  const stepParts = STEP_PARTS[step];
  const activePart = stepParts[takeKind === 'echo' && stepParts.length > 1 ? 1 : 0];
  const echo = Boolean(activePart && isJingleEcho(activePart));
  const script = (part: JingleVoicePart) => jingle.scripts?.[part] ?? '';
  const speaker = (part: JingleVoicePart) => jinglePartSpeaker(jingle, part);
  const update = (values: Partial<NonNullable<PodcastBlock['jingle']>>) => onBlock((current) => ({ ...current, jingle: { style: bed.style, musicLevel: 'low', ...current.jingle, production: 'guided-v9', ...values } }));

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
        live.current.onBlock((current) => ({ ...current, jingle: { style: bed.style, musicLevel: 'low', ...current.jingle, production: 'guided-v9', bedId: bed.id, musicAssetId: asset.id, signatureFx: false } }));
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
  const shorterBed = variants.find(item => item.variant === 'standard');
  const shorterFits = bed.variant === 'extended' && plan.ready && shorterBed && getGuidedJinglePlan({ ...block, jingle: { ...jingle, production: 'guided-v9' } }, assets.map(asset => asset.id === jingle.musicAssetId ? { ...asset, duration: shorterBed.duration } : asset)).ready;
  const moveStep = (next: number, kind: 'main' | 'echo' = 'main') => { stopPreviews(); setError(''); setTakeKind(kind); setStep(next); };
  const keepTake = async (part: JingleVoicePart, blob: Blob, source: 'recording' | 'import') => {
    setError('');
    const analysis = await analyseJingleRecording(blob);
    const spokenDuration = analysis.sourceEnd - analysis.sourceStart;
    if (spokenDuration < 0.15) throw new Error('Cette prise est trop courte. Prononce ta phrase puis termine l’enregistrement.');
    if (!mounted.current) return;
    const asset = await onRegisterAsset(blob, `${PART_LABELS[part]} du jingle`, blob.type, analysis.duration, { source });
    if (!mounted.current) return;
    onBlock((current) => ({ ...current, jingle: { style: bed.style, musicLevel: 'low', ...current.jingle, production: 'guided-v9', takes: { ...current.jingle?.takes, [part]: { assetId: asset.id, sourceStart: analysis.sourceStart, sourceEnd: analysis.sourceEnd } } } }));
  };
  const importTake = async (part: JingleVoicePart, file: File) => {
    stopPreviews(); setBusy(true);
    try { await keepTake(part, file, 'import'); } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Impossible de lire cette voix.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  const takeValid = (part: JingleVoicePart) => plan.durations[part] >= 0.15;
  const timeMissing = Math.max(0, plan.used - plan.window);
  const canContinue = !busy;
  const included = (part: JingleVoicePart) => isJinglePartEnabled(jingle, part);
  const togglePart = (part: JingleVoicePart, enabled: boolean) => { stopPreviews(); update({ enabledParts: { ...jingle.enabledParts, [part]: enabled } }); };
  const partChoices = <details className="jingle-element-options"><summary>Éléments du jingle <small>facultatif</small></summary><div>{RADIO_JINGLE_PARTS.map(part => <label className="check-row" key={part}><input type="checkbox" checked={included(part)} disabled={busy} onChange={event => togglePart(part, event.target.checked)} />{PART_LABELS[part]}</label>)}</div></details>;
  const showTake = (part: JingleVoicePart) => { const index = STEP_PARTS.findIndex(parts => parts.includes(part)); moveStep(index, isJingleEcho(part) ? 'echo' : 'main'); };
  const previewTake = (part: JingleVoicePart, signal: AbortSignal) => {
    const main = STEP_PARTS[step][0];
    const parts = isJingleEcho(part) && included(main) && jingle.takes?.[main] ? [main, part] : [part];
    const cues = parts.map(item => {
      const take = jingle.takes![item]!; const asset = assets.find(value => value.id === take.assetId);
      if (!asset) throw new Error('Cette voix est introuvable. Réenregistre-la.');
      return { part: item, take, asset, at: parts.length > 1 ? plan.starts[item] - plan.starts[main] : 0 };
    });
    return previewRadioJingleTakes(cues, jingle.style, signal, jingle.effects);
  };
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
    <WizardSteps labels={['Style', 'Titre 1', 'Intro', 'Titre 2', 'Accroche', 'Écouter']} step={step} onStep={busy ? undefined : moveStep} canVisit={() => true} isComplete={index => index === 0 ? Boolean(music) : index === 5 ? plan.ready : STEP_PARTS[index].every(part => !included(part) || takeValid(part))} />
    <div className="wizard-body">
      {step === 0 && <>
        <h3 tabIndex={-1}>Une musique pour ton jingle</h3><p>Choisis la musique et enregistre les voix dans l’ordre que tu veux. Les réponses reprennent 2–3 mots.</p>
        {partChoices}
        {originalLegacy.current && <p className="jingle-production-note">Ton jingle actuel reste conservé jusqu’à « Enregistrer le jingle ».</p>}
        {upgrading.current && <p className="jingle-production-note">Tes prises sont conservées. Enregistre les trois réponses courtes dans les étapes Titre 1, Intro et Titre 2.</p>}
        <div className="jingle-style-grid">{JINGLE_STYLES.map((item) => <button key={item.style} disabled={busy} className={bed.style === item.style ? 'selected' : ''} aria-pressed={bed.style === item.style} onClick={() => { const next = getJingleBed(item.style, undefined, bed.variant); if (next.id === bed.id) return; stopPreviews(); setError(''); update({ style: next.style, musicAssetId: undefined, bedId: next.id }); }}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
        <div className="jingle-duration-choice" role="group" aria-label="Durée du jingle"><strong>Durée du jingle</strong><div>{variants.map((item) => <button key={item.id} disabled={busy} className={bed.id === item.id ? 'selected' : ''} aria-pressed={bed.id === item.id} onClick={() => { if (item.id === bed.id) return; stopPreviews(); setError(''); update({ bedId: item.id, musicAssetId: undefined }); }}><strong>{item.duration} secondes</strong><small>{item.variant === 'standard' ? 'Titres et phrases très courts' : 'Conseillé pour parler sans se presser'}</small></button>)}</div></div>
        <div className="jingle-bed-card"><div><strong>🎵 {bed.title}</strong><span>{bed.effect}</span></div>{loadingBed ? <p role="status">Préparation de la musique…</p> : music ? <TakePlayer asset={music} label="Écouter la musique du style" /> : null}<small>{bed.author} · <a href={bed.sourcePage} target="_blank" rel="noreferrer">Source</a> · <a href={bed.licenseUrl} target="_blank" rel="noreferrer">{bed.licenseName}</a></small></div>
        <p className="jingle-production-note">Les passages musicaux s’adaptent à la durée des prises et aux éléments inclus. À deux, partagez le micro. En solo, change ton intonation pour jouer la voix 2.</p>
        {plan.complete && !plan.fits && <p className="missing-audio">Tes prises sont conservées. {bed.variant === 'standard' ? 'Choisis 35 secondes pour leur laisser plus de place, ou raccourcis une phrase.' : 'Raccourcis une phrase pour tenir dans les 35 secondes.'}</p>}
      </>}
      {activePart && <>
        <h3 tabIndex={-1}>{echo ? `${PART_LABELS[activePart]} : les derniers mots` : activePart === 'title' ? 'Le premier titre' : activePart === 'title-alt' ? 'Le titre revient avec une autre intonation' : activePart === 'intro' ? 'Présente ton podcast en une phrase' : 'Annonce le sujet de cet épisode'}</h3>
        {stepParts.length > 1 && <div className="title-take-tabs" role="group" aria-label="Prises à enregistrer">{stepParts.map((part, index) => <button key={part} disabled={busy} aria-pressed={activePart === part} className={activePart === part ? 'selected' : ''} onClick={() => moveStep(step, index === 0 ? 'main' : 'echo')}><strong>{index === 0 ? 'La phrase' : 'La réponse'} · {speaker(part)}</strong><small>{index === 0 ? 'Texte complet' : '2–3 derniers mots'}{!included(part) ? ' · Désactivée' : takeValid(part) ? ' · ✓' : ''}</small></button>)}</div>}
        <label className="check-row jingle-include-take"><input type="checkbox" checked={included(activePart)} disabled={busy} onChange={event => togglePart(activePart, event.target.checked)} />Inclure {PART_LABELS[activePart].toLocaleLowerCase('fr')} dans le jingle</label>
        {!included(activePart) && <p className="jingle-production-note">Élément désactivé. Sa prise reste conservée pour le réactiver plus tard.</p>}
        <fieldset className="jingle-take-fields" disabled={!included(activePart)}>
        {activePart === 'intro' && <div className="jingle-speaker-choice" role="group" aria-label="Qui dit la présentation ?"><span>Qui parle ?</span>{(['voice-1', 'duo'] as const).map(choice => <button key={choice} disabled={busy} className={(jingle.introVoices ?? 'voice-1') === choice ? 'selected' : ''} aria-pressed={(jingle.introVoices ?? 'voice-1') === choice} onClick={() => update({ introVoices: choice })}>{choice === 'duo' ? 'Voix 1 + voix 2' : 'Voix 1 seule'}</button>)}</div>}
        {activePart === 'hook' && <div className="jingle-speaker-choice" role="group" aria-label="Qui dit l’accroche ?"><span>Qui parle ?</span>{(['voice-1', 'voice-2'] as const).map(choice => <button key={choice} disabled={busy} className={(jingle.hookVoice ?? 'voice-1') === choice ? 'selected' : ''} aria-pressed={(jingle.hookVoice ?? 'voice-1') === choice} onClick={() => update({ hookVoice: choice })}>{choice === 'voice-1' ? 'Voix 1' : 'Voix 2'}</button>)}</div>}
        <div className="jingle-recording-role"><span className={`jingle-voice-badge ${echo || speaker(activePart) === 'Voix 2' ? 'voice-two' : speaker(activePart) === 'Voix 1 + voix 2' ? 'voice-both' : ''}`}>{speaker(activePart)}</span><small>Prise {RADIO_JINGLE_PARTS.indexOf(activePart as typeof RADIO_JINGLE_PARTS[number]) + 1} sur 7</small></div>
        <p>{echo ? 'Enregistre seulement les 2–3 derniers mots de la phrase.' : activePart === 'title' ? 'Voix 1 : annonce le titre avec énergie.' : activePart === 'title-alt' ? 'Voix 1 : redis le même titre avec une autre intonation.' : activePart === 'intro' ? 'Dites en quelques mots de quoi parle votre podcast.' : `${speaker(activePart)} : donne le numéro ou le sujet de l’épisode.`}</p>
        <div className="jingle-duration-advice"><strong>Conseil : vise environ {seconds(plan.limits[activePart] || 1)}.</strong><span>Tu peux parler plus longtemps ; l’enregistrement ne s’arrête pas automatiquement.</span></div>
        {plan.timing && !jingle.takes?.[activePart] && plan.timing.estimates[activePart] > plan.limits[activePart] + .2 && <p className="jingle-text-length-hint">Ton texte semble plus long que la durée conseillée. {bed.variant === 'standard' ? 'Choisis 35 secondes, ou raccourcis-le un peu.' : 'Lis-le à voix haute pour vérifier sa durée, puis raccourcis-le si besoin.'}</p>}
        <label className="field jingle-script"><span>{echo ? 'Les 2–3 mots à répéter' : 'Texte à prononcer'} <small>modifiable</small></span><textarea disabled={busy} rows={2} value={script(activePart)} onChange={event => update({ scripts: { ...jingle.scripts, [activePart]: event.target.value } })} /></label>
        {included(activePart) ? <Recorder showHint={false} key={activePart} onBusyChange={setBusy} onReady={async blob => { try { await keepTake(activePart, blob, 'recording'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Impossible de garder cette prise.'); throw reason; } }} /> : null}
        <details className="jingle-voice-settings" key={`effects-${activePart}`}>
          <summary>Réglages de la voix <small>facultatif</small></summary>
          <fieldset disabled={busy}>
            {(['reverb', 'enhancement', 'phone'] as const).map(effect => {
              const values = jingle.effects?.[activePart] ?? jingleVoiceEffectDefaults(activePart);
              const label = effect === 'reverb' ? 'Réverbération' : effect === 'enhancement' ? 'Amélioration de la voix' : 'Effet téléphone';
              return <label className="field music-volume-slider" key={effect}><span>{label} · {values[effect]}%</span><input type="range" aria-label={label} min="0" max="100" value={values[effect]} onChange={event => { stopPreviews(); update({ effects: { ...jingle.effects, [activePart]: { ...values, [effect]: Number(event.target.value) } } }); }} /></label>;
            })}
            <button className="ghost-button compact" onClick={() => { stopPreviews(); update({ effects: { ...jingle.effects, [activePart]: undefined } }); }}>Rétablir les réglages conseillés</button>
          </fieldset>
        </details>
        <fieldset className="jingle-import" disabled={busy}><FilePicker label={`Importer la voix : ${PART_LABELS[activePart].toLocaleLowerCase('fr')}`} onFile={file => void importTake(activePart, file)} /></fieldset>
        {jingle.takes?.[activePart] && (() => {
          const take = jingle.takes[activePart]!; const asset = assets.find(item => item.id === take.assetId);
          const keptDuration = take.sourceEnd - take.sourceStart;
          return asset ? <div className="jingle-take-card"><div><strong>✓ Prise gardée · {seconds(keptDuration)}</strong><button className="danger-text" disabled={busy} onClick={() => { stopPreviews(); update({ takes: { ...jingle.takes, [activePart]: undefined } }); }}>Recommencer</button></div><Preview previewId={`jingle-take-${activePart}-${JSON.stringify(jingle)}`} label={echo && included(stepParts[0]) && jingle.takes?.[stepParts[0]] ? 'Écouter la phrase et la réponse' : 'Écouter cette voix avec l’effet'} disabled={busy || !included(activePart)} onStart={signal => previewTake(activePart, signal)} /></div> : null;
        })()}
        </fieldset>
      </>}
      {step === 5 && <>
        <h3 tabIndex={-1}>{plan.ready ? 'Ton jingle est prêt à écouter' : plan.complete ? 'Tes phrases ont besoin de plus de temps' : 'Choisis les prises à garder'}</h3><p>{bed.label} · {bed.title} · {seconds(plan.total)}.</p>
        {partChoices}
        {shorterFits && <div className="jingle-shorter-choice"><p>Tes prises tiennent aussi dans 25 secondes, pour un jingle plus rythmé.</p><button className="secondary-button compact" disabled={busy || loadingBed} onClick={() => { stopPreviews(); setError(''); update({ bedId: shorterBed!.id, musicAssetId: undefined }); }}>Passer à 25 secondes en gardant les voix</button></div>}
        <JingleTiming plan={plan} onTake={showTake} jingle={jingle} />
        <Preview previewId={`jingle-${block.id}-${JSON.stringify(jingle)}`} label={`Écouter le jingle complet · ${seconds(plan.total)}`} onStart={() => onPreview(block)} disabled={!plan.ready || busy || !music || loadingBed} />

        {!plan.ready && <div className="jingle-budget"><p className="missing-audio">{plan.complete ? 'Il manque ' + seconds(timeMissing) + ' pour garder toutes les paroles et les passages musicaux. ' + (bed.variant === 'standard' ? 'Passe à 35 secondes, ou raccourcis une phrase.' : 'Raccourcis une phrase, puis réenregistre-la.') : 'Enregistre les éléments inclus encore manquants, ou désactive-les. Tes prises restent conservées.'}</p>{moreTime}</div>}
        {!plan.complete && <div className="jingle-missing-takes">{RADIO_JINGLE_PARTS.filter(part => included(part) && !takeValid(part)).map(part => <button className="ghost-button compact" key={part} disabled={busy} onClick={() => showTake(part)}>{PART_LABELS[part]} →</button>)}</div>}
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
    <div className="modal-footer"><button className="ghost-button" disabled={busy} onClick={() => takeKind === 'echo' ? moveStep(step, 'main') : step > 0 ? moveStep(step - 1, step > 1 && step < 5 ? 'echo' : 'main') : onClose()}>{step > 0 ? '← Retour' : 'Annuler'}</button><span className="footer-spacer" />{!plan.ready && Object.values(jingle.scripts ?? {}).some(text => text?.trim()) && <button className="secondary-button compact" disabled={busy || loadingBed} onClick={() => onSave(block)}>Garder le brouillon</button>}{step < 5 ? <button className="primary-button" disabled={!canContinue} onClick={() => activePart && stepParts.length > 1 && takeKind === 'main' && included(stepParts[1]) ? moveStep(step, 'echo') : moveStep(step + 1)}>{activePart && stepParts.length > 1 && takeKind === 'main' && included(stepParts[1]) ? 'Passer à la réponse →' : 'Continuer →'}</button> : <button className="primary-button" disabled={busy || loadingBed || !music || !plan.ready || !block.title.trim()} onClick={() => onSave(block)}>✓ {isNew ? 'Ajouter le jingle' : 'Enregistrer le jingle'}</button>}</div>
  </div>;
}
