// 한가람 블록아웃 미리보기 진입점 (모바일 우선 셸).
// 저장소는 읽어서 감지 결과만 표시하고 쓰지 않는다. 시대 선택은 데이터 보기이며 게임 내 시대 전환이 아니다.

import { cellBounds, cellKey, cellOf, unionBounds } from '../core/world-grid.js';
import { loadWorldpacks } from '../era/registry.js';
import { STATUS_SHORT_LABELS } from '../era/era-pack.js';
import { ERA_TRANSITION_ENABLED } from '../era/transition.js';
import { openEraSession } from '../engine/session.js';
import { createIntentBuffer } from '../input/intents.js';
import { createPointerRouter } from '../input/pointer-router.js';
import { computeTouchLayout, hitTestLayout } from '../input/touch-layout.js';
import { loadSave } from '../save/storage.js';
import { createPlayCanvasPreviewHost } from './playcanvas-host.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const qa = params.get('qa') === '1';
const status = $('status');
const toast = $('toast');
let toastTimer = null;

function say(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 2800);
}

function describeSave() {
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    return '저장소 사용 불가';
  }
  const result = loadSave(storage, { now: Date.now() });
  const labels = {
    new: '저장 없음',
    loaded: '한가람 저장 v1 감지',
    migrated: '이전 한가람 저장 감지 (마이그레이션 필요)',
    'imported-legacy': 'KOREA 저장 감지 · 원본 보존',
    corrupt: '손상된 저장 감지 · 덮어쓰지 않음',
    'read-only': '읽을 수 없는 저장 · 덮어쓰지 않음',
  };
  return `${labels[result.status]} · 미리보기는 저장하지 않음`;
}

async function main() {
  const registry = await loadWorldpacks(async (path) => {
    const response = await fetch(`worldpacks/${path}`);
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  });
  // 미리보기 이동 범위: 3열×4행 계획 격자 + 남쪽 강변 한 줄.
  const bounds = unionBounds([cellBounds(-1, -2), cellBounds(1, 2)]);
  const preview = createPlayCanvasPreviewHost($('game'), { bounds });
  const intents = createIntentBuffer();
  let session = null;

  const eraSelect = $('era');
  for (const eraId of registry.eras) {
    const option = document.createElement('option');
    option.value = eraId;
    option.textContent = registry.pack(eraId).label;
    eraSelect.append(option);
  }
  eraSelect.value = registry.defaultEra;

  async function showEra(eraId) {
    await session?.close();
    session = await openEraSession({ registry, host: preview.host, eraId });
    const pack = registry.pack(eraId);
    const counts = Object.entries(session.summary.byStatus).map(([s, n]) => `${STATUS_SHORT_LABELS[s]} ${n}`).join(' · ');
    $('era-note').textContent = `${pack.disclaimer}${ERA_TRANSITION_ENABLED ? '' : ' 이 화면은 데이터 검수용이다. 실제 시대 전환은 비공개 HG-02 통합 런타임에서 제공한다.'}`;
    $('legend').textContent = `청크 ${session.summary.total} (${counts})`;
  }
  eraSelect.addEventListener('change', () => showEra(eraSelect.value));
  await showEra(registry.defaultEra);
  preview.host.setFocus({ position: [...registry.place('mapo.market').anchor], yaw: 0 });

  // 터치 조작: 배치는 순수 함수로 계산해 DOM에 적용한다.
  const controls = $('controls');
  const coarse = matchMedia('(pointer: coarse)').matches || params.get('touch') === '1';
  controls.hidden = !coarse;

  // 보조 정보는 넓은 데스크톱에서만 기본으로 펼친다.
  const infoToggle = $('info-toggle');
  const setInfo = (open) => {
    infoToggle.setAttribute('aria-expanded', String(open));
    $('info').hidden = !open;
  };
  setInfo(!coarse && innerWidth >= 900);
  infoToggle.addEventListener('click', () => setInfo(infoToggle.getAttribute('aria-expanded') !== 'true'));
  let layout = null;
  const safeInsets = () => {
    const style = getComputedStyle(document.documentElement);
    const read = (name) => Number.parseFloat(style.getPropertyValue(name)) || 0;
    return { top: read('--safe-top'), right: read('--safe-right'), bottom: read('--safe-bottom'), left: read('--safe-left') };
  };
  const place = (el, r) => Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  function applyLayout() {
    layout = computeTouchLayout({ width: innerWidth, height: innerHeight, safe: safeInsets() });
    const { stick, buttons } = layout;
    place($('stick'), { x: stick.cx - stick.r, y: stick.cy - stick.r, w: stick.r * 2, h: stick.r * 2 });
    for (const [name, r] of Object.entries(buttons)) place(controls.querySelector(`[data-control="${name}"]`), r);
    document.body.dataset.orientation = layout.orientation;
  }
  applyLayout();
  window.addEventListener('resize', applyLayout);

  const knob = $('stick-knob');
  const router = createPointerRouter({
    hitTest: (x, y) => (controls.hidden ? null : hitTestLayout(layout, x, y)),
    stickCenter: () => layout.stick,
    intents,
    onStick: (v) => {
      const r = layout.stick.r * 0.6;
      knob.style.transform = `translate(${v.x * r}px, ${-v.forward * r}px)`;
    },
  });
  // 키보드
  const editing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  window.addEventListener('keydown', (ev) => {
    if (editing()) return;
    if (intents.key(ev.code, true, { repeat: ev.repeat })) ev.preventDefault();
  });
  window.addEventListener('keyup', (ev) => intents.key(ev.code, false));
  const release = () => router.cancelAll();
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => document.hidden && release());

  const pointer = (ev) => ({ pointerId: ev.pointerId, x: ev.clientX, y: ev.clientY });
  controls.addEventListener('pointerdown', (ev) => {
    const control = router.down(pointer(ev));
    if (!control) return;
    ev.preventDefault();
    try {
      ev.target.setPointerCapture?.(ev.pointerId);
    } catch {}
    if (control === 'run') controls.querySelector('[data-control="run"]').setAttribute('aria-pressed', String(intents.running));
  });
  controls.addEventListener('pointermove', (ev) => router.move(pointer(ev)) && ev.preventDefault());
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) controls.addEventListener(type, (ev) => router.up(pointer(ev)));
  // 키보드로 누른 버튼(click detail 0)만 처리한다. 터치는 pointerdown에서 이미 실행했다.
  controls.addEventListener('click', (ev) => {
    const control = ev.target.closest('[data-control]')?.dataset.control;
    if (control && ev.detail === 0) intents.press(control);
  });
  controls.addEventListener('contextmenu', (ev) => ev.preventDefault());

  // 카메라: 조작 영역 밖 드래그 = 회전, 휠 = 확대/축소.
  const canvas = $('game');
  const drags = new Map();
  canvas.addEventListener('pointerdown', (ev) => {
    drags.set(ev.pointerId, [ev.clientX, ev.clientY]);
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {}
  });
  canvas.addEventListener('pointermove', (ev) => {
    const last = drags.get(ev.pointerId);
    if (!last || drags.size !== 1) return;
    preview.orbit(-(ev.clientX - last[0]) * 0.006, (ev.clientY - last[1]) * 0.25);
    drags.set(ev.pointerId, [ev.clientX, ev.clientY]);
  });
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, (ev) => drags.delete(ev.pointerId));
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    preview.zoom(ev.deltaY > 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });

  // 프레임 루프
  const label = $('focus-label');
  const labels = $('labels');
  let lastLabelUpdate = 0;
  preview.app.on('update', (dt) => {
    const frame = intents.consume();
    if (frame.jump || frame.interact) say('미리보기에는 점프·상호작용이 없어. 게임 동작은 WorldForge 런타임에서 확인해.');
    if (frame.cancel) say('취소할 작업이 없어. (미리보기)');
    preview.host.frame(frame, Math.min(dt, 0.1));
    const snap = preview.host.snapshot();
    const { col, row } = cellOf(...snap.focus);
    const d = session?.descriptors.find((c) => c.cell === cellKey(col, row));
    label.textContent = d ? `${d.name} — ${d.statusLabel}${d.plannedIn ? ` · ${d.plannedIn}` : ''}` : '계획 격자 밖 · 강변 장식 영역';
    const now = performance.now();
    if (now - lastLabelUpdate > 120) {
      lastLabelUpdate = now;
      labels.replaceChildren(...preview.projectLabels().map((item) => {
        const el = document.createElement('span');
        el.className = `chunk-label status-${item.status}`;
        el.textContent = item.name;
        el.style.transform = `translate(${Math.round(item.x)}px, ${Math.round(item.y)}px) translate(-50%, -50%)`;
        return el;
      }));
    }
  });

  preview.start();
  const snap = preview.host.snapshot();
  status.textContent = `PlayCanvas ${snap.backend.toUpperCase()} · 블록아웃 미리보기 (게임 런타임 아님) · ${describeSave()}`;
  if (qa) {
    window.__HANGARAM_PREVIEW__ = Object.freeze({
      ready: true,
      snapshot: () => ({ ...preview.host.snapshot(), layout, era: session?.eraId, summary: session?.summary, running: intents.running, activePointers: router.activePointers }),
      setEra: (eraId) => {
        eraSelect.value = eraId;
        return showEra(eraId);
      },
    });
  }
}

main().catch((error) => {
  status.textContent = `미리보기를 시작하지 못했어: ${error.message}`;
  status.dataset.error = 'true';
  $('info').hidden = false;
  if (qa) window.__HANGARAM_PREVIEW__ = Object.freeze({ ready: false, error: String(error) });
});
