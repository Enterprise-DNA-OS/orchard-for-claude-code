#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table } from './lib/format.mjs';

export const tables=['blocks','workers','sprays','harvests','labour','tasks','irrigation','notes'];
export const readQueries={
 'blocks':'select code,name,crop,variety,hectares,planned_pick,gap_expires from blocks order by code',
 'workers':'select code,name,training_expires from workers order by code',
 'spray-diary':`select s.ref,b.code block,w.name operator,s.product,s.applied_at,s.amount,s.unit,s.wind_speed_kmh,s.wind_direction,s.whp_days,s.rei_hours,s.label_ref from sprays s join blocks b on b.id=s.block_id join workers w on w.id=s.worker_id order by s.applied_at desc`,
 'harvest-plan':'select code,block,planned_pick,pick_after,enter_after,unknown_rules,decision from block_readiness order by planned_pick nulls last,code',
 'harvests':'select h.ref,b.code block,h.picked_at,h.bins,h.kg,h.destination,h.docket,h.status from harvests h join blocks b on b.id=h.block_id order by picked_at desc',
 'labour-review':'select b.code block,w.name worker,l.worked_on,l.activity,l.hours,l.cost from labour l join blocks b on b.id=l.block_id join workers w on w.id=l.worker_id order by l.worked_on desc,b.code',
 'irrigation':'select b.code block,i.watered_on,i.source,i.litres from irrigation i join blocks b on b.id=i.block_id order by watered_on desc',
 'tasks':'select t.ref,b.code block,t.title,t.due,t.owner,t.status from tasks t join blocks b on b.id=t.block_id order by due,ref',
 'yields':'select code,block,variety,kg,kg_per_hectare,bins,round(hours,2) hours,labour_cost,labour_cost_per_kg,irrigation_litres,litres_per_kg from block_performance order by code',
 'attention':'select * from orchard_attention order by priority,block,issue',
 'notes':'select b.code block,n.body,n.created_at from notes n join blocks b on b.id=n.block_id order by n.created_at desc'
};
const source='https://www.growsafe.co.nz/Growsafe/Growsafe/Rsrc/Record-keeping.aspx';
const mpi='https://www.mpi.govt.nz/dmsdocument/19481/direct';
export async function compliance(db){
 const rows=[];
 const checks=[
  ['SPRAY_RECORD','Record guidance',source,`select s.ref reference,b.code block from sprays s join blocks b on b.id=s.block_id where s.wind_speed_kmh is null or nullif(trim(s.wind_direction),'') is null or nullif(trim(s.boundary_measures),'') is null or nullif(trim(b.workplace_address),'') is null`],
  ['LABEL_RULE','Label review',mpi,`select s.ref reference,b.code block from sprays s join blocks b on b.id=s.block_id where whp_days is null or rei_hours is null or nullif(trim(label_ref),'') is null`],
  ['PICK_HOLD','Recorded interval',mpi,`select distinct h.ref reference,b.code block from harvests h join blocks b on b.id=h.block_id join sprays s on s.block_id=h.block_id and s.applied_at<=h.picked_at where s.whp_days is null or s.rei_hours is null or nullif(trim(s.label_ref),'') is null or h.picked_at<s.applied_at+s.whp_days*interval '1 day' or h.picked_at<s.applied_at+s.rei_hours*interval '1 hour'`],
  ['TRAINING','House policy','docs/compliance.md#house-policies',`select s.ref reference,b.code block from sprays s join blocks b on b.id=s.block_id join workers w on w.id=s.worker_id where w.training_expires is null or w.training_expires<s.applied_at::date`],
  ['TRACE','House policy','docs/compliance.md#house-policies',`select h.ref reference,b.code block from harvests h join blocks b on b.id=h.block_id where nullif(trim(h.destination),'') is null or nullif(trim(h.docket),'') is null`],
  ['DIARY_REVIEW','House policy','docs/compliance.md#house-policies',`select code reference,code block from blocks where diary_reviewed is null or diary_reviewed<current_date-7`],
  ['GAP_EVIDENCE','Programme review','docs/compliance.md#house-policies',`select code reference,code block from blocks where gap_expires is null or gap_expires<current_date`]
 ];
 for(const [rule,basis,source,sql] of checks){const found=await db.query(sql);rows.push(...(found.length?found.map(x=>({rule,result:'REVIEW',...x,basis,source})):[{rule,result:'CLEAR',reference:'',block:'',basis,source}]));}
 return rows;
}
export function parseArgs(args){const o={},pos=[];for(const a of args){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in o)throw Error(`Repeated option --${k}`);o[k]=i<0?true:a.slice(i+1);}else pos.push(a);}return {o,pos};}
const req=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}=value`);return o[k].trim();};
function number(v,name,min=0,integer=false){if(v===undefined||v===null||String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)<min||(integer&&!Number.isInteger(Number(v))))throw Error(`Invalid ${name}`);return Number(v);}
function date(v,name='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error(`Invalid ${name}: use YYYY-MM-DD`);return v;}
function instant(v){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Use a timestamp with timezone, e.g. 2026-10-04T08:00:00+13:00');date(v.slice(0,10));return v;}
export async function resolve(db,tableName,needle){
 if(!tables.includes(tableName)||!needle)throw Error(`Missing ${tableName} reference`);
 const name=tableName==='blocks'||tableName==='workers'?'name':tableName==='tasks'?'title':'ref';
 const code=['blocks','workers'].includes(tableName)?'code':'ref';
 const rows=await db.query(`select * from ${tableName} where lower(${code})=lower($1) or lower(${name})=lower($1) or id::text like $2 or position(lower($1) in lower(${name}))>0 order by ${code}`,[needle,needle.toLowerCase()+'%']);
 const exact=rows.filter(x=>x[code].toLowerCase()===needle.toLowerCase()||x.id===needle||x[name].toLowerCase()===needle.toLowerCase());
 const found=exact.length?exact:rows;
 if(found.length!==1)throw Error(found.length?`Ambiguous ${tableName}: ${found.map(x=>`${x[code]} ${x[name]} (${x.id})`).join(', ')}`:`No ${tableName} matches ${needle}`);return found[0];
}
async function insert(db,t,fields){const keys=Object.keys(fields);return (await db.query(`insert into ${t} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(fields)))[0];}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function pickIssues(db,b,at){
 const [check]=await db.query(`select (select count(*) from sprays where block_id=$1 and applied_at<=$2::timestamptz and (whp_days is null or rei_hours is null or nullif(trim(label_ref),'') is null or applied_at+whp_days*interval '1 day'>$2::timestamptz or applied_at+rei_hours*interval '1 hour'>$2::timestamptz)) as holds`,[b.id,at]);
 const stale=!b.diary_reviewed||String(b.diary_reviewed).slice(0,10)<new Date(Date.parse(at)-7*86400000).toISOString().slice(0,10)||String(b.diary_reviewed).slice(0,10)>at.slice(0,10);
 return Number(check.holds)>0||stale;
}
export async function run(db,args){
 const {o,pos}=parseArgs(args);const [cmd,sub]=pos;
 const allowed={
 'add block':['code','name','crop','variety','hectares','address','gap-expires','planned-pick'],
 'add worker':['code','name','training-expires'],'add task':['ref','block','title','due','owner'],
 'log spray':['ref','block','worker','product','at','amount','unit','wind-speed','wind-direction','boundary','whp-days','rei-hours','label'],
 'log harvest':['ref','block','at','bins','kg','destination','docket'],
 'log labour':['ref','block','worker','date','activity','hours','cost'],
 'log irrigation':['ref','block','date','source','litres'],'log note':['block','note'],
 'review-diary':['date','note'],'import croptracker':['file','mapping','dry-run'],'export':['out']
 };
 const opts=allowed[`${cmd} ${sub}`]||allowed[cmd]||[];
 for(const k of Object.keys(o))if(k!=='json'&&!opts.includes(k))throw Error(`Unknown option --${k}`);
 for(const k of ['json','dry-run'])if(k in o&&o[k]!==true)throw Error(`--${k} is a boolean flag without a value`);

 if(!cmd||cmd==='help')return [{commands:[...Object.keys(readQueries),'block <ref>','trace <ref>','compliance','add block|worker|task','log spray|harvest|labour|irrigation|note','complete <task>','review-diary <block>','import croptracker --file=report.csv [--mapping=map.json] [--dry-run]','export [--out=file.json]','draft-weekly'].join('\n')}];
 if(cmd in readQueries)return db.query(readQueries[cmd]);
 if(cmd==='compliance')return compliance(db);
 if(cmd==='block'){const b=await resolve(db,'blocks',sub);return {block:b,readiness:await db.query('select * from block_readiness where id=$1',[b.id]),performance:await db.query('select * from block_performance where id=$1',[b.id]),notes:await db.query('select body,created_at from notes where block_id=$1 order by created_at desc',[b.id])};}
 if(cmd==='trace'){const h=await resolve(db,'harvests',sub);return {harvest:h,block:await db.query('select * from blocks where id=$1',[h.block_id]),sprays:await db.query('select ref,product,applied_at,whp_days,rei_hours,label_ref from sprays where block_id=$1 and applied_at<=$2 order by applied_at',[h.block_id,h.picked_at])};}
 if(cmd==='add'){
  if(sub==='block')return insert(db,'blocks',{code:req(o,'code'),name:req(o,'name'),crop:req(o,'crop'),variety:req(o,'variety'),hectares:number(req(o,'hectares'),'hectares',0.0001),workplace_address:req(o,'address'),gap_expires:o['gap-expires']?date(o['gap-expires']):null,planned_pick:o['planned-pick']?date(o['planned-pick']):null});
  if(sub==='worker')return insert(db,'workers',{code:req(o,'code'),name:req(o,'name'),training_expires:o['training-expires']?date(o['training-expires']):null});
  if(sub==='task'){const b=await resolve(db,'blocks',req(o,'block'));return insert(db,'tasks',{ref:req(o,'ref'),block_id:b.id,title:req(o,'title'),due:date(req(o,'due')),owner:req(o,'owner')});}
 }
 if(cmd==='review-diary'){const b=await resolve(db,'blocks',sub);const d=date(req(o,'date'));const today=new Date().toISOString().slice(0,10);if(d>today)throw Error('Diary review cannot be future dated');await insert(db,'notes',{block_id:b.id,body:`Diary reviewed ${d}: ${req(o,'note')}`});return db.query('update blocks set diary_reviewed=$1 where id=$2 returning code,diary_reviewed',[d,b.id]);}
 if(cmd==='complete'){const t=await resolve(db,'tasks',sub);return db.query("update tasks set status='done' where id=$1 returning ref,title,status",[t.id]);}
 if(cmd==='log'){
  const b=await resolve(db,'blocks',req(o,'block'));
  if(sub==='note')return insert(db,'notes',{block_id:b.id,body:req(o,'note')});
  const fields={ref:req(o,'ref'),block_id:b.id};
  if(sub==='harvest'){
   const at=instant(req(o,'at'));if(await pickIssues(db,b,at))throw Error('Harvest blocked: withholding/reentry interval, missing label rule, or diary review. Record imported history as held; never override a live pick.');
   return insert(db,'harvests',{...fields,picked_at:at,bins:number(req(o,'bins'),'bins',1,true),kg:number(req(o,'kg'),'kg',0.001),destination:req(o,'destination'),docket:req(o,'docket'),status:'recorded'});
  }
  if(sub==='spray'){
   const worker=await resolve(db,'workers',req(o,'worker'));const at=instant(req(o,'at'));
   if(!worker.training_expires||worker.training_expires<at.slice(0,10))throw Error('Operator training missing or expired under house policy');
   return insert(db,'sprays',{...fields,worker_id:worker.id,product:req(o,'product'),applied_at:at,amount:number(req(o,'amount'),'amount',0.0001),unit:req(o,'unit'),wind_speed_kmh:number(req(o,'wind-speed'),'wind speed'),wind_direction:req(o,'wind-direction'),boundary_measures:req(o,'boundary'),whp_days:number(req(o,'whp-days'),'withholding days',0,true),rei_hours:number(req(o,'rei-hours'),'reentry hours',0,true),label_ref:req(o,'label')});
  }
  if(sub==='labour'){const worker=await resolve(db,'workers',req(o,'worker'));return insert(db,'labour',{...fields,worker_id:worker.id,worked_on:date(req(o,'date')),activity:req(o,'activity'),hours:number(req(o,'hours'),'hours',0.001),cost:number(req(o,'cost'),'cost')});}
  if(sub==='irrigation')return insert(db,'irrigation',{...fields,watered_on:date(req(o,'date')),source:req(o,'source'),litres:number(req(o,'litres'),'litres',0.001)});
 }
 if(cmd==='import'&&sub==='croptracker')return importHarvest(db,o);
 if(cmd==='export'){
  const data={version:1,exported_at:new Date().toISOString(),data:{}};for(const t of tables)data.data[t]=await db.query(`select * from ${t} order by id`);
  const out=path.resolve(REPO_ROOT,o.out||`exports/orchard-${Date.now()}.json`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(data,null,2),{flag:'wx'});return {file:out,counts:Object.fromEntries(tables.map(t=>[t,data.data[t].length]))};
 }
 if(cmd==='draft-weekly'){
  const out=path.join(REPO_ROOT,'drafts',`weekly-${Date.now()}.md`);fs.mkdirSync(path.dirname(out),{recursive:true});
  const sections=[];for(const c of ['attention','harvest-plan','yields'])sections.push(`## ${c}\n\n${format(await db.query(readQueries[c]))}`);
  fs.writeFileSync(out,'# Orchard weekly review\n\nDraft. Demo data if seeded. Review before sharing.\n\n'+sections.join('\n\n'));return {file:out,sent:false};
 }
 throw Error('Unknown command. Run orchard help.');
}
const aliases={ref:['Harvest Code','Harvest ID','Harvest Ref','Lot Code','ref'],block:['Farm/Block/Row','Block','Block Code','Location'],picked_at:['Harvest Date','Date','picked_at'],bins:['Amount','Bins','Bin Count'],kg:['Weight','Weight (kg)','Weight kg','kg'],destination:['Destination','Customer'],docket:['Docket','Docket Number']};
async function importHarvest(db,o){
 const rows=parseCsv(fs.readFileSync(req(o,'file'),'utf8'),{allowDuplicate:['On Hand']});if(!rows.length)throw Error('CSV has no records');
 const mapping=o.mapping?JSON.parse(fs.readFileSync(o.mapping,'utf8')):{};
 for(const k of Object.keys(mapping))if(!(k in aliases))throw Error(`Unknown mapping field: ${k}`);
 const get=(r,k)=>{const names=mapping[k]?[mapping[k]]:aliases[k];const found=Object.keys(r).filter(h=>names.some(n=>n.toLowerCase()===h.toLowerCase()));if(found.length>1)throw Error(`Ambiguous columns for ${k}; provide --mapping`);return found.length?r[found[0]].trim():'';};
 const prepared=[],seen=new Set();
 for(const [i,row] of rows.entries()){
  const v=Object.fromEntries(Object.keys(aliases).map(k=>[k,get(row,k)]));
  for(const k of ['ref','block','picked_at','bins','kg'])if(!v[k])throw Error(`CSV row ${i+2}: missing ${k}`);
  if(seen.has(v.ref))throw Error(`Duplicate harvest reference ${v.ref}`);seen.add(v.ref);
  const b=await resolve(db,'blocks',v.block);v.block_id=b.id;
  // Date-only vendor exports do not prove clearance within that day. All imports stay held.
  v.picked_at=/^\d{4}-\d{2}-\d{2}$/.test(v.picked_at)?date(v.picked_at)+'T00:00:00Z':instant(v.picked_at);
  v.bins=number(v.bins,'bins',1,true);v.kg=number(v.kg,'kg',0.001);
  const field=(name)=>Object.entries(row).find(([k])=>k.toLowerCase()===name.toLowerCase())?.[1]?.trim().toLowerCase();
  const genericWeight=Object.keys(row).some(k=>k.toLowerCase()==='weight')&&!mapping.kg;
  const weightUnit=field('Weight Unit');
  if(weightUnit||genericWeight){const factors={kg:1,kilogram:1,kilograms:1,g:0.001,grams:0.001,gram:0.001,lb:0.45359237,lbs:0.45359237,pounds:0.45359237};if(!(weightUnit in factors))throw Error(`CSV row ${i+2}: unknown Weight Unit`);v.kg=Number((v.kg*factors[weightUnit]).toFixed(6));if(v.kg<=0)throw Error('Weight too small');}
  if(Object.keys(row).some(k=>k.toLowerCase()==='amount')&&!mapping.bins&&!['bin','bins'].includes(field('Unit')))throw Error(`CSV row ${i+2}: Unit must be bins; other containers require mapping`);
  prepared.push(v);
 }
 return transaction(db,async()=>{
  let inserted=0,unchanged=0;
  for(const v of prepared){
   const existing=await db.query('select * from harvests where ref=$1',[v.ref]);
   if(existing.length){const h=existing[0];if(h.block_id!==v.block_id||new Date(h.picked_at).getTime()!==Date.parse(v.picked_at)||Number(h.bins)!==v.bins||Number(h.kg)!==v.kg||(h.destination||'')!==v.destination||(h.docket||'')!==v.docket)throw Error(`Conflicting history for ${v.ref}; reconcile before importing`);unchanged++;continue;}
   await insert(db,'harvests',{ref:v.ref,block_id:v.block_id,picked_at:v.picked_at,bins:v.bins,kg:v.kg,destination:v.destination||null,docket:v.docket||null,status:'held'});inserted++;
  }
  return {rows:prepared.length,inserted,unchanged,dry_run:Boolean(o['dry-run']),status:'Imported history held for review; no harvest release or dispatch action exists'};
 },Boolean(o['dry-run']));
}
export function format(value){
 if(Array.isArray(value)){if(!value.length)return '(none)';return table(value,Object.keys(value[0]).map(key=>({key,label:key.replaceAll('_',' '),format:v=>v instanceof Date?v.toISOString():typeof v==='object'&&v!==null?JSON.stringify(v):v})));}
 return JSON.stringify(value,null,2);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
