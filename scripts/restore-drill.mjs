import { execFileSync } from 'node:child_process';
import { mkdtempSync,rmSync,readFileSync,readdirSync } from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { databaseEnv } from './database-env.mjs';
const source=databaseEnv(process.env.TEST_DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(source.PGHOST)||!/^ohana_(test|ci)/.test(source.PGDATABASE))throw new Error('Isolated local test database required');
const targetName=`ohana_restore_${Date.now()}`;const target={...source,PGDATABASE:targetName};
const directory=mkdtempSync(join(tmpdir(),'ohana-restore-'));const archive=join(directory,'database.dump');
const sentinelId=randomUUID();
const run=(command,args,env)=>execFileSync(command,args,{env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
// Compare persisted snapshots without printing customer rows or tokens.
const snapshotSql="SELECT jsonb_build_object('orders',coalesce((SELECT md5(string_agg(md5(row_to_json(o)::text),'' ORDER BY id)) FROM public.orders o),''),'order_items',coalesce((SELECT md5(string_agg(md5(row_to_json(i)::text),'' ORDER BY id)) FROM public.order_items i),''))";
let targetCreated=false;
try{
 run('psql',['-X','-v','ON_ERROR_STOP=1','-c',`INSERT INTO public.orders(id,customer_name,phone,order_type,total_cents,notes) VALUES('${sentinelId}','Restore drill sentinel','3001234567','pickup',12345,'restore-drill-sentinel')`],source);
 const before=run('psql',['-X','-A','-t','-c','SELECT count(*) FROM public.orders'],source).trim();
 const beforeSnapshots=run('psql',['-X','-A','-t','-c',snapshotSql],source).trim();
 run('pg_dump',['--format=custom','--no-owner','--file',archive],source);
 const checksum=createHash('sha256').update(readFileSync(archive)).digest('hex');
 const contents=run('pg_restore',['--list',archive],source);
 if(!contents.includes('TABLE DATA public orders'))throw new Error('Archive missing orders data');
 run('createdb',[targetName],{...source,PGDATABASE:'postgres'});targetCreated=true;
 const started=performance.now();
 run('pg_restore',['--exit-on-error','--no-owner','--dbname',targetName,archive],target);
 const seconds=(performance.now()-started)/1000;
 const after=run('psql',['-X','-A','-t','-c','SELECT count(*) FROM public.orders'],target).trim();
 const afterSnapshots=run('psql',['-X','-A','-t','-c',snapshotSql],target).trim();
 const sentinel=run('psql',['-X','-A','-t','-c',`SELECT count(*) FROM public.orders WHERE id='${sentinelId}' AND total_cents=12345 AND payment_state='unknown'`],target).trim();
 if(before!==after||beforeSnapshots!==afterSnapshots||sentinel!=='1')throw new Error('Restore data verification failed');
 const tests=['order-workflow.sql',...readdirSync('supabase/tests').filter(file=>file.endsWith('.sql')&&!['local-bootstrap.sql','legacy-sentinel.sql','verify-legacy.sql','order-workflow.sql','live-audit.sql'].includes(file)).sort()];
 for(const file of tests)run('psql',['-X','-v','ON_ERROR_STOP=1','-f',`supabase/tests/${file}`],target);
 if(createHash('sha256').update(readFileSync(archive)).digest('hex')!==checksum)throw new Error('Archive changed during drill');
 console.log(JSON.stringify({restore_seconds:Number(seconds.toFixed(3)),row_counts_match:true,order_item_snapshots_match:true,historical_payment_preserved:true,permission_tests_pass:true,regression_files:tests.length,archive_readable:true,archive_sha256_verified:true,scope:'isolated-local-fixture-only'}));
}finally{
 try {
  run('psql',['-X','-v','ON_ERROR_STOP=1','-c',`DELETE FROM public.orders WHERE id='${sentinelId}'`],source);
 } finally {
  try { if(targetCreated)run('dropdb',[targetName],{...source,PGDATABASE:'postgres'}); }
  finally { rmSync(directory,{recursive:true,force:true}); }
 }
}
