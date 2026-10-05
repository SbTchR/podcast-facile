import { useEffect, useRef, useState } from 'react';
import type { ReadyDownload } from '../storage/saveFile';
import { useDialog } from '../useDialog';
export function DownloadDialog({ file, onClose }: { file: ReadyDownload; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [started, setStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewId = useRef(`download-${crypto.randomUUID()}`);
  const dialogRef = useDialog(onClose);
  const startPreview = () => {
    // Use the same output category as the editor after microphone recording.
    try {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
    } catch { /* Unsupported in some browsers. */ }
    window.dispatchEvent(new CustomEvent('podcast-facile-stop-preview', { detail: previewId.current }));
  };
  useEffect(() => {
    const stop = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== previewId.current) audioRef.current?.pause();
    };
    window.addEventListener('podcast-facile-stop-preview', stop);
    return () => window.removeEventListener('podcast-facile-stop-preview', stop);
  }, []);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file.blob);
    setUrl(objectUrl);
    // Keep large downloads readable after the dialog closes.
    return () => { window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000); };
  }, [file.blob]);
  return <div className="modal-backdrop"><div ref={dialogRef} data-podcast-dialog tabIndex={-1} className="modal download-dialog" role="dialog" aria-modal="true" aria-label="Enregistrer le fichier">
    <div className="modal-header"><h2>Ton fichier est prêt</h2><button onClick={onClose} aria-label="Fermer">×</button></div>
    <div className="modal-body"><p className="download-filename">{file.filename}</p><p>Clique pour enregistrer le fichier avec ton navigateur.</p>
      {url && file.blob.type.startsWith('audio/') && <div className="download-audio-preview"><p>Écouter le fichier exporté avant de l’enregistrer :</p><audio ref={audioRef} controls playsInline preload="metadata" src={url} onPlay={startPreview} /></div>}
      {url && <a className="primary-button download-file-link" href={url} download={file.filename} onClick={() => setStarted(true)}>Télécharger le fichier</a>}
      {started && <p role="status">Téléchargement lancé. Vérifie la liste des téléchargements de ton navigateur.</p>}
      <p className="download-location-help">Si ton navigateur ne demande pas où enregistrer : dans Chrome, active « Toujours demander où enregistrer les fichiers » dans Paramètres → Téléchargements ; dans Safari, choisis « Demander pour chaque téléchargement » dans Réglages → Général → Emplacement de téléchargement des fichiers.</p>
    </div><div className="modal-footer"><button className="secondary-button" onClick={onClose}>Fermer</button></div>
  </div></div>;
}
