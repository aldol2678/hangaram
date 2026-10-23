import {readFile,writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..'),privateDir=process.env.WORLDFORGE_KOREA_DIR;
if(!privateDir)throw Error('WORLDFORGE_KOREA_DIR required');
const vendor=path.resolve(privateDir,'vendor/hangaram/hg02'),provenance=JSON.parse(await readFile(path.join(vendor,'provenance.json'))),checks=[];
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function check(name,ok,detail={}){checks.push({name,result:ok?'PASS':'FAIL',...detail});}
check('public repository identity',provenance.repository==='aldol2678/hangaram');
check('source commit ancestor',(()=>{try{git('merge-base','--is-ancestor',provenance.commit,'HEAD');return true;}catch{return false;}})());
for(const f of provenance.files){
 if(!/^game\/(src|worldpacks)\/[\w./-]+$/.test(f.source)||f.source.includes('..')||f.vendor!==f.source)throw Error('E_SOURCE_PATH');
 const pub=await readFile(path.join(root,f.source)),priv=await readFile(path.join(vendor,f.vendor));
 check(f.source,pub.equals(priv)&&blob(pub)===f.blob&&git('rev-parse',`${provenance.commit}:${f.source}`)===f.blob,{blob:f.blob});
}
const {MODERN_ENTITIES,MODERN_CHUNKS,modernBlocked}=await import(pathToFileURL(path.resolve(privateDir,'src/hg02-era.js')));
const doc=JSON.parse(await readFile(path.join(root,'game/worldpacks/modern-2026/chunks/naru.blockout.json')));
check('modern entities exactly match public primitives',MODERN_ENTITIES.length===doc.primitives.length&&doc.primitives.every((p,i)=>p.id===MODERN_ENTITIES[i].id&&JSON.stringify(p.position)===JSON.stringify(MODERN_ENTITIES[i].transform.position)&&JSON.stringify(p.size)===JSON.stringify(MODERN_ENTITIES[i].transform.scale)));
check('modern single 64m cell',MODERN_CHUNKS.length===1&&JSON.stringify(MODERN_CHUNKS[0].min)==='[-32,32]'&&JSON.stringify(MODERN_CHUNKS[0].max)==='[32,96]');
check('modern collision and reserved edge',modernBlocked(10,44)&&modernBlocked(0,31)&&!modernBlocked(0,40));
const report={check:'HG02 bridge',publicCommit:git('rev-parse','HEAD'),privateCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:privateDir,encoding:'utf8'}).trim(),sourceCommit:provenance.commit,checks,result:checks.every(c=>c.result==='PASS')?'PASS':'FAIL'};
await mkdir(path.join(root,'qa/hg-02'),{recursive:true});await writeFile(path.join(root,'qa/hg-02/hg02-bridge-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(report.result,checks.filter(c=>c.result==='PASS').length+'/'+checks.length);if(report.result!=='PASS')process.exitCode=1;
