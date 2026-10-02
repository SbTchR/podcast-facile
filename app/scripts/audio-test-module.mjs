import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const modules = new Map();
export async function typescriptModuleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  const request = (async () => {
    let code = stripTypeScriptTypes(await readFile(url, 'utf8'));
    for (const match of [...code.matchAll(/from\s+(['"])(\.[^'"]+)\1/g)]) {
      const dependency = new URL(match[2].endsWith('.ts') ? match[2] : `${match[2]}.ts`, url);
      code = code.replace(match[0], `from ${JSON.stringify(await typescriptModuleUrl(dependency))}`);
    }
    return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  })();
  modules.set(url.href, request);
  return request;
}
export async function loadAudioEngine() {
  return import(await typescriptModuleUrl(new URL('../src/audio/engine.ts', import.meta.url)));
}
