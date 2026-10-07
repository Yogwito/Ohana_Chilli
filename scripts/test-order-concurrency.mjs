import { spawn,execFileSync } from 'node:child_process';
import { databaseEnv } from './database-env.mjs';
const env=databaseEnv(process.env.TEST_DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(env.PGHOST)||!/^ohana_(ci|test|workflow)/.test(env.PGDATABASE))throw new Error('Isolated local test database required');
const sql=text=>execFileSync('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',text],{env,encoding:'utf8'}).trim();
const concurrent=text=>new Promise(resolve=>{
 const child=spawn('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',text],{env});let output='',error='';
 child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk);child.on('close',code=>resolve({code,output:output.trim(),error}));
});
const actor='00000000-0000-0000-0000-000000000091';
let oid;
try{
 sql(`INSERT INTO auth.users(id) VALUES('${actor}'); INSERT INTO public.user_roles(user_id,role) VALUES('${actor}','admin');
 INSERT INTO public.brands(id,name) VALUES('concurrency','Test'); INSERT INTO public.categories(id,brand_id,name) VALUES('concurrency','concurrency','Test');
 INSERT INTO public.products(id,brand_id,category_id,name,price_cents) VALUES('concurrency','concurrency','concurrency','Test',10000);`);
 const request=JSON.stringify({customer_name:'Concurrency test',phone:'3001234567',order_type:'pickup',payment_method:'cash',items:[{type:'product',product_id:'concurrency',quantity:1}]});
 const quote=JSON.parse(sql(`SELECT public.order_quote('${request}')`));
 const create=`SELECT public.order_create('${request}','00000000-0000-0000-0000-000000000092','${quote.fingerprint}','${'d'.repeat(64)}')`;
 const creates=await Promise.all([concurrent(`BEGIN; ${create}; SELECT pg_sleep(0.2); COMMIT;`),concurrent(create)]);
 if(creates.some(r=>r.code!==0))throw new Error('Concurrent creation failed');
 oid=sql("SELECT id FROM public.orders WHERE request_key='00000000-0000-0000-0000-000000000092'");
 if(sql(`SELECT count(*) FROM public.orders WHERE id='${oid}'`)!=='1')throw new Error('Concurrent creation duplicated order');
 const action=`SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT public.order_action('${oid}',0,'accept')`;
 const updates=await Promise.all([concurrent(`BEGIN; ${action}; SELECT pg_sleep(0.2); COMMIT;`),concurrent(action)]);
 if(updates.filter(r=>r.code===0).length!==1||!updates.some(r=>r.error.includes('version_conflict')))throw new Error('Concurrent updates did not produce conflict');
 console.log('Concurrent creation returns one order; concurrent status edits produce one success and one conflict.');
}finally{
 if(oid)sql(`DELETE FROM public.order_events WHERE order_id='${oid}'; DELETE FROM public.order_items WHERE order_id='${oid}'; DELETE FROM public.orders WHERE id='${oid}';`);
 sql(`DELETE FROM public.products WHERE id='concurrency'; DELETE FROM public.categories WHERE id='concurrency'; DELETE FROM public.brands WHERE id='concurrency'; DELETE FROM public.user_roles WHERE user_id='${actor}'; DELETE FROM auth.users WHERE id='${actor}';`);
}
