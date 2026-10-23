import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBlockout,validateNaruEntrance,checkNaruFootpaths} from '../game/src/era/blockout.js';
import {loadRegistry,readWorldpackJson} from './helpers/worldpacks.mjs';
const registry=await loadRegistry();
const pack=registry.pack('joseon-1792');
const chunk=pack.chunks.find(x=>x.id==='naru');
const doc=await readWorldpackJson('joseon-1792/chunks/naru.blockout.json');

test('HG-01 A1: 공개 블록아웃 형식, 좌표, 고유 ID 및 예산',()=>{
 assert.deepEqual(validateBlockout(doc,{pack,chunk}),{ok:true,errors:[]});
 assert.ok(doc.primitives.length<=120);
 assert.ok(doc.interactions.every(x=>x.placeholder===true));
});
test('HG-01 A2: 시장 6m 도로와 x=0, z=32 끊김 없이 연결',()=>{
 assert.deepEqual(validateNaruEntrance(doc),{ok:true,errors:[]});
 const broken=structuredClone(doc);
 broken.paths[0].width=5;
 assert.match(validateNaruEntrance(broken).errors.join(','),/E_NARU_ROAD_SEAM/);
});
test('HG-01 A3: 0.5m 격자에서 선착장·짐·대기자리 도달',()=>{
 const result=checkNaruFootpaths(doc);
 assert.equal(result.ok,true,JSON.stringify(result.unreachable));
 assert.ok(result.visited>100);
});
test('HG-01 A4: 상호작용 자리표시 모두 도달 가능',()=>{
 for(const spot of doc.interactions){
  const result=checkNaruFootpaths(doc,{goals:[spot.position]});
  assert.equal(result.ok,true,spot.id);
 }
});
test('HG-01 A5: 강변 수면은 장식 영역, 독립 연속 수면은 z>=96',()=>{
 const shallow=doc.primitives.find(x=>x.id.endsWith('water.shallow'));
 assert.equal(shallow.collision,'none');
 assert.ok(shallow.position[2]+shallow.size[2]/2<=96);
 assert.equal(pack.terrain.water[0].min[1],96);
 assert.ok(doc.primitives.every(p=>p.position[2]+p.size[2]/2<=96));
});
test('HG-01 A6: 미리보기용 엔진 호스트에 나루만 공개 로드',()=>{
 const all=registry.chunkDescriptors('joseon-1792');
 assert.deepEqual(all.filter(x=>x.loadable).map(x=>x.chunkId),['naru']);
 assert.equal(all.find(x=>x.chunkId==='naru').blockout.primitives.length,doc.primitives.length);
});
