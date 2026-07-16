import type { AudioAsset, PodcastProject } from '../types';

interface SerializedAsset {
  id: string;
  name: string;
  mimeType: string;
  duration: number;
  data: string;
  source?: AudioAsset['source'];
  libraryId?: string;
}

interface SerializedProject extends Omit<PodcastProject, 'assets'> {
  format: 'podcast-facile';
  version: 1;
  assets: SerializedAsset[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Impossible de lire le fichier audio.'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function serializeProject(project: PodcastProject): Promise<Blob> {
  const assets: SerializedAsset[] = await Promise.all(
    project.assets.map(async (asset) => ({
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      duration: asset.duration,
      data: await blobToDataUrl(asset.blob),
      source: asset.source,
      libraryId: asset.libraryId,
    })),
  );
  const payload: SerializedProject = { ...project, assets, format: 'podcast-facile', version: 1 };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

export async function deserializeProject(file: File): Promise<PodcastProject> {
  const raw = JSON.parse(await file.text()) as SerializedProject;
  if (raw.format !== 'podcast-facile' || raw.version !== 1 || !Array.isArray(raw.assets)) {
    throw new Error('Ce fichier n’est pas une sauvegarde Podcast Facile valide.');
  }
  const assets: AudioAsset[] = await Promise.all(
    raw.assets.map(async (asset) => ({
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      duration: asset.duration,
      blob: await dataUrlToBlob(asset.data),
      source: asset.source,
      libraryId: asset.libraryId,
    })),
  );
  const { format: _format, version: _version, ...project } = raw;
  return { ...project, assets, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
}
