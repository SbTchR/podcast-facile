// Pin the multilingual ONNX model so browser caches stay reproducible.
export const TRANSCRIPTION_MODEL = {
  id: 'Xenova/whisper-small', revision: '2d67713f236afa48a18992566e7647f6ca848e13', megabytes: 250,
} as const;
