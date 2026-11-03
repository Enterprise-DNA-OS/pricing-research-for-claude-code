#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {summary,curves} from './lib/analysis.mjs';
import {importConjointly} from './lib/import-conjointly.mjs';
export const commands={
 help:[],studies:[],study:['study'],sample:['study'],responses:['study','segment'],segments:['study'],
 curves:['study','segment'],psm:['study','segment'],'segment-review':['study'],quality:['study'],attention:[],compliance:[],
 actions:['study'],decisions:['study'],imports:['study'],history:['study'],
 'add-study':['name','currency','unit','owner','purpose','notice-ref','access-review','retention-review','review-due','min-sample','actor'],
 'review-study':['study','notice-ref','access-review','retention-review','review-due','actor'],
 'review-response':['study','response','excluded','reason','actor'],
 'add-action':['study','title','owner','due','actor'],
 'close-action':['action','evidence','actor'],
 'add-decision':['study','title','price','rationale','evidence','review-on','actor'],
 log:['study','text','actor'],import:['study','file','map','expected-count','source-ref','actor','dry-run'],
 export:['file'],'draft-review':['study']
};
export function parse(args){const o={},pos=[];for(const a of args){if(a.startsWith('--')){const [k,...v]=a.slice(2).split('=');if(Object.hasOwn(o,k))throw Error(`Duplicate flag --${k}`);o[k]=v.length?v.join('='):true;}else pos.push(a);}const cmd=pos[0]||'help';if(!commands[cmd])throw Error(`Unknown command ${cmd}; run help`);if(pos.length>1&&!(cmd==='import'&&pos.length===2&&pos[1]==='conjointly'))throw Error('Unexpected argument');if(cmd==='import'&&pos[1]!=='conjointly')throw Error('Use import conjointly');for(const k of Object.keys(o)){if(k!=='json'&&!commands[cmd].includes(k))throw Error(`Unknown flag --${k} for ${cmd}`);if(['json','dry-run'].includes(k)&&o[k]!==true)throw Error(`--${k} is a switch, without a value`);}return {cmd,o};}
function need(o,...keys){for(const k of keys)if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}=value`);}
function day(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Date must be a real YYYY-MM-DD date');return s;}
function amount(s){if(!/^\d+(?:\.\d{1,4})?$/.test(s)||Number(s)>=1e10)throw Error('Price must be a nonnegative plain decimal');return Number(s);}
async function match(db,table,label,value,scope=null){if(typeof value!=='string'||!value.trim())throw Error(`A ${table} reference is required`);const params=[value];let where='';if(scope){params.push(scope);where=' and study_id=$2';}const rows=await db.query(`select id,${label} as name from ${table} where (left(id::text,length($1))=lower($1) or lower(${label})=lower($1))${where} order by id`,params);if(rows.length!==1)throw Error(`${rows.length?'Ambiguous':'No matching'} ${table}: ${value}\n${rows.map(r=>r.id+' '+r.name).join('\n')}`);return rows[0].id;}
export function printRows(rows){if(!rows.length)return '(none)';const ks=Object.keys(rows[0]);const values=rows.map(r=>ks.map(k=>r[k]==null?'':typeof r[k]==='object'?JSON.stringify(r[k]):String(r[k])));const widths=ks.map((k,i)=>Math.max(k.length,...values.map(r=>r[i].length)));return [ks.map((k,i)=>k.padEnd(widths[i])).join(' | '),widths.map(n=>'-'.repeat(n)).join('-|-'),...values.map(r=>r.map((s,i)=>s.padEnd(widths[i])).join(' | '))].join('\n');}
async function studyFor(db,o){need(o,'study');const id=await match(db,'studies','name',o.study);return (await db.query('select * from studies where id=$1',[id]))[0];}
async function eligible(db,s,segment){return db.query("select * from v_response_quality where study_id=$1 and quality='eligible' and ($2::text is null or segment=$2) order by respondent_key",[s.id,segment??null]);}
async function event(db,s,cmd,o){await db.query('insert into events(study_id,kind,actor,detail) values($1,$2,$3,$4)',[s?.id??null,cmd,o.actor,JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k])=>!['actor','file','map'].includes(k))))]);}
const mutations=new Set(['add-study','review-study','review-response','add-action','close-action','add-decision','log','import']);
export async function dispatch(db,args){
 const {cmd,o}=parse(args);
 if(cmd==='help')return Object.entries(commands).map(([command,flags])=>({command,options:flags.map(x=>'--'+x).join(' ')}));
 if(mutations.has(cmd)){need(o,'actor');await db.exec('BEGIN');try{const result=await execute(db,cmd,o);await db.exec('COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
 await db.exec('BEGIN READ ONLY');try{return await execute(db,cmd,o);}finally{await db.exec('ROLLBACK');}
}
async function execute(db,cmd,o){
 if(cmd==='studies')return db.query('select id,name,currency,price_unit,owner,review_due from studies order by name,id');
 if(cmd==='attention')return db.query('select study,kind,owner,item,due_on from v_attention order by study,kind,item');
 if(cmd==='compliance')return db.query('select s.name,c.rule,c.issue from v_compliance c join studies s on s.id=c.study_id order by s.name,c.rule');
 if(cmd==='add-study'){
  need(o,'name','currency','unit','owner','purpose','review-due');if(!/^[A-Z]{3}$/.test(o.currency))throw Error('Use a three-letter uppercase currency');
  const min=Number(o['min-sample']??30);if(!Number.isInteger(min)||min<2||min>100000)throw Error('min-sample must be an integer between 2 and 100000');
  const [s]=await db.query('insert into studies(name,currency,price_unit,owner,purpose,notice_ref,access_review_on,retention_review_on,review_due,min_sample) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *',[o.name,o.currency,o.unit,o.owner,o.purpose,o['notice-ref']??'',o['access-review']?day(o['access-review']):null,o['retention-review']?day(o['retention-review']):null,day(o['review-due']),min]);await event(db,s,cmd,o);return [{id:s.id,name:s.name}];
 }
 if(cmd==='close-action'){need(o,'action','evidence');const id=await match(db,'actions','title',o.action);const [a]=await db.query("update actions set status='closed',closure_evidence=$1,closed_by=$2 where id=$3 and status='open' returning *",[o.evidence,o.actor,id]);if(!a)throw Error('Action is already closed');await event(db,{id:a.study_id},cmd,o);return [{id,status:a.status}];}
 if(cmd==='export'){
  need(o,'file');const data={format:'pricing-research-v1',exported_at:new Date().toISOString()};for(const t of ['studies','imports','responses','response_reviews','actions','decisions','notes','events'])data[t]=await db.query(`select * from ${t} order by id`);
  fs.mkdirSync(path.dirname(path.resolve(o.file)),{recursive:true,mode:0o700});fs.writeFileSync(o.file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});return [{file:o.file,studies:data.studies.length,responses:data.responses.length}];
 }
 const s=await studyFor(db,o);
 const queries={study:'select * from studies where id=$1',sample:'select name,currency,price_unit,imported,eligible,excluded,min_sample from v_sample where study_id=$1',responses:'select id,respondent_key,segment,completed,too_cheap,cheap,expensive,too_expensive,quality from v_response_quality where study_id=$1 order by respondent_key',segments:'select segment,imported,eligible,excluded from v_segments where study_id=$1 order by segment',quality:"select id,respondent_key,segment,quality,review_reason from v_response_quality where study_id=$1 and quality<>'eligible' order by respondent_key",actions:'select id,title,owner,due_on,status,closure_evidence from actions where study_id=$1 order by due_on,id',decisions:'select id,title,proposed_price,rationale,evidence_ref,actor,review_on,snapshot from decisions where study_id=$1 order by created_at,id',imports:'select id,file_sha256,source_ref,source_count,inserted_count,actor from imports where study_id=$1 order by created_at,id',history:'select kind,actor,detail,created_at from events where study_id=$1 order by created_at,id'};
 if(queries[cmd]){const rows=await db.query(queries[cmd],[s.id]);return cmd==='responses'&&o.segment?rows.filter(r=>r.segment===o.segment):rows;}
 if(cmd==='curves'||cmd==='psm'){const rs=await eligible(db,s,o.segment);return cmd==='psm'?summary(rs,s,o.segment):curves(rs).map(r=>({...r,currency:s.currency,unit:s.price_unit,status:rs.length<s.min_sample?'below minimum: exploratory only':'exploratory price perceptions'}));}
 if(cmd==='segment-review'){const groups=await db.query('select distinct segment from responses where study_id=$1 order by segment',[s.id]);const out=[];for(const {segment} of groups)out.push(...summary(await eligible(db,s,segment),s,segment));return out;}
 if(cmd==='review-study'){
  const fieldMap={'notice-ref':'notice_ref','access-review':'access_review_on','retention-review':'retention_review_on','review-due':'review_due'};const ks=Object.keys(fieldMap).filter(k=>o[k]!==undefined);if(!ks.length)throw Error('Supply a review field');for(const k of ks)need(o,k);
  const values=ks.map(k=>k==='notice-ref'?o[k]:day(o[k]));values.push(s.id);await db.query(`update studies set ${ks.map((k,i)=>fieldMap[k]+'=$'+(i+1)).join(',')} where id=$${values.length}`,values);await event(db,s,cmd,o);return [{id:s.id,updated:ks.join(', ')}];
 }
 if(cmd==='review-response'){need(o,'response','excluded','reason');if(!['true','false'].includes(o.excluded))throw Error('excluded must be true or false');const id=await match(db,'responses','respondent_key',o.response,s.id);const result=await db.query('insert into response_reviews(response_id,excluded,reason,actor) values($1,$2,$3,$4) returning id',[id,o.excluded==='true',o.reason,o.actor]);await event(db,s,cmd,o);return result;}
 if(cmd==='add-action'){need(o,'title','owner','due');const r=await db.query('insert into actions(study_id,title,owner,due_on) values($1,$2,$3,$4) returning id,title',[s.id,o.title,o.owner,day(o.due)]);await event(db,s,cmd,o);return r;}
 if(cmd==='add-decision'){
  need(o,'title','price','rationale','evidence','review-on');const sample=await eligible(db,s);if(sample.length<s.min_sample)throw Error('Eligible sample below minimum; pricing decision withheld');
  const snapshot={method:'van-westendorp-inclusive-linear-v1',study:{name:s.name,currency:s.currency,unit:s.price_unit,min_sample:s.min_sample},sample_ids:sample.map(r=>r.id),sample_hashes:sample.map(r=>r.evidence_hash),results:summary(sample,s),curves:curves(sample),note:'Exploratory perceptions, not a demand or profit forecast'};
  const r=await db.query('insert into decisions(study_id,title,proposed_price,rationale,evidence_ref,actor,review_on,snapshot) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,title',[s.id,o.title,amount(o.price),o.rationale,o.evidence,o.actor,day(o['review-on']),JSON.stringify(snapshot)]);await event(db,s,cmd,o);return r;
 }
 if(cmd==='log'){need(o,'text');const r=await db.query('insert into notes(study_id,body,actor) values($1,$2,$3) returning id,body',[s.id,o.text,o.actor]);await event(db,s,cmd,o);return r;}
 if(cmd==='import'){need(o,'file','map','expected-count','source-ref');const r=await importConjointly(db,s,o);if(!o['dry-run']&&r[0].inserted)await event(db,s,cmd,o);return r;}
 if(cmd==='draft-review'){
  const sections=[['Sample',await db.query(queries.sample,[s.id])],['Price perceptions',summary(await eligible(db,s),s)],['Attention',await db.query('select kind,owner,item,due_on from v_attention where study_id=$1 order by kind,item',[s.id])]];
  const folder=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(folder,{recursive:true,mode:0o700});const file=path.join(folder,`${s.id}-${Date.now()}.md`);
  fs.writeFileSync(file,`# ${s.name}\n\nPrivate research review. Fictional if using the demo. Price perceptions are not forecasts.\n\n`+sections.map(([title,rows])=>`## ${title}\n\n\`\`\`text\n${printRows(rows)}\n\`\`\`\n`).join('\n'),{flag:'wx',mode:0o600});return [{file}];
 }
 throw Error('Unimplemented command '+cmd);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{parse(process.argv.slice(2));db=await getDb();const rows=await dispatch(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(rows,null,2):printRows(rows));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
