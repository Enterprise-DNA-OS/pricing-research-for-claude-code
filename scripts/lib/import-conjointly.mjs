import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseCsv} from './csv.mjs';
export const hash=x=>createHash('sha256').update(x).digest('hex');
const required=['respondent_key','segment','completed','too_cheap','cheap','expensive','too_expensive'];
function number(s,row,key){if(s.trim()==='')return null;if(!/^\d+(?:\.\d{1,4})?$/.test(s)||Number(s)>=1e10)throw Error(`Row ${row}: ${key} must be a nonnegative plain decimal with at most four decimal places`);return Number(s);}
export async function importConjointly(db,study,o){
 const data=fs.readFileSync(o.file,'utf8'),map=JSON.parse(fs.readFileSync(o.map,'utf8')),rows=parseCsv(data);
 if(!Number.isInteger(Number(o['expected-count']))||Number(o['expected-count'])<1||rows.length!==Number(o['expected-count']))throw Error('Source row count does not match --expected-count');
 if(!map.columns||required.some(k=>!map.columns[k])||Object.keys(map.columns).some(k=>!required.includes(k)))throw Error('Mapping needs exactly the seven documented columns');
 if(new Set(Object.values(map.columns)).size!==required.length)throw Error('Each mapped column must be distinct');
 if(!Array.isArray(map.complete_values)||!Array.isArray(map.incomplete_values)||!map.complete_values.length||!map.incomplete_values.length||map.complete_values.some(x=>map.incomplete_values.includes(x)))throw Error('Mapping needs distinct complete_values and incomplete_values');
 if(map.currency!==study.currency||map.price_unit!==study.price_unit)throw Error('Mapping currency and price_unit must match the study');
 const seen=new Set(),normal=rows.map((raw,i)=>{
  for(const k of required)if(!Object.hasOwn(raw,map.columns[k]))throw Error(`Missing column: ${map.columns[k]}`);
  const v=Object.fromEntries(required.map(k=>[k,raw[map.columns[k]].trim()]));
  if(!v.respondent_key||!v.segment)throw Error(`Row ${i+2}: respondent key and segment required`);
  if(seen.has(v.respondent_key))throw Error(`Duplicate respondent key: ${v.respondent_key}`);seen.add(v.respondent_key);
  if(!map.complete_values.includes(v.completed)&&!map.incomplete_values.includes(v.completed))throw Error(`Row ${i+2}: unknown completion status`);
  v.completed=map.complete_values.includes(v.completed);
  for(const k of required.slice(3))v[k]=number(v[k]??'',i+2,k);
  return {...v,evidence_hash:hash(JSON.stringify(v))};
 });
 let added=0,skipped=0;const pending=[];
 for(const v of normal){const [old]=await db.query('select evidence_hash from responses where study_id=$1 and respondent_key=$2',[study.id,v.respondent_key]);if(old){if(old.evidence_hash!==v.evidence_hash)throw Error(`Changed evidence for respondent ${v.respondent_key}; use a new study for corrected data`);skipped++;}else{pending.push(v);added++;}}
 if(o['dry-run'])return [{source_rows:rows.length,inserted:added,unchanged:skipped,dry_run:true}];
 if(!added)return [{source_rows:rows.length,inserted:0,unchanged:skipped,dry_run:false}];
 const [batch]=await db.query('insert into imports(study_id,file_sha256,mapping,source_ref,actor,source_count,inserted_count) values($1,$2,$3,$4,$5,$6,$7) returning id',[study.id,hash(data),JSON.stringify(map),o['source-ref'],o.actor,rows.length,added]);
 for(const v of pending)await db.query('insert into responses(study_id,import_id,respondent_key,segment,completed,too_cheap,cheap,expensive,too_expensive,evidence_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[study.id,batch.id,v.respondent_key,v.segment,v.completed,v.too_cheap,v.cheap,v.expensive,v.too_expensive,v.evidence_hash]);
 return [{source_rows:rows.length,inserted:added,unchanged:skipped,dry_run:false}];
}
