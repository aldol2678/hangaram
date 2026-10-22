// 공개 저장소 경계 검사 (docs/decisions/ADR-0001-public-private-boundary.md).
// - 권리 확인 전 에셋 바이너리·글꼴 반입 금지 (assets/PUBLIC_ASSET_ALLOWLIST.json에 출처와 함께 등록된 것만 허용)
// - 비공개 WorldForge 소스 import 금지
// - 비밀값 형태 문자열 금지
// - 패키지는 private/UNLICENSED 유지, 런타임 의존성은 허용 목록만
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = path.relative(root, fileURLToPath(import.meta.url)).split(path.sep).join('/');
const failures = [];
const fail = (message) => failures.push(message);

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const files = [...new Set([...git('ls-files'), ...git('ls-files', '--others', '--exclude-standard')])].sort();

const allowlist = JSON.parse(await readFile(path.join(root, 'assets/PUBLIC_ASSET_ALLOWLIST.json'), 'utf8'));
const allowed = new Map(allowlist.files.map((entry) => [entry.path, entry]));
for (const entry of allowlist.files) {
  for (const field of ['path', 'source', 'rights', 'approvedBy']) if (!entry[field]) fail(`allowlist entry ${entry.path ?? '?'} missing ${field}`);
}

const BINARY_ASSET = /\.(glb|gltf|bin|fbx|obj|blend|ktx2|basis|png|jpe?g|webp|psd|kra|woff2?|ttf|otf|mp3|ogg|wav|mp4|webm|zip)$/i;
// QA 화면 캡처는 이 저장소 코드로 생성한 검증 증거이므로 qa/ 아래 PNG만 허용한다.
const GENERATED_EVIDENCE = /^qa\/[a-z0-9/_-]+\.png$/;
const SOURCE = /\.(m?js|cjs|json|html|css)$/i;
const PRIVATE_IMPORT = new RegExp(
  String.raw`(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"\x60][^'"\x60]*(?:aldol-worldforge|worldforge-korea/|worldforge-(?:schema|runtime-core|renderer-playcanvas))[^'"\x60]*['"\x60]`,
  'i',
);
const SECRET_PATTERNS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['AWS key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Anthropic/OpenAI style key', /\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}/],
  ['Vercel token', /\bvercel_[A-Za-z0-9]{20,}/i],
];

for (const file of files) {
  if (BINARY_ASSET.test(file) && !allowed.has(file) && !GENERATED_EVIDENCE.test(file)) fail(`binary asset not in allowlist: ${file}`);
  if (file === self || file === 'package-lock.json') continue;
  let text;
  try {
    text = await readFile(path.join(root, file), 'utf8');
  } catch {
    continue;
  }
  if (SOURCE.test(file) && PRIVATE_IMPORT.test(text)) fail(`private WorldForge import in ${file}`);
  for (const [name, pattern] of SECRET_PATTERNS) if (pattern.test(text)) fail(`${name} pattern in ${file}`);
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (pkg.private !== true) fail('package.json must stay private: true');
if (pkg.license !== 'UNLICENSED') fail('package.json license must stay UNLICENSED until an owner decision');
const RUNTIME_ALLOW = { playcanvas: 'MIT' };
const DEV_ALLOW = { esbuild: 'MIT' };
for (const [deps, allow, label] of [[pkg.dependencies ?? {}, RUNTIME_ALLOW, 'dependency'], [pkg.devDependencies ?? {}, DEV_ALLOW, 'devDependency']]) {
  for (const [name, version] of Object.entries(deps)) {
    if (!allow[name]) {
      fail(`${label} ${name} is not in the allowlist`);
      continue;
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`${label} ${name} must be pinned exactly (got ${version})`);
    try {
      const installed = JSON.parse(await readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
      if (installed.license !== allow[name]) fail(`${name} license ${installed.license} != ${allow[name]}`);
      if (installed.version !== version) fail(`${name} installed ${installed.version} != pinned ${version}`);
    } catch {
      fail(`${name} not installed; run npm ci`);
    }
  }
}

if (failures.length) {
  console.error(`hangaram boundary check FAIL\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`hangaram boundary check PASS · ${files.length} files scanned · allowlisted assets ${allowed.size}`);
