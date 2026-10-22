// 블록아웃 문서: 공개 저장소에서 작성하는 1차 지형·동선 덩어리.
// 아트 에셋이 아니라 primitive(상자·원기둥)와 동선 선, 상호작용 자리표시만 담는다.
// 게임 로직(의뢰·경제·충돌 판정)은 여기 두지 않는다. 런타임 연결은 엔진 호스트가 맡는다.

import { boundsOfCellKey, containsPoint, isFinitePoint } from '../core/world-grid.js';

export const BLOCKOUT_FORMAT = 'hangaram.blockout';
export const BLOCKOUT_VERSION = 1;
export const PRIMITIVE_SHAPES = Object.freeze(['box', 'cylinder']);
export const COLLISION_KINDS = Object.freeze(['solid', 'walkable', 'none']);
// 모바일 1청크 예산. KOREA 기존 청크 중 가장 큰 시장이 342개 엔티티다.
export const MAX_PRIMITIVES_PER_CHUNK = 400;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/** 엔티티 ID 접두사: '<팩 entityPrefix>.<청크 id>.' — 기존 KOREA ID와 충돌하지 않게 한다. */
export const entityPrefixFor = (pack, chunkId) => `${pack.entityPrefix}.${chunkId}.`;

/**
 * @param {object} doc 블록아웃 문서
 * @param {{pack: object, chunk: object}} context 소속 팩과 청크 항목
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateBlockout(doc, { pack, chunk }) {
  const errors = [];
  const fail = (message) => errors.push(`${chunk?.id ?? '?'}: ${message}`);
  if (!doc || typeof doc !== 'object') return { ok: false, errors: ['E_BLOCKOUT_NOT_OBJECT'] };
  if (doc.format !== BLOCKOUT_FORMAT) fail(`format must be ${BLOCKOUT_FORMAT}`);
  if (doc.version !== BLOCKOUT_VERSION) fail(`unsupported version ${doc.version}`);
  if (doc.era !== pack.id) fail(`era ${doc.era} does not match pack ${pack.id}`);
  if (doc.chunk !== chunk.id) fail(`chunk ${doc.chunk} does not match ${chunk.id}`);
  const bounds = boundsOfCellKey(chunk.cell);
  if (!bounds) return { ok: false, errors: [...errors, `${chunk.id}: invalid cell ${chunk.cell}`] };
  const prefix = entityPrefixFor(pack, chunk.id);
  const ids = new Set();
  const claim = (id, kind) => {
    if (typeof id !== 'string' || !id.startsWith(prefix)) fail(`${kind} id ${JSON.stringify(id)} must start with ${prefix}`);
    else if (ids.has(id)) fail(`duplicate id ${id}`);
    ids.add(id);
  };
  const primitives = Array.isArray(doc.primitives) ? doc.primitives : null;
  if (!primitives) fail('primitives must be an array');
  else if (primitives.length > MAX_PRIMITIVES_PER_CHUNK) fail(`primitives ${primitives.length} exceed budget ${MAX_PRIMITIVES_PER_CHUNK}`);
  for (const p of primitives ?? []) {
    claim(p?.id, 'primitive');
    if (!PRIMITIVE_SHAPES.includes(p?.shape)) fail(`${p?.id}: shape must be one of ${PRIMITIVE_SHAPES.join('/')}`);
    if (!isVec3(p?.position)) { fail(`${p?.id}: position must be [x,y,z]`); continue; }
    if (!isVec3(p?.size) || p.size.some((v) => v <= 0)) { fail(`${p?.id}: size must be positive [w,h,d]`); continue; }
    if (p.yaw !== undefined && !Number.isFinite(p.yaw)) fail(`${p.id}: yaw must be finite degrees`);
    if (!HEX_COLOR.test(p.color ?? '')) fail(`${p.id}: color must be #rrggbb`);
    if (!COLLISION_KINDS.includes(p.collision)) fail(`${p.id}: collision must be one of ${COLLISION_KINDS.join('/')}`);
    // 회전 전 외접 반경으로 검사해 yaw와 관계없이 청크 밖으로 나가지 않게 한다.
    const reach = p.yaw ? Math.hypot(p.size[0], p.size[2]) / 2 : null;
    const [x, , z] = p.position;
    const halfX = reach ?? p.size[0] / 2;
    const halfZ = reach ?? p.size[2] / 2;
    if (!containsPoint(bounds, [x - halfX, z - halfZ]) || !containsPoint(bounds, [x + halfX, z + halfZ])) {
      fail(`${p.id}: footprint leaves chunk ${chunk.cell}`);
    }
  }
  for (const path of doc.paths ?? []) {
    claim(path?.id, 'path');
    if (!Array.isArray(path?.points) || path.points.length < 2) { fail(`${path?.id}: path needs >= 2 points`); continue; }
    if (!(path.width > 0)) fail(`${path.id}: width must be positive`);
    for (const point of path.points) {
      if (!isFinitePoint(point) || !containsPoint(bounds, point)) fail(`${path.id}: point ${JSON.stringify(point)} outside chunk`);
    }
  }
  for (const spot of doc.interactions ?? []) {
    claim(spot?.id, 'interaction');
    if (!isFinitePoint(spot?.position) || !containsPoint(bounds, spot.position)) fail(`${spot?.id}: position outside chunk`);
    if (!(spot?.radius > 0)) fail(`${spot?.id}: radius must be positive`);
    // 블록아웃 상호작용은 자리표시다. 게임 기능으로 오인되지 않도록 표시를 강제한다.
    if (spot?.placeholder !== true) fail(`${spot?.id}: interactions must set placeholder: true until gameplay exists`);
  }
  return { ok: errors.length === 0, errors };
}


/**
 * HG-01 전용 도식 연결 게이트. 문서 좌표는 역사 실측치가 아니다.
 * 시장 끝 Z=32에서 폭 6m, 중심 X=0인 도로가 연결되는지 검증한다.
 */
export function validateNaruEntrance(doc, { edgeZ = 32, centerX = 0, width = 6, exclusion = 2 } = {}) {
  const errors = [];
  const start = (doc.paths ?? []).find((p) =>
    p.points?.some(([x, z]) => x === centerX && z === edgeZ) && p.width === width);
  if (!start) errors.push('E_NARU_ROAD_SEAM: missing x=0 width=6 road at z=32');
  for (const p of doc.primitives ?? []) {
    if (p.collision !== 'solid') continue;
    const [x, , z] = p.position;
    const reachX = p.yaw ? Math.hypot(p.size[0], p.size[2]) / 2 : p.size[0] / 2;
    const reachZ = p.yaw ? Math.hypot(p.size[0], p.size[2]) / 2 : p.size[2] / 2;
    if (z-reachZ < edgeZ+exclusion && z+reachZ > edgeZ &&
        x+reachX > centerX-width/2 && x-reachX < centerX+width/2) {
      errors.push('E_NARU_SEAM_SOLID: ' + p.id);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 검수용 보행 격자. solid 소품 및 물가(데크 외 Z>=90)를 제외한다.
 * 게임 런타임의 충돌 판정을 대체하지 않는다.
 */
export function checkNaruFootpaths(doc, {
  start = [0, 32.5], goals = [[0, 88], [-8, 60], [7, 60], [19, 63]],
  bounds = { min: [-32, 32], max: [32, 96] },
  step = .5, radius = .32,
} = {}) {
  const cols = Math.round((bounds.max[0]-bounds.min[0])/step)+1;
  const rows = Math.round((bounds.max[1]-bounds.min[1])/step)+1;
  const blocked = (x,z) => {
    if (x < bounds.min[0]+radius || x > bounds.max[0]-radius ||
        z < bounds.min[1]+radius || z > bounds.max[1]-radius) return true;
    if (z >= 90 && Math.abs(x) > 2.1) return true; // 물가 안전 통행 보류
    return (doc.primitives ?? []).some((p) => {
      if (p.collision !== 'solid') return false;
      const [px,,pz] = p.position;
      const w = p.yaw ? Math.hypot(p.size[0],p.size[2]) : p.size[0];
      const d = p.yaw ? Math.hypot(p.size[0],p.size[2]) : p.size[2];
      return Math.abs(px-x) < w/2+radius && Math.abs(pz-z) < d/2+radius;
    });
  };
  const at = ([x,z]) => [Math.round((x-bounds.min[0])/step),Math.round((z-bounds.min[1])/step)];
  const key = (cx,cz) => cz*cols+cx;
  const [sx,sz] = at(start);
  const visited = new Uint8Array(cols*rows);
  const queue = [[sx,sz]];
  visited[key(sx,sz)]=1;
  let head=0;
  while(head<queue.length){
    const [cx,cz]=queue[head++];
    for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=cx+dx,nz=cz+dz;
      if(nx<0||nx>=cols||nz<0||nz>=rows||visited[key(nx,nz)])continue;
      const x=bounds.min[0]+nx*step,z=bounds.min[1]+nz*step;
      if(blocked(x,z))continue;
      visited[key(nx,nz)]=1;queue.push([nx,nz]);
    }
  }
  const unreachable=goals.filter(([x,z])=>{
    const [cx,cz]=at([x,z]);
    return cx<0||cx>=cols||cz<0||cz>=rows||!visited[key(cx,cz)];
  });
  return {ok:unreachable.length===0,unreachable,visited:queue.length,step};
}
