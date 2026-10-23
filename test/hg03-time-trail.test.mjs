import test from 'node:test';
import assert from 'node:assert/strict';
import { TRAIL_BARRIERS, TRAIL_COMPLETE, TRAIL_STEPS, advanceTrail, normalizeTrailProgress, trailBlocked, trailInstruction } from '../game/src/puzzle/time-trail.js';
test('HG03 gates are era-specific and side rails close the authored corridor', () => {
  assert.equal(TRAIL_BARRIERS.length, 4);
  assert.equal(trailBlocked('joseon-1792', 26, 62), true);
  assert.equal(trailBlocked('modern-2026', 26, 62), false);
  assert.equal(trailBlocked('joseon-1792', 26, 76), false);
  assert.equal(trailBlocked('modern-2026', 26, 76), true);
  for(const era of ['joseon-1792', 'modern-2026']) for(const x of [23, 30]) assert.equal(trailBlocked(era, x, 68), true);
  for(const era of ['joseon-1792', 'modern-2026']) assert.equal(trailBlocked(era, 26, 68), false);
});
test('HG03 real checkpoint progression requires correct era and order', () => {
  let n = 0;
  assert.equal(advanceTrail(n, 'modern-2026', [26,55]), 0);
  n=advanceTrail(n,'joseon-1792',[26,55]);assert.equal(n,1);
  assert.equal(advanceTrail(n,'joseon-1792',[26,68]),1);
  assert.equal(advanceTrail(n,'modern-2026',[26,83]),1);
  n=advanceTrail(n,'modern-2026',[26,68]);assert.equal(n,2);
  n=advanceTrail(n,'joseon-1792',[26,83]);assert.equal(n,TRAIL_COMPLETE);
  assert.equal(advanceTrail(n,'modern-2026',[26,55]),TRAIL_COMPLETE);
  assert.match(trailInstruction(n),/완료/);
});
test('HG03 invalid or corrupt progress is clamped without escaping the flow', () => {
  for(const v of [-1,4,1.5,null,NaN,Infinity,'2'])assert.equal(normalizeTrailProgress(v),0);
  assert.equal(advanceTrail(0,'joseon-1792',[NaN,55]),0);
  assert.equal(advanceTrail(0,'joseon-1792',null),0);
  assert.equal(trailBlocked('modern-2026',NaN,65),true);
});
test('HG03 finite corridor needs both times, but is reachable with two switches', () => {
  // Graph search across real x/z walk cells; era transition never teleports.
  // Restrict to the fenced play corridor. No path exists in one fixed era.
  function path(allowSwitch) {
    const start=['joseon-1792',26,55,0], queue=[start], visited=new Set();
    const key=s=>s.join(':');
    for(let i=0;i<queue.length;i++){
      const [era,x,z,switches]=queue[i], state=queue[i], id=key(state);
      if(visited.has(id))continue; visited.add(id);
      if(z===83&&era==='joseon-1792')return switches;
      const options=[[era,x+1,z,switches],[era,x-1,z,switches],[era,x,z+1,switches],[era,x,z-1,switches]];
      if(allowSwitch&&switches<2)options.push([era==='joseon-1792'?'modern-2026':'joseon-1792',x,z,switches+1]);
      for(const next of options){
        if(next[1]<24||next[1]>29||next[2]<55||next[2]>83||trailBlocked(next[0],next[1],next[2]))continue;
        if(!visited.has(key(next)))queue.push(next);
      }
    }
    return null;
  }
  assert.equal(path(false),null);
  assert.equal(path(true),2);
  assert.deepEqual(TRAIL_STEPS.map(s=>s.era),['joseon-1792','modern-2026','joseon-1792']);
});
