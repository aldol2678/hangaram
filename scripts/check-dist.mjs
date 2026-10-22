// dist 무결성·공개 범위 검사. build-manifest의 크기·해시, 제3자 고지, 금지 파일 유형, 비공개 경로 흔적을 확인한다.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const failures = [];
const fail = (message) => failures.push(message);

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(path.relative(dist, full).split(path.sep).join('/'));
  }
  return files;
}

const manifest = JSON.parse(await readFile(path.join(dist, 'build-manifest.json'), 'utf8'));
const listed = new Set(manifest.files.map((f) => f.path));
const actual = (await walk(dist)).filter((f) => f !== 'build-manifest.json');
for (const file of actual) if (!listed.has(file)) fail(`unlisted file in dist: ${file}`);
for (const entry of manifest.files) {
  let bytes;
  try {
    bytes = await readFile(path.join(dist, entry.path));
  } catch {
    fail(`missing ${entry.path}`);
    continue;
  }
  if (bytes.length !== entry.bytes) fail(`${entry.path}: size ${bytes.length} != ${entry.bytes}`);
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) fail(`${entry.path}: sha256 mismatch`);
}

for (const required of ['index.html', 'app.js', 'preview.css', 'THIRD_PARTY_NOTICES.txt', 'worldpacks/index.json', 'worldpacks/places.json']) {
  if (!listed.has(required)) fail(`required file missing: ${required}`);
}
const notices = await readFile(path.join(dist, 'THIRD_PARTY_NOTICES.txt'), 'utf8');
if (!/playcanvas \d+\.\d+\.\d+ \(MIT\)/.test(notices) || !notices.includes('Permission is hereby granted')) fail('THIRD_PARTY_NOTICES lacks full PlayCanvas MIT text');

// 공개 배포물에 에셋 바이너리·글꼴이 섞이지 않게 한다 (M0는 primitive만 사용).
const forbidden = /\.(glb|gltf|bin|fbx|obj|blend|png|jpe?g|webp|ktx2|basis|woff2?|ttf|otf|mp3|ogg|wav)$/i;
for (const file of actual) if (forbidden.test(file)) fail(`binary asset in dist: ${file}`);

const app = await readFile(path.join(dist, 'app.js'), 'utf8');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('src="app.js"')) fail('index.html does not load app.js');
// 비공개 WorldForge 소스 경로가 번들에 들어오면 실패.
for (const marker of ['worldforge-renderer-playcanvas', 'worldforge-runtime-core', 'worldforge-schema', 'worldforge-korea/src']) {
  if (app.includes(marker)) fail(`private source marker in app.js: ${marker}`);
}

if (failures.length) {
  console.error(`hangaram dist check FAIL\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
const appEntry = manifest.files.find((f) => f.path === 'app.js');
console.log(`hangaram dist check PASS · ${manifest.files.length} files · app.js ${appEntry.bytes} bytes sha256 ${appEntry.sha256}`);
