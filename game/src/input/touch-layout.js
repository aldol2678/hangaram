// 모바일 우선 터치 배치. 화면 크기와 safe-area만으로 조작 영역을 계산하는 순수 함수다.
// 규칙: 모든 조작 44px 이상, 점프 72px 이상, 서로 겹치지 않음, safe-area 안쪽, 상단 HUD 띠와 분리.
// 왼손 = 이동 스틱(좌하단), 오른손 = 점프·달리기·상호작용(우하단 엄지 호), 지도 = 우상단.

export const MIN_TOUCH = 44;
export const MIN_JUMP = 72;
const EDGE = 16;
const GAP = 12;

const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const rect = (x, y, w, h) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });

/**
 * @param {{width: number, height: number, safe?: {top?: number, right?: number, bottom?: number, left?: number}}} viewport
 */
export function computeTouchLayout({ width, height, safe = {} }) {
  const inset = { top: safe.top ?? 0, right: safe.right ?? 0, bottom: safe.bottom ?? 0, left: safe.left ?? 0 };
  const orientation = width >= height ? 'landscape' : 'portrait';
  const short = Math.min(width, height);
  const bottomGap = orientation === 'portrait' ? 24 : 16;
  const jumpSize = short < 360 ? 72 : 80;
  const actionSize = short < 360 ? 56 : 60;
  const stickRadius = clamp(short * 0.17, 52, 72);

  const right = width - inset.right - EDGE;
  const bottom = height - inset.bottom - bottomGap;
  const jump = rect(right - jumpSize, bottom - jumpSize, jumpSize, jumpSize);
  // 엄지 호: 달리기는 점프 왼쪽에서 조금 낮게, 상호작용은 점프 위.
  const run = rect(jump.x - GAP - actionSize, jump.y + jumpSize - actionSize, actionSize, actionSize);
  const interact = rect(jump.x + (jumpSize - actionSize) / 2, jump.y - GAP - actionSize, actionSize, actionSize);
  const map = rect(right - 48, inset.top + EDGE, 48, 48);
  const stick = {
    cx: Math.round(inset.left + EDGE + stickRadius),
    cy: Math.round(bottom - stickRadius),
    r: Math.round(stickRadius),
  };
  const hudHeight = 56;
  const hud = rect(inset.left + EDGE, inset.top + EDGE, Math.max(0, map.x - GAP - inset.left - EDGE), hudHeight);
  return { orientation, viewport: { width, height }, safe: inset, stick, buttons: { jump, run, interact, map }, hud };
}

const stickRect = (s) => ({ x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 });
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** 배치 규칙 위반 목록. 빈 배열이면 통과. */
export function validateTouchLayout(layout) {
  const issues = [];
  const { width, height } = layout.viewport;
  const { safe } = layout;
  const regions = { stick: stickRect(layout.stick), ...layout.buttons, hud: layout.hud };
  for (const [name, r] of Object.entries(regions)) {
    if (name !== 'hud' && (r.w < MIN_TOUCH || r.h < MIN_TOUCH)) issues.push(`${name}: smaller than ${MIN_TOUCH}px`);
    if (r.x < safe.left || r.y < safe.top || r.x + r.w > width - safe.right || r.y + r.h > height - safe.bottom) {
      issues.push(`${name}: outside safe area`);
    }
  }
  if (layout.buttons.jump.w < MIN_JUMP || layout.buttons.jump.h < MIN_JUMP) issues.push(`jump: smaller than ${MIN_JUMP}px`);
  const names = Object.keys(regions);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (overlaps(regions[names[i]], regions[names[j]])) issues.push(`${names[i]} overlaps ${names[j]}`);
    }
  }
  return issues;
}

/** 화면 좌표가 어느 조작에 해당하는지. 스틱은 원 판정에 여유 반경을 둔다. */
export function hitTestLayout(layout, x, y) {
  const { stick, buttons } = layout;
  if (Math.hypot(x - stick.cx, y - stick.cy) <= stick.r * 1.25) return 'stick';
  for (const [name, r] of Object.entries(buttons)) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return name;
  }
  return null;
}
