// 정적 미리보기 빌드: game/ → dist/
// app.js(esbuild 번들), index.html, preview.css, worldpacks JSON, 제3자 고지, build-manifest.json(SHA-256).
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const game = path.join(root, 'game');
const out = path.join(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: [path.join(game, 'src/preview/main.js')],
  outfile: path.join(out, 'app.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  // PlayCanvas 워커 소스의 `self || require("node:worker_threads")`는 브라우저에서 self 쪽으로 끝나므로
  // Node 전용 모듈을 번들하지 않고 바깥 참조로 둔다.
  external: ['node:worker_threads'],
  legalComments: 'none',
  logLevel: 'warning',
});

await cp(path.join(game, 'index.html'), path.join(out, 'index.html'));
await cp(path.join(game, 'preview.css'), path.join(out, 'preview.css'));
await cp(path.join(game, 'worldpacks'), path.join(out, 'worldpacks'), { recursive: true, filter: (src) => !src.endsWith('.md') });

// 번들에 포함되는 런타임 의존성은 playcanvas 하나다. 전체 라이선스 원문을 함께 배포한다.
const pcPackage = JSON.parse(await readFile(path.join(root, 'node_modules/playcanvas/package.json'), 'utf8'));
const pcLicense = await readFile(path.join(root, 'node_modules/playcanvas/LICENSE'), 'utf8');
await writeFile(
  path.join(out, 'THIRD_PARTY_NOTICES.txt'),
  [
    'Third-party software bundled in app.js',
    '',
    `playcanvas ${pcPackage.version} (${pcPackage.license}) — https://github.com/playcanvas/engine`,
    '',
    pcLicense.trim(),
    '',
  ].join('\n'),
);

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}
const files = [];
for (const file of (await walk(out)).sort()) {
  const bytes = await readFile(file);
  files.push({ path: path.relative(out, file).split(path.sep).join('/'), bytes: (await stat(file)).size, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(path.join(out, 'build-manifest.json'), `${JSON.stringify({ name: 'hangaram-preview', version: JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version, files }, null, 2)}\n`);
const app = files.find((f) => f.path === 'app.js');
console.log(`hangaram preview build OK · ${files.length} files · app.js ${app.bytes} bytes sha256 ${app.sha256}`);
