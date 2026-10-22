// 한가람 공통 좌표계 (hangaram.local/v1).
// 모든 시대팩이 같은 로컬 게임 좌표를 공유한다. 단위 m, +x = 동쪽, +z = 남쪽,
// 원점 = 중심 시장 청크 중심. WorldForge KOREA 프로토타입의 축 규약과 같다.
// 게임용 도식 좌표이며 GIS 경위도나 역사 실측 좌표가 아니다.

export const COORDINATE_SYSTEM = 'hangaram.local/v1';
export const CHUNK_SIZE = 64;
export const AXIS = Object.freeze({ x: 'east', z: 'south', unit: 'metre', georeferenced: false });

const HALF = CHUNK_SIZE / 2;
const CELL_KEY = /^(-?\d+):(-?\d+)$/;

export const isFinitePoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

/** (col,row) 셀 키. col 0 = X[-32,32), row 0 = Z[-32,32). */
export const cellKey = (col, row) => `${col}:${row}`;

export function parseCellKey(key) {
  const match = typeof key === 'string' ? CELL_KEY.exec(key) : null;
  if (!match) return null;
  const col = Number(match[1]);
  const row = Number(match[2]);
  // "-0" 같은 비정규 표기는 같은 셀이 두 키를 갖게 하므로 거부한다.
  return cellKey(col, row) === key ? { col, row } : null;
}

/** 점이 속한 셀. 경계는 반열림 구간 [min,max)으로 동쪽·남쪽 셀에 속한다. */
export function cellOf(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { col: Math.floor((x + HALF) / CHUNK_SIZE), row: Math.floor((z + HALF) / CHUNK_SIZE) };
}

export function cellBounds(col, row) {
  return {
    min: [col * CHUNK_SIZE - HALF, row * CHUNK_SIZE - HALF],
    max: [col * CHUNK_SIZE + HALF, row * CHUNK_SIZE + HALF],
  };
}

export function boundsOfCellKey(key) {
  const cell = parseCellKey(key);
  return cell ? cellBounds(cell.col, cell.row) : null;
}

/** 닫힌 구간 포함 검사. 청크 경계 위의 점은 양쪽 청크 모두에 포함된다. */
export const containsPoint = (bounds, [x, z]) =>
  x >= bounds.min[0] && x <= bounds.max[0] && z >= bounds.min[1] && z <= bounds.max[1];

/** 내부가 겹치는지 검사. 변을 맞댄 인접 청크는 겹치지 않는다. */
export const boundsOverlap = (a, b) =>
  a.min[0] < b.max[0] && b.min[0] < a.max[0] && a.min[1] < b.max[1] && b.min[1] < a.max[1];

/** 두 셀이 변을 공유하는지 검사 (대각선 제외). */
export function cellsAdjacent(keyA, keyB) {
  const a = parseCellKey(keyA);
  const b = parseCellKey(keyB);
  if (!a || !b) return false;
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
}

/** 여러 셀을 감싸는 외곽 사각형. */
export function unionBounds(list) {
  if (!list.length) return null;
  return {
    min: [Math.min(...list.map((b) => b.min[0])), Math.min(...list.map((b) => b.min[1]))],
    max: [Math.max(...list.map((b) => b.max[0])), Math.max(...list.map((b) => b.max[1]))],
  };
}
