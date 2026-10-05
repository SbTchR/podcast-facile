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

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]*)(?:;[^,]*)?;base64,([A-Za-z0-9+/=\r\n]*)$/.exec(dataUrl);
  if (!match) throw new Error('Un fichier audio de cette sauvegarde est illisible.');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] || 'application/octet-stream' });
}

function validateProjectAudio(project: PodcastProject): void {
  const assetIds = new Set(project.assets.map(asset => asset.id));
  const references = project.blocks.flatMap(block => [
    block.assetId, block.background?.assetId, ...(block.voiceCues ?? []).map(cue => cue.assetId),
    block.jingle?.musicAssetId, block.jingle?.voiceAssetId, block.jingle?.openingAssetId, block.jingle?.closingAssetId,
    block.jingle?.ending?.assetId, ...Object.values(block.jingle?.takes ?? {}).map(take => take?.assetId),
  ]).concat(project.sections.flatMap(section => (section.audioLayers ?? []).map(layer => layer.assetId)));
  if (references.some(id => id && !assetIds.has(id))) {
    throw new Error('Un son du montage est introuvable. Réimporte-le avant de créer une sauvegarde complète.');
  }
  for (const asset of project.assets) {
    if (!(asset.blob instanceof Blob) || asset.blob.size === 0) {
      throw new Error(`Le son « ${asset.name} » est vide ou illisible. Réimporte-le pour conserver un projet complet.`);
    }
  }
}

export async function serializeProject(project: PodcastProject): Promise<Blob> {
  validateProjectAudio(project);
  const assets: SerializedAsset[] = await Promise.all(
    project.assets.map(async (asset) => {
      const { blob, ...metadata } = asset;
      return { ...metadata, data: await blobToDataUrl(blob) };
    }),
  );
  const payload: SerializedProject = { ...project, assets, format: 'podcast-facile', version: 1 };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

export async function deserializeProject(file: File): Promise<PodcastProject> {
  const raw = JSON.parse(await file.text()) as SerializedProject;
  if (raw.format !== 'podcast-facile' || raw.version !== 1 || !Array.isArray(raw.assets) || !Array.isArray(raw.blocks) || !Array.isArray(raw.sections)) {
    throw new Error('Ce fichier n’est pas une sauvegarde Podcast Facile valide.');
  }
  const assets: AudioAsset[] = await Promise.all(
    raw.assets.map(async (asset) => {
      const { data, ...metadata } = asset;
      return { ...metadata, blob: dataUrlToBlob(data) };
    }),
  );
  const { format: _format, version: _version, ...project } = raw;
  const restored = { ...project, assets, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
  validateProjectAudio(restored);
  return restored;
}
