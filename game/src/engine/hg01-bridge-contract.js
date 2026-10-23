// Pure HG-01 checks; no private code is imported by this module.
import { createHash } from 'node:crypto';

const sorted = (rows) => rows.map((c) => JSON.stringify(c)).sort();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function catalogChecks({ pack, legacyCatalog, blockoutCatalog, privateCatalog, boundsOfCellKey, boundsOverlap }) {
  const checks = [];
  const add = (name, pass, detail = {}) => checks.push({ name, result: pass ? 'PASS' : 'FAIL', ...detail });
  const pick = (c) => ({ id: c.id, min: c.min, max: c.max, uri: c.uri });
  const legacyIds = new Set(legacyCatalog.map((c) => c.id));
  const privateLegacy = privateCatalog.filter((c) => legacyIds.has(c.id)).map(pick);
  add('legacy chunk catalog unchanged', equal(sorted(legacyCatalog.map(pick)), sorted(privateLegacy)),
    { expected: legacyCatalog.map(pick), actual: privateLegacy });

  const blockoutIds = new Set(blockoutCatalog.map((c) => c.id));
  const privateNew = privateCatalog.filter((c) => c.id.startsWith('hg-'));
  add('HG-01 blockout catalog exact', equal(sorted(blockoutCatalog.map(pick)), sorted(privateNew.map(pick))),
    { expected: blockoutCatalog, actual: privateNew });

  const collisions = pack.chunks.filter((c) => ['planned', 'reserved'].includes(c.status))
    .flatMap((slot) => privateCatalog.filter((c) =>
      boundsOverlap(boundsOfCellKey(slot.cell), { min: c.min, max: c.max }))
      .map((c) => `${slot.id}->${c.id}`));
  add('planned and reserved slots remain unoccupied', collisions.length === 0, { collisions });
  add('existing legacy IDs not reused by HG-01', [...blockoutIds].every((id) => !legacyIds.has(id)));
  return checks;
}

export function hg01VendorChecks({ pack, publicBytes, vendorBytes, provenance, privateWorldBounds, isSourceCommitAncestor, expectedRepository = 'aldol2678/hangaram' }) {
  const checks = [];
  const add = (name, pass, detail = {}) => checks.push({ name, result: pass ? 'PASS' : 'FAIL', ...detail });
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const gitBlobSha = (bytes) => createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  const naru = pack.chunks.find((c) => c.id === 'naru');
  add('public naru blockout declared', naru?.status === 'blockout' && naru.blockout === 'chunks/naru.blockout.json');
  add('public and private HG-01 JSON bytes identical', sha(publicBytes) === sha(vendorBytes),
    { sha256: sha(publicBytes) });
  add('source repository and path match approved public blockout',
    provenance?.sourceRepository === expectedRepository &&
    provenance?.path === 'game/worldpacks/joseon-1792/chunks/naru.blockout.json');
  add('vendor Git blob SHA matches public data', provenance?.githubBlobSha === gitBlobSha(publicBytes),
    { actualBlob: gitBlobSha(publicBytes) });
  add('vendor source commit in public history', Boolean(provenance?.sourceCommit && isSourceCommitAncestor));
  add('WorldForge southern bounds support HG-01', privateWorldBounds?.maxZ === 94.5 &&
    privateWorldBounds?.minZ === -158.5);
  return checks;
}
