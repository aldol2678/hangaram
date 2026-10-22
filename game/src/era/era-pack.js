// 시대팩(era pack) 인터페이스.
// 공통: 장소 ID와 좌표계(hangaram.local/v1)는 모든 시대가 공유한다.
// 시대별: 지형(terrain), 청크 내용과 상태, 엔티티 ID 접두사는 팩마다 따로 둔다.
// 청크 상태는 실제 구현 정도를 그대로 나타내며, UI는 이 상태 이상으로 표시하지 않는다.

import { COORDINATE_SYSTEM, boundsOfCellKey, boundsOverlap, containsPoint, isFinitePoint, parseCellKey } from '../core/world-grid.js';
import { isPlaceId } from '../core/place-id.js';
import { validateBlockout } from './blockout.js';

export const ERA_PACK_FORMAT = 'hangaram.era-pack';
export const ERA_PACK_VERSION = 1;
export const PLACES_FORMAT = 'hangaram.places';

/**
 * legacy-reference: 내용이 비공개 WorldForge KOREA 런타임에 있다. 한가람은 셀·ID·출처만 기록한다.
 * blockout: 한가람이 작성한 공개 블록아웃이 있다.
 * planned: 셀과 작업 번호만 정해졌다. 내용 없음.
 * reserved: 공간 예약만. 계획 없음.
 */
export const CHUNK_STATUSES = Object.freeze(['legacy-reference', 'blockout', 'planned', 'reserved']);
export const PACK_STATUSES = Object.freeze(['in-development', 'reserved']);
export const STATUS_LABELS = Object.freeze({
  'legacy-reference': '기존 KOREA 청크 · 비공개 런타임 필요',
  blockout: '블록아웃 (공개)',
  planned: '계획됨 · 미구현',
  reserved: '예약 · 미설계',
});
export const STATUS_SHORT_LABELS = Object.freeze({ 'legacy-reference': '기존 KOREA', blockout: '블록아웃', planned: '계획', reserved: '예약' });

const ERA_ID = /^[a-z]+-\d{4}$/;
const CHUNK_ID = /^[a-z][a-z0-9-]*$/;
const ENTITY_PREFIX = /^hg\.[a-z0-9]+$/;
const COMMIT = /^[0-9a-f]{40}$/;
const RELATIVE_JSON = /^chunks\/[a-z0-9.-]+\.json$/;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isBounds = (b) => isObject(b) && isFinitePoint(b.min) && isFinitePoint(b.max) && b.min[0] < b.max[0] && b.min[1] < b.max[1];

/** 공통 장소 목록 검증. 장소 ID와 셀은 각각 유일하고, 기준점은 자기 셀 안에 있어야 한다. */
export function validatePlaces(doc) {
  const errors = [];
  if (!isObject(doc) || doc.format !== PLACES_FORMAT || doc.version !== 1) return { ok: false, errors: ['E_PLACES_FORMAT'] };
  if (doc.coordinateSystem !== COORDINATE_SYSTEM) errors.push(`coordinateSystem must be ${COORDINATE_SYSTEM}`);
  const ids = new Set();
  const cells = new Set();
  for (const place of Array.isArray(doc.places) ? doc.places : []) {
    if (!isPlaceId(place?.id)) { errors.push(`invalid place id ${JSON.stringify(place?.id)}`); continue; }
    if (ids.has(place.id)) errors.push(`duplicate place ${place.id}`);
    ids.add(place.id);
    const bounds = boundsOfCellKey(place.cell);
    if (!bounds) { errors.push(`${place.id}: invalid cell ${place.cell}`); continue; }
    if (cells.has(place.cell)) errors.push(`${place.id}: cell ${place.cell} already has a place`);
    cells.add(place.cell);
    if (typeof place.name !== 'string' || !place.name) errors.push(`${place.id}: name required`);
    if (!isFinitePoint(place.anchor) || !containsPoint(bounds, place.anchor)) errors.push(`${place.id}: anchor must lie inside cell ${place.cell}`);
  }
  if (!ids.size) errors.push('places must not be empty');
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} pack 시대팩
 * @param {{places?: object, blockouts?: Map<string, object>}} [context]
 *   places: 공통 장소 문서. blockouts: 청크 id → 블록아웃 문서 (status 'blockout' 검증용).
 */
export function validateEraPack(pack, { places, blockouts } = {}) {
  const errors = [];
  const fail = (message) => errors.push(`${pack?.id ?? '?'}: ${message}`);
  if (!isObject(pack)) return { ok: false, errors: ['E_PACK_NOT_OBJECT'] };
  if (pack.format !== ERA_PACK_FORMAT) fail(`format must be ${ERA_PACK_FORMAT}`);
  if (pack.version !== ERA_PACK_VERSION) fail(`unsupported version ${pack.version}`);
  if (!ERA_ID.test(pack.id ?? '')) fail('id must look like <name>-<year>');
  if (!Number.isInteger(pack.year)) fail('year must be an integer');
  else if (!pack.id?.endsWith(String(pack.year))) fail('id must end with its year');
  if (!PACK_STATUSES.includes(pack.status)) fail(`status must be one of ${PACK_STATUSES.join('/')}`);
  if (pack.coordinateSystem !== COORDINATE_SYSTEM) fail(`coordinateSystem must be ${COORDINATE_SYSTEM}`);
  if (!ENTITY_PREFIX.test(pack.entityPrefix ?? '')) fail('entityPrefix must look like hg.<tag>');
  if (typeof pack.label !== 'string' || !pack.label) fail('label required');

  const terrain = pack.terrain;
  if (!isObject(terrain)) fail('terrain required (per-era, never shared)');
  else {
    if (typeof terrain.status !== 'string') fail('terrain.status required');
    if (!Number.isFinite(terrain.groundY)) fail('terrain.groundY must be finite');
    if (!Array.isArray(terrain.water)) fail('terrain.water must be an array');
    for (const water of terrain.water ?? []) {
      if (typeof water?.id !== 'string' || !water.id.startsWith(`${pack.entityPrefix}.terrain.`)) fail(`water id ${water?.id} must start with ${pack.entityPrefix}.terrain.`);
      if (!isBounds(water)) fail(`${water?.id}: water needs min < max`);
      if (!Number.isFinite(water?.surfaceY)) fail(`${water?.id}: surfaceY must be finite`);
    }
    if (pack.status === 'reserved' && terrain.water?.length) fail('reserved pack must not ship terrain geometry');
  }

  const placeList = places?.places ?? null;
  const placeById = new Map((placeList ?? []).map((p) => [p.id, p]));
  const chunkIds = new Set();
  const cells = new Set();
  const placeOwners = new Map();
  const chunks = Array.isArray(pack.chunks) ? pack.chunks : [];
  if (!Array.isArray(pack.chunks)) fail('chunks must be an array');
  for (const chunk of chunks) {
    const id = chunk?.id;
    if (!CHUNK_ID.test(id ?? '')) { fail(`invalid chunk id ${JSON.stringify(id)}`); continue; }
    if (chunkIds.has(id)) fail(`duplicate chunk ${id}`);
    chunkIds.add(id);
    if (!parseCellKey(chunk.cell)) { fail(`${id}: invalid cell ${chunk.cell}`); continue; }
    if (cells.has(chunk.cell)) fail(`${id}: cell ${chunk.cell} used twice`);
    cells.add(chunk.cell);
    if (!CHUNK_STATUSES.includes(chunk.status)) { fail(`${id}: status must be one of ${CHUNK_STATUSES.join('/')}`); continue; }
    if (pack.status === 'reserved' && chunk.status !== 'reserved') fail(`${id}: reserved pack may only contain reserved chunks`);
    if (!Array.isArray(chunk.places) || !chunk.places.length) fail(`${id}: places required`);
    for (const placeId of chunk.places ?? []) {
      if (!isPlaceId(placeId)) { fail(`${id}: invalid place ${placeId}`); continue; }
      if (placeOwners.has(placeId)) fail(`${id}: place ${placeId} already owned by ${placeOwners.get(placeId)}`);
      placeOwners.set(placeId, id);
      if (placeList) {
        const place = placeById.get(placeId);
        if (!place) fail(`${id}: unknown place ${placeId}`);
        // 공통 좌표 규칙: 같은 장소는 모든 시대에서 같은 셀이다.
        else if (place.cell !== chunk.cell) fail(`${id}: place ${placeId} belongs to cell ${place.cell}, not ${chunk.cell}`);
      }
    }
    const hasLegacy = chunk.legacy !== undefined;
    const hasBlockout = chunk.blockout !== undefined;
    if (chunk.status === 'legacy-reference') {
      const legacy = chunk.legacy;
      if (!isObject(legacy) || legacy.source !== 'worldforge-korea' || !CHUNK_ID.test(legacy.chunkId ?? '') || !RELATIVE_JSON.test(legacy.uri ?? '') || !COMMIT.test(legacy.commit ?? '')) {
        fail(`${id}: legacy-reference needs legacy {source, chunkId, uri, commit}`);
      }
      if (hasBlockout) fail(`${id}: legacy-reference must not ship a public blockout`);
    } else if (hasLegacy) fail(`${id}: only legacy-reference chunks may carry legacy data`);
    if (chunk.status === 'blockout') {
      if (!RELATIVE_JSON.test(chunk.blockout ?? '')) fail(`${id}: blockout path required`);
      else if (blockouts) {
        const doc = blockouts.get(id);
        if (!doc) fail(`${id}: blockout document missing (${chunk.blockout})`);
        else errors.push(...validateBlockout(doc, { pack, chunk }).errors.map((e) => `${pack.id}: ${e}`));
      }
    } else if (hasBlockout) fail(`${id}: status ${chunk.status} must not ship a blockout`);
    if (chunk.status === 'planned' && typeof chunk.plannedIn !== 'string') fail(`${id}: planned chunk needs plannedIn`);
    if (chunk.blockoutTarget !== undefined && (chunk.status !== 'planned' || !RELATIVE_JSON.test(chunk.blockoutTarget))) {
      fail(`${id}: blockoutTarget is only for planned chunks`);
    }
  }
  for (const water of terrain?.water ?? []) {
    // 수면은 육지 청크와 겹치지 않는 별도 장식 영역이다 (설계 요약 기준).
    for (const chunk of chunks) {
      const bounds = boundsOfCellKey(chunk?.cell);
      if (bounds && isBounds(water) && boundsOverlap(bounds, water)) fail(`${water.id}: overlaps land chunk ${chunk.id}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
