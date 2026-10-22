// WorldForge KOREA 청크 카탈로그 형식으로의 데이터 변환 (기존 3청크 재사용 경로).
// KOREA 런타임의 chunk-catalog 항목 모양 {id, name, min:[x,z], max:[x,z], uri}에 맞춘 순수 데이터 변환이며,
// WorldForge 코드를 복제하거나 가져오지 않는다. 일치 여부는 scripts/check-private-bridge.mjs가
// 비공개 체크아웃이 있을 때만 실제 소스와 대조한다.

import { boundsOfCellKey } from '../core/world-grid.js';

/**
 * @param {object} pack 시대팩
 * @param {{statuses?: string[]}} [options] 포함할 청크 상태. 기본은 내용이 있는 청크.
 */
export function toWorldForgeChunkCatalog(pack, { statuses = ['legacy-reference', 'blockout'] } = {}) {
  return pack.chunks
    .filter((chunk) => statuses.includes(chunk.status))
    .map((chunk) => {
      const { min, max } = boundsOfCellKey(chunk.cell);
      const legacy = chunk.status === 'legacy-reference' ? chunk.legacy : null;
      return {
        id: legacy ? legacy.chunkId : `hg-${chunk.id}`,
        name: chunk.name,
        min,
        max,
        uri: legacy ? legacy.uri : `chunks/hg-${chunk.id}.json`,
      };
    });
}
