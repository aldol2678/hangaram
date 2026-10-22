// 엔진 호스트 계약. 한가람 게임 데이터는 이 인터페이스를 통해서만 렌더러·런타임에 닿는다.
// 구현체:
//  - createNullHost (이 파일): 헤드리스 테스트용 기록 호스트
//  - preview/playcanvas-host.js: 공개 블록아웃 미리보기 (게임 런타임 아님)
//  - WorldForge KOREA 브리지: 비공개 저장소에만 존재할 수 있다. 공개 이관 승인 전까지 이 저장소에 두지 않는다.
//    (docs/decisions/ADR-0001-public-private-boundary.md)
// 청크 스트리밍·이동·충돌·상호작용·저장 UI는 호스트(=WorldForge 런타임)의 책임이며 여기서 다시 구현하지 않는다.

export const HOST_METHODS = Object.freeze(['setTerrain', 'mountChunk', 'unmountChunk', 'setFocus', 'frame', 'snapshot', 'dispose']);

/**
 * @typedef {object} EngineHost
 * @property {ReadonlySet<string>} capabilities 적재할 수 있는 내용 출처 (예: 'worldforge-korea')
 * @property {(terrain: object) => void} setTerrain 시대팩의 지형 (시대마다 교체, 공유하지 않음)
 * @property {(descriptor: object) => Promise<void>|void} mountChunk registry.chunkDescriptors() 항목 하나
 * @property {(qualifiedId: string) => Promise<void>|void} unmountChunk
 * @property {(focus: {position: [number, number], yaw: number}) => void} setFocus
 * @property {(frame: object, dt: number) => void} frame 입력 의도 한 프레임
 * @property {() => object} snapshot 읽기 전용 상태
 * @property {() => Promise<void>|void} dispose
 */

export function assertEngineHost(host) {
  const missing = HOST_METHODS.filter((name) => typeof host?.[name] !== 'function');
  if (!(host?.capabilities instanceof Set)) missing.push('capabilities');
  if (missing.length) throw new TypeError(`E_ENGINE_HOST: missing ${missing.join(', ')}`);
  return host;
}

export function createNullHost({ capabilities = [] } = {}) {
  const mounted = new Map();
  const log = [];
  let focus = null;
  let terrain = null;
  let frames = 0;
  return assertEngineHost({
    capabilities: new Set(capabilities),
    setTerrain(next) {
      terrain = next;
      log.push(['terrain', next?.status ?? null]);
    },
    mountChunk(descriptor) {
      if (mounted.has(descriptor.qualifiedId)) throw new Error(`E_ALREADY_MOUNTED: ${descriptor.qualifiedId}`);
      mounted.set(descriptor.qualifiedId, descriptor);
      log.push(['mount', descriptor.qualifiedId]);
    },
    unmountChunk(qualifiedId) {
      mounted.delete(qualifiedId);
      log.push(['unmount', qualifiedId]);
    },
    setFocus(next) {
      focus = { position: [...next.position], yaw: next.yaw };
    },
    frame() {
      frames++;
    },
    snapshot: () => ({ mounted: [...mounted.keys()], terrain, focus, frames, log: [...log] }),
    dispose() {
      for (const id of [...mounted.keys()]) this.unmountChunk(id);
    },
  });
}
