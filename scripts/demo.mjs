import {getDb} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {dispatch,printRows} from './research.mjs';
const db=await getDb();
try{
 await migrate(db);await seed(db);
 const study='10000000-0000-4000-8000-000000000001';
 const prior=await db.query('select id from decisions where study_id=$1',[study]);
 if(!prior.length)await dispatch(db,['add-decision','--study='+study,'--title=Fictional pilot price review','--price=28','--rationale=Use the stated perceptions to plan a small separately approved pilot','--evidence=Fictional demo brief v1','--review-on='+new Date(Date.now()+14*86400000).toISOString().slice(0,10),'--actor=Demo researcher']);
 for(const args of [['sample','--study='+study],['psm','--study='+study],['attention']])console.log('\n'+args[0]+'\n'+printRows(await dispatch(db,args)));
}finally{await db.close();}
