export interface ReadyDownload { blob: Blob; filename: string }
interface SaveFileHandle {
  createWritable: () => Promise<{ write: (blob: Blob) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> }>;
}
interface SaveFileOptions {
  filename: string; description: string; mimeType: string; extension: `.${string}`;
  createBlob: () => Promise<Blob>; onReady: (file: ReadyDownload) => void;
}
type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: { suggestedName: string; startIn: 'downloads'; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<SaveFileHandle>;
};
/** Invoke directly on click, before any asynchronous audio preparation. */
export async function saveFile(options: SaveFileOptions): Promise<'saved' | 'ready' | 'cancelled'> {
  const pickerWindow = window as SavePickerWindow;
  let handle: SaveFileHandle | undefined;
  if (pickerWindow.showSaveFilePicker && window.isSecureContext) {
    try {
      handle = await pickerWindow.showSaveFilePicker({ suggestedName: options.filename, startIn: 'downloads', types: [{ description: options.description, accept: { [options.mimeType]: [options.extension] } }] });
    } catch (error) {
      // Chrome also uses AbortError when a browser integration intercepts the
      // chooser. In that case there was no dialog for the user to cancel.
      if (error instanceof DOMException && error.name === 'AbortError'
        && !/intercept|blocked|denied|not allowed/i.test(error.message)) return 'cancelled';
      // Preserve a downloadable file whenever the native chooser is unavailable.
    }
  }
  const blob = await options.createBlob();
  if (!handle) {
    options.onReady({ blob, filename: options.filename });
    return 'ready';
  }
  const writable = await handle.createWritable();
  try { await writable.write(blob); await writable.close(); }
  catch (error) { await writable.abort().catch(() => undefined); throw error; }
  return 'saved';
}
