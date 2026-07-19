import type { AudioAsset, PodcastProject, ProjectSummary } from '../types';

const DB_NAME = 'podcast-facile-db';
const DB_VERSION = 1;
const STORE = 'projects';
const STORAGE_FORMAT = 'arraybuffer-v2';

interface StoredAudioAsset extends Omit<AudioAsset, 'blob'> {
  audioBytes?: ArrayBuffer;
  blob?: Blob;
}

interface StoredPodcastProject extends Omit<PodcastProject, 'assets'> {
  storageFormat?: typeof STORAGE_FORMAT;
  assets: StoredAudioAsset[];
}

const blobBytesCache = new WeakMap<Blob, Promise<ArrayBuffer>>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Impossible d’ouvrir la sauvegarde locale.'));
  });
}

function readBlobWithFileReader(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('Le fichier audio ne contient pas de données lisibles.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Impossible de lire le fichier audio.'));
    reader.readAsArrayBuffer(blob);
  });
}

async function blobToBytes(blob: Blob): Promise<ArrayBuffer> {
  const cached = blobBytesCache.get(blob);
  if (cached) return cached;

  const task = (async () => {
    try {
      return await blob.arrayBuffer();
    } catch {
      return readBlobWithFileReader(blob);
    }
  })();

  blobBytesCache.set(blob, task);
  try {
    return await task;
  } catch (error) {
    blobBytesCache.delete(blob);
    throw error;
  }
}

async function prepareProjectForStorage(project: PodcastProject): Promise<StoredPodcastProject> {
  const assets: StoredAudioAsset[] = await Promise.all(
    project.assets.map(async (asset) => {
      const { blob, ...metadata } = asset;
      return {
        ...metadata,
        audioBytes: (await blobToBytes(blob)).slice(0),
      };
    }),
  );

  return {
    ...project,
    storageFormat: STORAGE_FORMAT,
    assets,
  };
}

async function restoreProject(raw: StoredPodcastProject): Promise<{
  project: PodcastProject;
  needsMigration: boolean;
  hasUnavailableAudio: boolean;
}> {
  let needsMigration = raw.storageFormat !== STORAGE_FORMAT;
  let hasUnavailableAudio = false;

  const assets: AudioAsset[] = await Promise.all(
    (raw.assets ?? []).map(async (stored) => {
      const { audioBytes, blob: legacyBlob, ...metadata } = stored;

      if (audioBytes instanceof ArrayBuffer) {
        const bytes = audioBytes.slice(0);
        const blob = new Blob([bytes], { type: metadata.mimeType });
        blobBytesCache.set(blob, Promise.resolve(bytes));
        return { ...metadata, blob };
      }

      if (ArrayBuffer.isView(audioBytes)) {
        const bytes = audioBytes.buffer.slice(audioBytes.byteOffset, audioBytes.byteOffset + audioBytes.byteLength);
        const blob = new Blob([bytes], { type: metadata.mimeType });
        blobBytesCache.set(blob, Promise.resolve(bytes));
        needsMigration = true;
        return { ...metadata, blob };
      }

      if (legacyBlob instanceof Blob) {
        try {
          const bytes = (await blobToBytes(legacyBlob)).slice(0);
          const blob = new Blob([bytes], { type: metadata.mimeType });
          blobBytesCache.set(blob, Promise.resolve(bytes));
          needsMigration = true;
          return { ...metadata, blob };
        } catch {
          hasUnavailableAudio = true;
          return { ...metadata, blob: new Blob([], { type: metadata.mimeType }) };
        }
      }

      hasUnavailableAudio = true;
      return { ...metadata, blob: new Blob([], { type: metadata.mimeType }) };
    }),
  );

  const { storageFormat: _storageFormat, ...project } = raw;
  return {
    project: { ...project, assets },
    needsMigration,
    hasUnavailableAudio,
  };
}

export async function saveProject(project: PodcastProject): Promise<void> {
  const storedProject = await prepareProjectForStorage(project);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(storedProject);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Échec de la sauvegarde.'));
  });
  db.close();
}

export async function loadProject(id: string): Promise<PodcastProject | undefined> {
  const db = await openDb();
  const raw = await new Promise<StoredPodcastProject | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredPodcastProject | undefined);
    req.onerror = () => reject(req.error ?? new Error('Échec de la lecture du projet.'));
  });
  db.close();
  if (!raw) return undefined;

  const restored = await restoreProject(raw);
  if (restored.needsMigration && !restored.hasUnavailableAudio) {
    await saveProject(restored.project);
  }
  return restored.project;
}

export async function listProjects(): Promise<PodcastProject[]> {
  const db = await openDb();
  const rawProjects = await new Promise<StoredPodcastProject[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredPodcastProject[]);
    req.onerror = () => reject(req.error ?? new Error('Échec de la lecture des projets.'));
  });
  db.close();

  const projects = await Promise.all(rawProjects.map(async (raw) => (await restoreProject(raw)).project));
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Échec de la suppression.'));
  });
  db.close();
}

export function summarizeProject(project: PodcastProject, duration: number): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    author: project.author,
    updatedAt: project.updatedAt,
    duration,
  };
}
