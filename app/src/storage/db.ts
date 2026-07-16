import type { PodcastProject, ProjectSummary } from '../types';

const DB_NAME = 'podcast-facile-db';
const DB_VERSION = 1;
const STORE = 'projects';

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

export async function saveProject(project: PodcastProject): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Échec de la sauvegarde.'));
  });
  db.close();
}

export async function loadProject(id: string): Promise<PodcastProject | undefined> {
  const db = await openDb();
  const project = await new Promise<PodcastProject | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as PodcastProject | undefined);
    req.onerror = () => reject(req.error ?? new Error('Échec de la lecture du projet.'));
  });
  db.close();
  return project;
}

export async function listProjects(): Promise<PodcastProject[]> {
  const db = await openDb();
  const projects = await new Promise<PodcastProject[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as PodcastProject[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    req.onerror = () => reject(req.error ?? new Error('Échec de la lecture des projets.'));
  });
  db.close();
  return projects;
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
