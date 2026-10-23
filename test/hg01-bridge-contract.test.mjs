import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { catalogChecks, hg01VendorChecks } from '../game/src/engine/hg01-bridge-contract.js';

const pack = { chunks: [
  { id: 'grove', status: 'legacy-reference', cell: '0:-2' },
  { id: 'lane', status: 'legacy-reference', cell: '0:-1' },
  { id: 'market', status: 'legacy-reference', cell: '0:0' },
  { id: 'naru', status: 'blockout', cell: '0:1', blockout: 'chunks/naru.blockout.json' },
  { id: 'reed-shore', status: 'planned', cell: '1:1' },
  { id: 'west-hill', status: 'reserved', cell: '-1:-2' },
] };
const legacy = [
  { id: 'grove', min: [-32,-160], max: [32,-96], uri: 'chunks/grove.json' },
  { id: 'lane', min: [-32,-96], max: [32,-32], uri: 'chunks/lane.json' },
  { id: 'market', min: [-32,-32], max: [32,32], uri: 'chunks/market.json' },
];
const blockout = [{ id: 'hg-naru', name: '마포나루 · HG-01 블록아웃',
  min: [-32,32], max: [32,96], uri: 'chunks/hg-naru.json' }];
const bounds = (key) => {
  const [col,row] = key.split(':').map(Number);
  return { min: [col*64-32,row*64-32], max: [col*64+32,row*64+32] };
};
const overlap = (a,b) => a.min[0]<b.max[0] && a.max[0]>b.min[0] &&
  a.min[1]<b.max[1] && a.max[1]>b.min[1];
const args = { pack, legacyCatalog: legacy, blockoutCatalog: blockout,
  privateCatalog: [...legacy, ...blockout], boundsOfCellKey: bounds, boundsOverlap: overlap };
const failed = (checks) => checks.filter((c) => c.result === 'FAIL').map((c) => c.name);

test('HG-01 contract: original three chunks plus fourth naru pass', () => {
  assert.deepEqual(failed(catalogChecks(args)), []);
});
test('HG-01 contract: modified naru URI fails without rejecting unchanged legacy', () => {
  const result = catalogChecks({ ...args, privateCatalog: [...legacy, { ...blockout[0], uri: 'chunks/wrong.json' }] });
  assert.equal(result[0].result, 'PASS');
  assert.equal(result[1].result, 'FAIL');
});
test('HG-01 contract: occupied planned cell and extra hg- chunk rejected', () => {
  const extra = { id: 'hg-reed', min:[32,32], max:[96,96], uri:'chunks/hg-reed.json' };
  const failures = failed(catalogChecks({ ...args, privateCatalog:[...args.privateCatalog,extra] }));
  assert.ok(failures.some((name)=>name.includes('unoccupied')));
  assert.ok(failures.some((name)=>name.includes('catalog exact')));
});
test('HG-01 contract: old or missing naru rejected', () => {
  const failures = failed(catalogChecks({ ...args, privateCatalog:legacy }));
  assert.ok(failures.some((name)=>name.includes('catalog exact')));
});
const source = Buffer.from('{"format":"hangaram.blockout","chunk":"naru"}\n');
const gitSha = createHash('sha1').update(Buffer.from(`blob ${source.length}\0`)).update(source).digest('hex');
const provenance = { sourceRepository:'aldol2678/hangaram', sourceCommit:'479a721ba8a882e78f6c72675c569d5a62d31928',
  path:'game/worldpacks/joseon-1792/chunks/naru.blockout.json', githubBlobSha:gitSha };
const vendor = { pack, publicBytes:source, vendorBytes:source, provenance,
  privateWorldBounds:{minZ:-158.5,maxZ:94.5}, isSourceCommitAncestor:true };
test('HG-01 provenance: matching bytes, Git blob, commit and bounds pass', () => {
  assert.deepEqual(failed(hg01VendorChecks(vendor)), []);
});
test('HG-01 provenance: tampered vendor and wrong commit fail', () => {
  const result = failed(hg01VendorChecks({ ...vendor, vendorBytes:Buffer.from('tampered'), isSourceCommitAncestor:false }));
  assert.ok(result.some((name)=>name.includes('bytes identical')));
  assert.ok(result.some((name)=>name.includes('source commit')));
});
test('HG-01 provenance: wrong blob SHA and invalid world bounds fail', () => {
  const result = failed(hg01VendorChecks({ ...vendor,
    provenance:{...provenance,githubBlobSha:'0'.repeat(40)},
    privateWorldBounds:{minZ:-158.5,maxZ:30.5} }));
  assert.ok(result.some((name)=>name.includes('blob SHA')));
  assert.ok(result.some((name)=>name.includes('southern bounds')));
});
