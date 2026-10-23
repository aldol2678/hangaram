// 브라우저 QA (선택 실행): dist/를 로컬에서 띄우고 Chromium 소프트웨어 WebGL2로 4개 화면 크기를 검사한다.
// Playwright는 프로젝트 의존성이 아니다. 전역 설치본을 쓰며, 없으면 SKIPPED(미검증)로 끝난다.
// 이 검사는 에뮬레이션이며 실기기 성능·장시간 안정성 검증이 아니다.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// QA_OUT으로 결과 폴더를 바꿀 수 있다 (기본 qa/m0). 이전 단계 기록을 덮어쓰지 않기 위함.
const outRel = (process.env.QA_OUT ?? 'qa/m0').replace(/\/+$/, '');
const outDir = path.join(root, outRel);

async function resolvePlaywright() {
  try {
    return await import('playwright');
  } catch {}
  for (const base of [process.env.PLAYWRIGHT_NODE_PATH, '/opt/node22/lib/node_modules'].filter(Boolean)) {
    try {
      return createRequire(path.join(base, 'noop.js'))('playwright');
    } catch {}
  }
  return null;
}

const playwright = await resolvePlaywright();
if (!playwright) {
  console.log('browser QA SKIPPED (not verified): playwright is not available');
  process.exit(0);
}

const VIEWPORTS = [
  { name: '320x740', width: 320, height: 740, mobile: true },
  { name: '390x844', width: 390, height: 844, mobile: true },
  { name: '844x390', width: 844, height: 390, mobile: true },
  { name: '1280x800', width: 1280, height: 800, mobile: false },
];

const server = await startServer(0);
const base = `http://127.0.0.1:${server.address().port}/?qa=1`;
const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const chromiumVersion = browser.version();
const results = [];
await mkdir(path.join(outDir, 'screens'), { recursive: true });

const rectsOverlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    const failedRequests = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('requestfailed', (r) => failedRequests.push(r.url()));
    page.on('response', (r) => r.status() >= 400 && failedRequests.push(`${r.status()} ${r.url()}`));
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__HANGARAM_PREVIEW__ && 'ready' in window.__HANGARAM_PREVIEW__, null, { timeout: 30000 });
    const ready = await page.evaluate(() => window.__HANGARAM_PREVIEW__.ready);
    await page.waitForTimeout(600);
    const before = await page.evaluate(() => window.__HANGARAM_PREVIEW__.snapshot());
    const layoutCheck = await page.evaluate(() => {
      const box = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      const controls = document.getElementById('controls');
      const items = controls.hidden ? [] : [...controls.querySelectorAll('[data-control]')].map((el) => ({ name: el.dataset.control, ...box(el) }));
      return {
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        verticalOverflow: document.documentElement.scrollHeight > window.innerHeight,
        controlsVisible: !controls.hidden,
        hud: box(document.getElementById('hud')),
        items,
        status: document.getElementById('status').textContent,
        focusLabel: document.getElementById('focus-label').textContent,
      };
    });
    const issues = [];
    if (!ready) issues.push('preview not ready');
    if (layoutCheck.horizontalOverflow) issues.push('horizontal overflow');
    if (layoutCheck.verticalOverflow) issues.push('vertical overflow');
    if (vp.mobile && !layoutCheck.controlsVisible) issues.push('touch controls hidden on mobile');
    for (const item of layoutCheck.items) {
      if (item.width < 44 || item.height < 44) issues.push(`${item.name} smaller than 44px`);
      if (rectsOverlap(item, layoutCheck.hud)) issues.push(`${item.name} overlaps HUD`);
    }
    for (let i = 0; i < layoutCheck.items.length; i++) {
      for (let j = i + 1; j < layoutCheck.items.length; j++) {
        if (rectsOverlap(layoutCheck.items[i], layoutCheck.items[j])) issues.push(`${layoutCheck.items[i].name} overlaps ${layoutCheck.items[j].name}`);
      }
    }

    // 입력 검사: 모바일은 실제 동시 터치(스틱 유지 + 점프·달리기), 데스크톱은 키보드.
    let input = {};
    if (vp.mobile) {
      const cdp = await context.newCDPSession(page);
      const { stick, buttons } = before.layout;
      // CDP: touchStart는 활성 접점 전체(새 접점 시작), touchEnd는 떼는 접점만 넘긴다.
      const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      const pointers = async () => (await page.evaluate(() => window.__HANGARAM_PREVIEW__.snapshot())).activePointers;
      const stickPoint = { x: stick.cx, y: stick.cy - stick.r * 0.9, id: 1 };
      const jumpPoint = { x: buttons.jump.x + buttons.jump.w / 2, y: buttons.jump.y + buttons.jump.h / 2, id: 2 };
      const runPoint = { x: buttons.run.x + buttons.run.w / 2, y: buttons.run.y + buttons.run.h / 2, id: 3 };
      const sequence = [];
      await touch('touchStart', [stickPoint]);
      await page.waitForTimeout(100);
      sequence.push(['stick down', await pointers()]);
      await touch('touchStart', [stickPoint, runPoint]);
      await page.waitForTimeout(60);
      sequence.push(['run down (stick held)', await pointers()]);
      await touch('touchEnd', [runPoint]);
      await page.waitForTimeout(60);
      sequence.push(['run up (stick held)', await pointers()]);
      await touch('touchStart', [stickPoint, jumpPoint]);
      await page.waitForTimeout(60);
      sequence.push(['jump down (stick held)', await pointers()]);
      await touch('touchEnd', [jumpPoint]);
      await page.waitForTimeout(700);
      sequence.push(['jump up (stick held)', await pointers()]);
      const toastVisible = await page.evaluate(() => !document.getElementById('toast').hidden);
      const toast = await page.evaluate(() => {
        const r = document.getElementById('toast').getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      if (rectsOverlap(toast, layoutCheck.hud)) issues.push('toast overlaps HUD');
      for (const item of layoutCheck.items) if (rectsOverlap(toast, item)) issues.push(`toast overlaps ${item.name}`);
      await touch('touchEnd', [stickPoint]);
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => window.__HANGARAM_PREVIEW__.snapshot());
      sequence.push(['stick up', after.activePointers]);
      const moved = Math.hypot(after.focus[0] - before.focus[0], after.focus[1] - before.focus[1]);
      input = { kind: 'cdp-multitouch', moved: Number(moved.toFixed(3)), activePointers: sequence, runToggled: after.running, jumpFeedbackShown: toastVisible };
      if (JSON.stringify(sequence.map(([, n]) => n)) !== JSON.stringify([1, 2, 1, 2, 1, 0])) issues.push(`unexpected pointer sequence ${JSON.stringify(sequence)}`);
      if (!(moved > 1)) issues.push('stick did not move focus while held');
      if (!after.running) issues.push('run toggle did not register during stick hold');
      if (!toastVisible) issues.push('jump during stick hold gave no feedback');
      // 정보 패널을 펼쳐도 HUD가 조작 영역을 가리지 않아야 한다.
      await page.tap('#info-toggle');
      const expanded = await page.evaluate(() => {
        const r = document.getElementById('hud').getBoundingClientRect();
        return { open: !document.getElementById('info').hidden, hud: { x: r.x, y: r.y, width: r.width, height: r.height } };
      });
      if (!expanded.open) issues.push('info toggle did not open');
      for (const item of layoutCheck.items) if (rectsOverlap(expanded.hud, item)) issues.push(`expanded HUD overlaps ${item.name}`);
      await page.tap('#info-toggle');
      input.infoPanel = expanded;
    } else {
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
      const toast = await page.evaluate(() => {
        const r = document.getElementById('toast').getBoundingClientRect();
        return { visible: !document.getElementById('toast').hidden, x: r.x, y: r.y, width: r.width, height: r.height };
      });
      if (!toast.visible) issues.push('Space gave no preview feedback');
      if (rectsOverlap(toast, layoutCheck.hud)) issues.push('toast overlaps HUD');
      await page.mouse.click(vp.width / 2, vp.height * 0.75);
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(700);
      await page.keyboard.up('KeyW');
      await page.keyboard.press('KeyM');
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => window.__HANGARAM_PREVIEW__.snapshot());
      const moved = Math.hypot(after.focus[0] - before.focus[0], after.focus[1] - before.focus[1]);
      input = { kind: 'keyboard', moved: Number(moved.toFixed(3)), northward: after.focus[1] < before.focus[1], overview: after.overview };
      if (!(moved > 1) || !input.northward) issues.push('W did not move focus north');
      if (!after.overview) issues.push('M did not toggle overview');
    }

    // 2026 시대팩: 예약 셀만 있고 블록아웃이 없어야 한다.
    await page.evaluate(() => window.__HANGARAM_PREVIEW__.setEra('modern-2026'));
    const modern = await page.evaluate(() => window.__HANGARAM_PREVIEW__.snapshot());
    if (modern.chunks.some((c) => c.status !== 'reserved' || c.loadable)) issues.push('2026 pack shows non-reserved content');
    await page.evaluate(() => window.__HANGARAM_PREVIEW__.setEra('joseon-1792'));
    await page.waitForTimeout(300);

    const screenshot = `${outRel}/screens/${vp.name}.png`;
    await page.screenshot({ path: path.join(root, screenshot) });
    if (errors.length) issues.push(...errors.map((e) => `page error: ${e}`));
    if (failedRequests.length) issues.push(...failedRequests.map((r) => `request failed: ${r}`));
    results.push({
      viewport: vp.name,
      mobile: vp.mobile,
      result: issues.length ? 'FAIL' : 'PASS',
      issues,
      backend: before.backend,
      isWebGL2: before.isWebGL2,
      era: before.era,
      summary: before.summary,
      modernSummary: modern.summary,
      input,
      layout: layoutCheck,
      screenshot,
    });
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const report = {
  check: 'hangaram-preview-browser-qa',
  scope: 'Local Chromium headless, SwiftShader software WebGL2, device emulation. Not a physical-device or long-session test.',
  chromium: chromiumVersion,
  result: results.every((r) => r.result === 'PASS') ? 'PASS' : 'FAIL',
  results,
};
await writeFile(path.join(outDir, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const r of results) console.log(`${r.result}  ${r.viewport}  ${r.backend}  ${r.issues.join('; ')}`);
console.log(`browser QA ${report.result}`);
process.exit(report.result === 'PASS' ? 0 : 1);
