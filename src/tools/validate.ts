import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'manifest.json');

if (!existsSync(manifestPath)) {
  throw new Error('manifest.json does not exist. Run bun run build first.');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
  scripts?: { name?: string; moduleUrl?: string; exportName?: string }[];
};

if (!Array.isArray(manifest.scripts) || manifest.scripts.length === 0) {
  throw new Error('manifest has no scripts');
}

for (const script of manifest.scripts) {
  if (!script.name || !script.moduleUrl) {
    throw new Error(`invalid manifest entry: ${JSON.stringify(script)}`);
  }
  const modulePath = path.join(root, script.moduleUrl.replace(/^\.\//, ''));
  if (!existsSync(modulePath)) {
    throw new Error(`missing module for ${script.name}: ${modulePath}`);
  }
  const mod = await import(`${path.toNamespacedPath(modulePath)}?cacheBust=${Date.now()}`);
  const exported = mod[script.exportName ?? 'default'];
  if (typeof exported !== 'function') {
    throw new Error(`${script.name} does not export a constructor`);
  }
}

console.log(`Validated ${manifest.scripts.length} script modules.`);
