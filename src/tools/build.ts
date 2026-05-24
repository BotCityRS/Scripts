import { readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceScriptsDir = path.join(root, 'src/scripts');
const outputScriptsDir = path.join(root, 'scripts');
const scripts = (await readdir(sourceScriptsDir, { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'))
  .map(entry => path.basename(entry.name, '.ts'))
  .sort((a, b) => a.localeCompare(b));

if (scripts.length === 0) {
  throw new Error(`No script files found in ${sourceScriptsDir}`);
}

await rm(outputScriptsDir, { recursive: true, force: true });
await mkdir(outputScriptsDir, { recursive: true });

const result = await Bun.build({
  entrypoints: scripts.map(name => path.join(sourceScriptsDir, `${name}.ts`)),
  outdir: root,
  target: 'browser',
  format: 'esm',
  splitting: false,
  sourcemap: 'external',
  minify: false,
  naming: {
    entry: 'scripts/[name].[ext]',
    chunk: 'chunks/[name]-[hash].[ext]',
    asset: 'assets/[name]-[hash].[ext]'
  }
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const manifest = {
  schemaVersion: 2,
  scripts: scripts.map(name => ({
    name,
    moduleUrl: `./scripts/${name}.js`,
    exportName: 'default'
  }))
};

await writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}
`);
console.log(`Built ${scripts.length} scripts into ${root}`);
