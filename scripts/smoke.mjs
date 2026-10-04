import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,readQueries,tables} from './orchard.mjs';
import {parseCsv} from './lib/csv.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'orchard-test-'));
// Explicit opt-in disposable PostgreSQL URL only. Never inherit an operational URL.
const pg=process.env.TEST_DATABASE_URL||'';
process.env.DATABASE_URL=pg;process.env.DATA_DIR=path.join(temp,'db');
let db;
const cli=(...args)=>run(db,args);
const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const at=n=>day(n)+'T12:00:00Z';
try{
 db=await getDb();await migrate(db);assert.equal((await migrate(db)).ran.length,0);
 await seed(db);await seed(db);assert.equal((await cli('blocks')).length,4);assert.equal((await cli('harvests')).length,3);
 for(const cmd of Object.keys(readQueries))assert(Array.isArray(await cli(cmd,'--json')),cmd);
 assert((await cli('help'))[0].commands.includes('import croptracker'));
 assert.equal((await cli('block','east pear')).block.code,'B04');
 const block=(await cli('block','B04')).block;
 assert.equal((await cli('block',block.id.slice(0,8))).block.code,'B04');
 await assert.rejects(()=>cli('block','Gala'),/Ambiguous.*River|Ambiguous.*Hill/);
 assert.equal((await cli('trace','H01')).sprays.length,0,'later sprays are not attributed to earlier picks');
 const checks=await cli('compliance');assert(checks.some(x=>x.rule==='PICK_HOLD'&&x.reference==='H02'));assert(checks.some(x=>x.rule==='LABEL_RULE'&&x.reference==='S03'));
 const writes=[
  ['add','block','--code=B05','--name=West Apple','--crop=Apple','--variety=Fuji','--hectares=2','--address=Example address'],
  ['add','worker','--code=W04','--name=Test Worker',`--training-expires=${day(365)}`],
  ['add','task','--ref=T05','--block=B05','--title=Inspect','--owner=Test',`--due=${day(1)}`],
  ['log','note','--block=B05','--note=Evidence checked'],
  ['review-diary','B05',`--date=${day(0)}`,'--note=Test reviewer checked complete diary'],
  ['log','labour','--ref=L05','--block=B05','--worker=W04',`--date=${day(0)}`,'--activity=Picking','--hours=4','--cost=100'],
  ['log','irrigation','--ref=I05','--block=B05',`--date=${day(0)}`,'--source=Bore','--litres=4000'],
  ['complete','T05']
 ];
 for(const args of writes)await cli(...args);
 assert.equal((await cli('tasks')).find(x=>x.ref==='T05').status,'done');
 await assert.rejects(()=>cli('add','block','--code=BAD','--name=Bad','--crop=Apple','--variety=Fuji','--hectares=NaN','--address=A'),/Invalid hectares/);
 await assert.rejects(()=>cli('review-diary','B05','--date=2026-02-30','--note=bad'),/Invalid/);
 const spray=['log','spray','--ref=S05','--block=B05','--worker=W04','--product=Test only',`--at=${at(-2)}`,'--amount=1','--unit=L','--wind-speed=3','--wind-direction=NE','--boundary=Test buffer','--whp-days=1','--rei-hours=12','--label=TEST'];
 await cli(...spray);
 const harvest=['log','harvest','--ref=H05','--block=B05',`--at=${at(0)}`,'--bins=2','--kg=600','--destination=Test packhouse','--docket=TEST-5'];
 await cli(...harvest);
 assert.equal((await cli('harvests')).find(x=>x.ref==='H05').status,'recorded');
 await assert.rejects(()=>cli(...harvest.map(x=>x==='--ref=H05'?'--ref=H06':x==='--block=B05'?'--block=B01':x)),/Harvest blocked/);
 await assert.rejects(()=>cli(...spray.map(x=>x==='--ref=S05'?'--ref=S06':x==='--worker=W04'?'--worker=W02':x)),/training/);
 // Unknown intervals block a pick even with a current diary.
 await cli('review-diary','B03',`--date=${day(0)}`,'--note=Unknown label remains');
 await assert.rejects(()=>cli(...harvest.map(x=>x==='--ref=H05'?'--ref=H07':x==='--block=B05'?'--block=B03':x)),/Harvest blocked/);
 // Reentry alone blocks even after the withholding duration.
 await cli(...spray.map(x=>x==='--ref=S05'?'--ref=S07':x==='--rei-hours=12'?'--rei-hours=200':x));
 await assert.rejects(()=>cli(...harvest.map(x=>x==='--ref=H05'?'--ref=H08':x)),/Harvest blocked/);
 // Add multiple harvest and labour records to detect cross-join inflation in performance.
 await db.query("insert into harvests(ref,block_id,picked_at,bins,kg,status) values('H09',$1,now(),1,300,'held')",[(await cli('block','B05')).block.id]);
 await cli('log','labour','--ref=L06','--block=B05','--worker=W04',`--date=${day(0)}`,'--activity=Picking','--hours=2','--cost=50');
 const perf=(await cli('yields')).find(x=>x.code==='B05');assert.equal(Number(perf.kg),900);assert.equal(Number(perf.hours),6);assert.equal(Number(perf.labour_cost),150);
 const file=path.join(temp,'native.csv');
 const header='Harvest Date,Event#,Farm/Block/Row,Harvest Code,Weight,On Hand,Weight Unit,Amount,On Hand,Unit,Comments\r\n';
 fs.writeFileSync(file,header+'2026-09-01,E01,B04,IMP1,2204.62262185,2204.62262185,pounds,3,3,bins,"line one\nline two"\r\n');
 let im=await cli('import','croptracker',`--file=${file}`,'--dry-run');assert.equal(im.inserted,1);assert(!(await cli('harvests')).some(x=>x.ref==='IMP1'));
 im=await cli('import','croptracker',`--file=${file}`);assert.equal(im.inserted,1);const imported=(await cli('harvests')).find(x=>x.ref==='IMP1');assert.equal(Number(imported.kg),1000);assert.equal(imported.status,'held');
 assert.equal((await cli('import','croptracker',`--file=${file}`)).unchanged,1);
 fs.writeFileSync(file,header+'2026-09-01,E02,B04,IMP2,1000,1000,kg,2,2,bins,ok\n2026-09-01,E01,B04,IMP1,2000,2000,kg,3,3,bins,conflict\n');
 await assert.rejects(()=>cli('import','croptracker',`--file=${file}`),/Conflicting history/);assert(!(await cli('harvests')).some(x=>x.ref==='IMP2'),'transaction rolls back earlier rows');
 fs.writeFileSync(file,header+'2026-09-01,E03,B04,IMP3,1000,1000,unknown,2,2,bins,no\n');await assert.rejects(()=>cli('import','croptracker',`--file=${file}`),/Weight Unit/);
 fs.writeFileSync(file,header+'2026-09-01,E03,B04,IMP3,1000,1000,kg,2,2,totes,no\n');await assert.rejects(()=>cli('import','croptracker',`--file=${file}`),/Unit must be bins/);
 const mapfile=path.join(temp,'mapping.json');fs.writeFileSync(mapfile,JSON.stringify({ref:'ID',block:'Place',picked_at:'When',bins:'Count',kg:'Mass'}));
 fs.writeFileSync(file,'ID,Place,When,Count,Mass\nMAP1,B04,2026-09-02,1,500\n');assert.equal((await cli('import','croptracker',`--file=${file}`,`--mapping=${mapfile}`)).inserted,1);
 assert.throws(()=>parseCsv('a,a\n1,2'),/unique/);assert.throws(()=>parseCsv('a,b\n"unfinished'),/unclosed/);assert.throws(()=>parseCsv('a,b\n1,2,3'),/expected/);
 assert.equal(parseCsv('\uFEFFa,b\r\n"x,y","a""b"\r\n')[0].b,'a"b');
 const exp=await cli('export',`--out=${path.join(temp,'all.json')}`);const data=JSON.parse(fs.readFileSync(exp.file));assert.deepEqual(Object.keys(data.data),tables);assert.equal(data.data.blocks.length,5);
 await assert.rejects(()=>cli('export',`--out=${exp.file}`),/EEXIST/);
 const draft=await cli('draft-weekly');assert.equal(draft.sent,false);assert(fs.readFileSync(draft.file,'utf8').includes('Pick')||fs.readFileSync(draft.file,'utf8').includes('harvest-plan'));
 await assert.rejects(()=>cli('nonsense'),/Unknown/);
 await assert.rejects(()=>cli('import','croptracker',`--file=${file}`,'--dryrun'),/Unknown option/);
 await assert.rejects(()=>cli('import','croptracker',`--file=${file}`,'--dry-run=false'),/boolean flag/);
 await db.close();db=null;
 const child=(script,...args)=>{const p=spawnSync(process.execPath,[script,...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(p.status,0,p.stderr);return p.stdout;};
 assert(Array.isArray(JSON.parse(child('scripts/orchard.mjs','blocks','--json'))));
 const bad=spawnSync(process.execPath,['scripts/orchard.mjs','block','Gala'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/Ambiguous/);
 child('scripts/view.mjs');child('scripts/docs.mjs');
 assert(fs.readFileSync(path.join(REPO_ROOT,'views/week.html'),'utf8').includes('Orchard week'));
 assert(fs.readdirSync(path.join(REPO_ROOT,'docs-out/spray-diary')).length>=5);
 console.log(`PASS: ${pg?'PostgreSQL':'PGlite'} migrations, idempotent seed, all CLI paths, holds, ambiguity, import rollback, units, export, drafts and HTML. ${fs.readdirSync(path.join(REPO_ROOT,'.claude/commands')).filter(x=>x.endsWith('.md')&&x!=='README.md').length} slash commands.`);
}finally{await db?.close();fs.rmSync(temp,{recursive:true,force:true});}
