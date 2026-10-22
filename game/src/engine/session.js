// 월드 세션: 레지스트리의 한 시대를 엔진 호스트에 올린다.
// M0 월드는 12셀이므로 시대의 청크 서술자를 모두 넘기고, 무엇을 실제로 그릴지는 호스트가
// descriptor.loadable/status로 정한다. 거리 기반 청크 스트리밍은 WorldForge chunk-stream의 책임이다.

import { assertEngineHost } from './host.js';

export async function openEraSession({ registry, host, eraId }) {
  assertEngineHost(host);
  const descriptors = registry.chunkDescriptors(eraId, host.capabilities);
  host.setTerrain(registry.pack(eraId).terrain);
  for (const descriptor of descriptors) await host.mountChunk(descriptor);
  let closed = false;
  return {
    eraId,
    descriptors,
    summary: summarize(descriptors),
    async close() {
      if (closed) return;
      closed = true;
      for (const descriptor of descriptors) await host.unmountChunk(descriptor.qualifiedId);
    },
  };
}

export function summarize(descriptors) {
  const byStatus = {};
  for (const d of descriptors) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
  return { total: descriptors.length, loadable: descriptors.filter((d) => d.loadable).length, byStatus };
}
