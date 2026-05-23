import { rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const scripts = [
  'AutoKiller',
  'AutoFisher',
  'AutoFlaxPicker',
  'AutoWoodcutter',
  'LumbyThievSuicide',
  'AutoWalker',
  'PathRecorder'
] as const;

const root = process.cwd();
const outputScriptsDir = path.join(root, 'scripts');

await rm(outputScriptsDir, { recursive: true, force: true });
await mkdir(outputScriptsDir, { recursive: true });

const result = await Bun.build({
  entrypoints: scripts.map(name => path.join(root, 'src/scripts', `${name}.ts`)),
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
