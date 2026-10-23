import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry, readWorldpackJson } from './helpers/worldpacks.mjs';
import { createEraTransition } from '../game/src/era/transaction.js';
import { createNewSave } from '../game/src/save/format.js';
import { loadCandidate, persistCandidate, CANDIDATE_SAVE_KEY } from '../game/src/save/candidate.js';
import { validateNaruEntrance, checkNaruFootpaths } from '../game/src/era/blockout.js';
const registry = await loadRegistry();
const request = { toEra: 'modern-2026', placeId: 'mapo.naru' };
function setup({failWrite=0,failPrepare=false,failActivate=false,safe=true,gate=null}={}) {
 let save=createNewSave({now:0}), runtime='joseon-1792',writes=0,stored=null;
 save.player.position=[0,40];save.inventory.coins=17;save.progress.life={cook:{phase:'active',progress:1}};
 const t=createEraTransition({registry,getSave:()=>save,setSave:v=>{save=v;},isSafe:()=>safe,
 persist:async v=>{if(++writes===failWrite)throw Error('disk full');stored=structuredClone(v);},
 prepare:async to=>{if(gate)await gate;if(failPrepare)throw Error('load failed');return {
 activate:async()=>{runtime=to;if(failActivate)throw Error('activation failed');},
 rollback:async()=>{runtime='joseon-1792';},finalize:async()=>{},
 };}});
 return {t,get save(){return save;},get runtime(){return runtime;},get stored(){return stored;},get writes(){return writes;}};
}
test('HG02 two round trips preserve exact coordinates and progress',async()=>{
 const h=setup(),before=structuredClone(h.save);
 for(let i=0;i<2;i++)for(const toEra of ['modern-2026','joseon-1792']){
  assert.equal((await h.t.transition({...request,toEra})).ok,true);assert.equal(h.runtime,toEra);assert.equal(h.save.era.current,toEra);
  assert.deepEqual(h.save.player,before.player);assert.deepEqual(h.save.inventory,before.inventory);assert.deepEqual(h.save.progress,before.progress);
 }
});
for(const [name,opts] of [['checkpoint',{failWrite:1}],['commit',{failWrite:2}],['load',{failPrepare:true}],['activation',{failActivate:true}]])
 test('HG02 rollback on '+name,async()=>{const h=setup(opts),before=structuredClone(h.save);const result=await h.t.transition(request);assert.equal(result.ok,false);assert.deepEqual(h.save,before);assert.equal(h.runtime,'joseon-1792');});
test('HG02 obstacle refuses without moving or writing',async()=>{const h=setup({safe:false});assert.equal((await h.t.transition(request)).error,'E_TARGET_BLOCKED');assert.equal(h.writes,0);assert.deepEqual(h.save.player.position,[0,40]);});
test('HG02 concurrent input refused; interrupted durable checkpoint recovers',async()=>{
 let release;const gate=new Promise(r=>release=r),h=setup({gate});const work=h.t.transition(request);await new Promise(r=>setImmediate(r));
 assert.equal((await h.t.transition(request)).error,'E_TRANSITION_IN_PROGRESS');
 const restored=loadCandidate({getItem:k=>{assert.equal(k,CANDIDATE_SAVE_KEY);return JSON.stringify(h.stored);}});
 assert.equal(restored.recovered,true);assert.equal(restored.save.era.current,'joseon-1792');assert.deepEqual(restored.save.player.position,[0,40]);release();assert.equal((await work).ok,true);
});
test('HG02 busy, unavailable place and wrong coordinates refuse',async()=>{
 const h=setup();assert.equal((await h.t.transition({...request,busy:true})).error,'E_PLAYER_BUSY');
 assert.equal((await h.t.transition({...request,placeId:'mapo.market'})).ok,false);
 h.save.player.position=[0,8];assert.equal((await h.t.transition(request)).error,'E_POSITION_UNAVAILABLE');
});
test('HG02 candidate storage accesses only isolated key; reload retains era',()=>{
 const values=new Map([['hangaram.save','untouched'],['korea.alpha01.market.save.v1','untouched']]);
 const storage={getItem:k=>{assert.equal(k,CANDIDATE_SAVE_KEY);return values.get(k)??null;},setItem:(k,v)=>{assert.equal(k,CANDIDATE_SAVE_KEY);values.set(k,v);}};
 const s=loadCandidate(storage).save;s.era.current='modern-2026';s.player.position=[0,40];persistCandidate(storage,s);
 assert.deepEqual(loadCandidate(storage).save,s);assert.equal(values.get('hangaram.save'),'untouched');assert.equal(values.get('korea.alpha01.market.save.v1'),'untouched');
 values.set(CANDIDATE_SAVE_KEY,'broken');assert.equal(loadCandidate(storage).readOnly,true);
});
test('HG02 modern blockout paths and historical primitives preserved',async()=>{
 const modern=await readWorldpackJson('modern-2026/chunks/naru.blockout.json');
 assert.equal(validateNaruEntrance(modern).ok,true);
 assert.equal(checkNaruFootpaths(modern,{goals:[[0,88],[-8,48],[20,48]]}).ok,true);
 assert.equal((await readWorldpackJson('joseon-1792/chunks/naru.blockout.json')).primitives.length,45);
});
