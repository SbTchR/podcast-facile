import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import wasmUrl from '../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url';
import wasmModuleUrl from '../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url';
import type { TranscriptLanguage } from './transcription';

env.allowLocalModels = false;
env.useBrowserCache = true;
// A single WASM thread also works without cross-origin isolation on static hosts.
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  // Ship the matching runtime with the app rather than loading code from a CDN.
  env.backends.onnx.wasm.wasmPaths = { wasm: new URL(wasmUrl, self.location.href).href, mjs: new URL(wasmModuleUrl, self.location.href).href };
}

let transcriber: AutomaticSpeechRecognitionPipeline | undefined;
const languages: Record<TranscriptLanguage, string> = { fr: 'french', de: 'german', en: 'english' };
const send = (message: unknown) => self.postMessage(message);

self.onmessage = async ({ data }: MessageEvent<{ type: string; samples: Float32Array; language: TranscriptLanguage }>) => {
  if (data.type === 'dispose') { await transcriber?.dispose(); transcriber = undefined; send({ type: 'disposed' }); return; }
  if (data.type !== 'transcribe') return;
  try {
    if (!transcriber) {
      send({ type: 'progress', progress: { stage: 'loading' } });
      const files = new Map<string, { loaded: number; total: number }>();
      // Narrow this task before calling: the library's full pipeline union is
      // too large for TypeScript to infer alongside all supported model dtypes.
      const createAsr = pipeline as (task: 'automatic-speech-recognition', model: string, options: {
        revision: string; device: 'wasm'; dtype: 'q8'; progress_callback: (info: { status: string; file?: string; loaded?: number; total?: number }) => void;
      }) => Promise<AutomaticSpeechRecognitionPipeline>;
      transcriber = await createAsr('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        revision: '5332fcc35e32a33b86612b9a57a89be7906102b1', device: 'wasm', dtype: 'q8',
        progress_callback: info => {
          if (info.status === 'progress' && info.file && info.loaded !== undefined && info.total !== undefined) {
            files.set(info.file, { loaded: info.loaded, total: info.total });
            const values = [...files.values()];
            const total = values.reduce((sum, item) => sum + item.total, 0);
            send({ type: 'progress', progress: { stage: 'loading', percent: total > 0 ? Math.round(values.reduce((sum, item) => sum + item.loaded, 0) / total * 100) : undefined } });
          }
        },
      });
    }
    send({ type: 'progress', progress: { stage: 'transcribing' } });
    const result = await transcriber(data.samples, { language: languages[data.language] ?? 'french', task: 'transcribe', chunk_length_s: 25, stride_length_s: 4, return_timestamps: false });
    const text = (Array.isArray(result) ? result.map(item => item.text).join(' ') : result.text).trim();
    if (!text) throw new Error('Aucune parole reconnue. Refais un essai en parlant près du micro.');
    send({ type: 'done', text });
  } catch {
    send({ type: 'error', error: 'Impossible de transcrire cet essai. Vérifie la connexion pour le premier téléchargement, puis réessaie.' });
  }
};
