import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(scriptDir, '../src/App.tsx');
const enginePath = path.resolve(scriptDir, '../src/audio/engine.ts');

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Correctif introuvable : ${label}`);
  }
  return source.replace(before, after);
}

let app = fs.readFileSync(appPath, 'utf8');

app = replaceRequired(
  app,
  `function cloneProject(project: PodcastProject): PodcastProject {\n  return structuredClone(project);\n}`,
  `function cloneBlock(block: PodcastBlock): PodcastBlock {\n  return {\n    ...block,\n    background: block.background ? { ...block.background } : undefined,\n    jingle: block.jingle ? { ...block.jingle } : undefined,\n  };\n}\n\nfunction cloneProject(project: PodcastProject): PodcastProject {\n  return {\n    ...project,\n    sections: project.sections.map((section) => ({ ...section })),\n    blocks: project.blocks.map(cloneBlock),\n    assets: project.assets.map((asset) => ({ ...asset, blob: asset.blob })),\n  };\n}`,
  'copie Safari des projets',
);

app = replaceRequired(
  app,
  `              onPlay={(block) => {\n                const entry = timeline.find((item) => item.block.id === block.id);\n                if (entry) void beginPlayback(entry.start);\n              }}`,
  `              onPlay={(block) => {\n                const previewProject = { ...project, blocks: [block] };\n                stopPlayback();\n                void playProject(previewProject, 0).then((controller) => {\n                  playbackRef.current = controller;\n                  setElapsed(0);\n                  setActiveBlockId(block.id);\n                  setPlaybackStatus('playing');\n                  window.setTimeout(() => stopPlayback(), (controller.totalDuration + 0.25) * 1000);\n                }).catch((error) => {\n                  setToast(error instanceof Error ? error.message : 'Impossible de lire cet élément.');\n                  stopPlayback();\n                });\n              }}`,
  'lecture isolée des blocs',
);

app = replaceRequired(
  app,
  `              onEdit={(block) => { setEditingBlock(cloneProject({ ...project, blocks: [block] } as PodcastProject).blocks[0]); setEditingIsNew(false); }}`,
  `              onEdit={(block) => { setEditingBlock(cloneBlock(block)); setEditingIsNew(false); }}`,
  'édition sans structuredClone',
);

app = replaceRequired(
  app,
  `                const copy = structuredClone(block);`,
  `                const copy = cloneBlock(block);`,
  'duplication sans structuredClone',
);

app = replaceRequired(
  app,
  `          onPreview={async (block) => {\n            const previewProject = { ...project, blocks: [block] };\n            try {\n              stopPlayback();\n              const controller = await playProject(previewProject, 0);\n              playbackRef.current = controller;\n              setPlaybackStatus('playing');\n              window.setTimeout(() => void stopPlayback(), (getBlockDuration(block) + 0.2) * 1000);\n            } catch (error) {\n              setToast(error instanceof Error ? error.message : 'Impossible de lire cet élément.');\n            }\n          }}`,
  `          onPreview={(block) => {\n            const previewProject = { ...project, blocks: [block] };\n            stopPlayback();\n            void playProject(previewProject, 0).then((controller) => {\n              playbackRef.current = controller;\n              setElapsed(0);\n              setActiveBlockId(block.id);\n              setPlaybackStatus('playing');\n              window.setTimeout(() => stopPlayback(), (controller.totalDuration + 0.25) * 1000);\n            }).catch((error) => {\n              setToast(error instanceof Error ? error.message : 'Impossible de lire cet élément.');\n              stopPlayback();\n            });\n          }}`,
  'aperçu isolé dans la fenêtre',
);

if (app.includes('structuredClone(')) {
  throw new Error('Un appel à structuredClone subsiste dans App.tsx.');
}

fs.writeFileSync(appPath, app);

let engine = fs.readFileSync(enginePath, 'utf8');

engine = replaceRequired(
  engine,
  `async function decodeAsset(context: RenderContext, asset: AudioAsset, cache: Map<string, AudioBuffer>): Promise<AudioBuffer> {\n  const cached = cache.get(asset.id);\n  if (cached) return cached;\n  const buffer = await context.decodeAudioData(await asset.blob.arrayBuffer());\n  cache.set(asset.id, buffer);\n  return buffer;\n}`,
  `async function decodeAsset(context: RenderContext, asset: AudioAsset, cache: Map<string, AudioBuffer>): Promise<AudioBuffer> {\n  const cached = cache.get(asset.id);\n  if (cached) return cached;\n  if (!(asset.blob instanceof Blob)) {\n    throw new Error(\`Le fichier audio « \${asset.name} » n’est plus lisible. Réimporte ce son dans le projet.\`);\n  }\n  try {\n    const original = await asset.blob.arrayBuffer();\n    const copy = original.slice(0);\n    const buffer = await context.decodeAudioData(copy);\n    cache.set(asset.id, buffer);\n    return buffer;\n  } catch (error) {\n    const detail = error instanceof Error ? error.message : 'format non reconnu';\n    throw new Error(\`Impossible de décoder « \${asset.name} » : \${detail}\`);\n  }\n}`,
  'décodage audio Safari',
);

engine = replaceRequired(
  engine,
  `function referencedAssetIds(project: PodcastProject): Set<string> {\n  const ids = new Set<string>();\n  for (const block of project.blocks) {`,
  `function referencedAssetIds(project: PodcastProject, offset = 0): Set<string> {\n  const ids = new Set<string>();\n  const blocks = getTimeline(project).filter((entry) => entry.end > offset).map((entry) => entry.block);\n  for (const block of blocks) {`,
  'sélection des fichiers à décoder',
);

engine = replaceRequired(
  engine,
  `async function decodeProjectAssets(context: RenderContext, project: PodcastProject): Promise<Map<string, AudioBuffer>> {\n  const cache = new Map<string, AudioBuffer>();\n  const ids = referencedAssetIds(project);`,
  `async function decodeProjectAssets(context: RenderContext, project: PodcastProject, offset = 0): Promise<Map<string, AudioBuffer>> {\n  const cache = new Map<string, AudioBuffer>();\n  const ids = referencedAssetIds(project, offset);`,
  'décodage limité à la position de lecture',
);

engine = replaceRequired(
  engine,
  `    const cache = await decodeProjectAssets(context, project);`,
  `    const cache = await decodeProjectAssets(context, project, offset);`,
  'appel du décodage limité',
);

fs.writeFileSync(enginePath, engine);
console.log('Correctifs Safari et aperçus audio appliqués.');
