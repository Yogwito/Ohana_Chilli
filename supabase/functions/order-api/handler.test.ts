// Network-free Edge integration tests: actual handler, mocked database/provider boundaries.
Deno.env.set('SUPABASE_URL','https://isolated.invalid');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','isolated-service-key');
Deno.env.set('SUPABASE_ANON_KEY','isolated-public-key');
Deno.env.set('APP_ORIGIN','https://shop.example');
Deno.env.set('RATE_LIMIT_SECRET','test-rate-secret');
Deno.env.set('RATE_LIMIT_TRUSTED_HEADER','x-trusted-client-ip');
Deno.env.set('TURNSTILE_SECRET_KEY','test-bot-secret');
Deno.env.set('WOMPI_EVENTS_SECRET','test-event-secret');
Deno.env.set('WOMPI_PRIVATE_KEY','prv_test_private');
const {handleRequest}=await import('./handler.ts');
const {sha256}=await import('../_shared/wompi.ts');
const assert=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
const request={customer_name:'Test',phone:'3001234567',order_type:'pickup',payment_method:'cash',items:[{type:'product',product_id:'test-product',quantity:1}]};
function req(route:string,body:unknown,origin='https://shop.example') {
 return new Request(`https://edge.example/order-api/${route}`,{method:'POST',headers:{origin,'Content-Type':'application/json','x-trusted-client-ip':'192.0.2.1'},body:JSON.stringify(body)});
}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
async function withFetch(mock:typeof fetch,run:()=>Promise<void>){const original=globalThis.fetch;globalThis.fetch=mock;try{await run();}finally{globalThis.fetch=original;}}
Deno.test('Edge rejects forged order fields and requires bot verification before creation',async()=>{
 let writes=0;let botValid=false;
 await withFetch(async(input,init)=>{
  const url=String(input);
  if(url.includes('order_rate_limit'))return json(true);
  if(url.includes('siteverify'))return json({success:botValid,hostname:'shop.example',action:'order'});
  if(url.includes('order_create')){writes++;const body=JSON.parse(String(init?.body));assert(!body.p_request.items[0].unit_price_cents,'browser price reached database');assert(body.p_tracking_hash!=='f'.repeat(64),'unhashed token');return json({id:'order',total:1000});}
  throw new Error('Unexpected network access');
 },async()=>{
  let response=await handleRequest(req('create',{request:{...request,items:[{...request.items[0],unit_price_cents:1}]}}));assert(response.status===400,'forged fields accepted');
  const body={request,idempotency_key:'00000000-0000-0000-0000-000000000001',tracking_token:'f'.repeat(64),quote:'a'.repeat(64),bot_token:'test-token'};
  response=await handleRequest(req('create',body));assert(response.status===403&&writes===0,'bot bypass');
  botValid=true;response=await handleRequest(req('create',body));assert(response.status===200&&writes===1,'verified creation failed');
 });
});
Deno.test('Edge rate limits guest requests and denies foreign origins',async()=>{
 await withFetch(async()=>json(false),async()=>{
  assert((await handleRequest(req('quote',{request}))).status===429,'rate limit bypass');
  assert((await handleRequest(req('quote',{request},'https://attacker.example'))).status===403,'foreign origin allowed');
 });
});
Deno.test('Analytics accepts only allowlisted metadata through the trusted rate-limited route',async()=>{
 let writes=0;
 await withFetch(async(input,init)=>{
  const url=String(input);
  if(url.includes('order_rate_limit')) return json(true);
  if(url.includes('track_analytics_event')) {
   writes++;
   const body=JSON.parse(String(init?.body));
   assert(body.p_event_type==='add_to_cart','analytics event type changed');
   assert(body.p_metadata.productId==='test-product','analytics metadata changed');
   assert(/^[a-f0-9]{64}$/.test(body.p_rate_key),'trusted rate key missing');
   return json(true);
  }
  throw new Error('Unexpected network access');
 },async()=>{
  const valid={event_type:'add_to_cart',metadata:{productId:'test-product',productName:'Test',brand:'ohana',priceCents:1000}};
  assert((await handleRequest(req('analytics',valid))).status===200&&writes===1,'valid analytics rejected');
  assert((await handleRequest(req('analytics',{event_type:'add_to_cart',metadata:{...valid.metadata,customer_phone:'3001234567'}}))).status===400&&writes===1,'forged analytics metadata accepted');
  assert((await handleRequest(req('analytics',valid,'https://attacker.example'))).status===403&&writes===1,'foreign analytics origin accepted');
 });
});
Deno.test('Analytics rate limit fails closed before its database write',async()=>{
 let writes=0;
 await withFetch(async(input)=>{
  const url=String(input);
  if(url.includes('order_rate_limit')) return json(false);
  if(url.includes('track_analytics_event')) writes++;
  return json(true);
 },async()=>{
  const body={event_type:'page_view',metadata:{page:'/'}};
  assert((await handleRequest(req('analytics',body))).status===429,'analytics rate limit bypassed');
  assert(writes===0,'rate-limited analytics reached database');
 });
});
Deno.test('Edge verifies webhook signature and re-fetches authoritative provider data',async()=>{
 const transaction={id:'trx-id',reference:'ref-id',amount_in_cents:100000,currency:'COP',status:'APPROVED',payment_method_type:'CARD'};
 const event={event:'transaction.updated',environment:'test',timestamp:123,data:{transaction},signature:{properties:['transaction.id','transaction.status','transaction.amount_in_cents'],checksum:await sha256('trx-idAPPROVED100000123test-event-secret')}};
 let providerCalls=0;let writes=0;
 await withFetch(async(input,init)=>{
  const url=String(input);
  if(url.includes('sandbox.wompi.co')){providerCalls++;assert(new Headers(init?.headers).get('Authorization')==='Bearer prv_test_private','provider private key missing');return json({data:transaction});}
  if(url.includes('order_payment_apply')){writes++;const body=JSON.parse(String(init?.body));assert(body.p_reference==='ref-id'&&body.p_amount===100000&&body.p_environment==='test','provider data mismatch');return json(null);}
  throw new Error('Unexpected network access');
 },async()=>{
  const forged={...event,signature:{...event.signature,checksum:'b'.repeat(64)}};
  assert((await handleRequest(req('webhook',forged))).status===403&&providerCalls===0,'forged webhook reached provider');
  assert((await handleRequest(req('webhook',{...event,environment:'prod'}))).status===403,'production event accepted');
  assert((await handleRequest(req('webhook',event))).status===200&&writes===1,'verified webhook failed');
  assert((await handleRequest(req('webhook',event))).status===200&&writes===2,'duplicate delivery failed before database idempotency');
 });
});
Deno.test('Online initiation disabled does not disable tracking or cash ordering',async()=>{
 Deno.env.set('ONLINE_PAYMENTS_ENABLED','false');
 await withFetch(async input=>{const url=String(input);if(url.includes('order_rate_limit'))return json(true);if(url.includes('order_track'))return json({reference:'test',status:'pending',payment_state:'unpaid'});if(url.includes('order_quote'))return json({total:1000,fingerprint:'a'.repeat(64)});throw new Error('Unexpected network access');},async()=>{
  assert((await handleRequest(req('payment',{token:'a'.repeat(64)}))).status===503,'disabled online payment initiated');
  assert((await handleRequest(req('track',{token:'a'.repeat(64)}))).status===200,'tracking disabled with payments');
  assert((await handleRequest(req('quote',{request}))).status===200,'cash quote disabled with payments');
 });
});
Deno.test('Staff routes reject missing authentication and reconcile rejects missing secret',async()=>{
 await withFetch(async()=>json({message:'invalid user'},401),async()=>{
  assert((await handleRequest(req('action',{id:'test'}))).status===401,'staff auth bypass');
  assert((await handleRequest(req('reconcile',{}))).status===401,'scheduler auth bypass');
 });
});
Deno.test('Staff action passes the explicit legacy transition through the authenticated API boundary',async()=>{
 let action='';
 await withFetch(async(input,init)=>{
  const url=String(input);
  if(url.includes('/auth/v1/user'))return json({id:'00000000-0000-0000-0000-000000000001'});
  if(url.includes('/rest/v1/rpc/has_role'))return json(true);
  if(url.includes('/rest/v1/rpc/order_action')){action=JSON.parse(String(init?.body)).p_action;return json({status:'confirmed',version:1});}
  throw new Error(`Unexpected network access: ${url}`);
 },async()=>{
  const response=await handleRequest(req('action',{id:'00000000-0000-0000-0000-000000000101',version:0,action:'accept_legacy',note:'Historical receipt reviewed'}));
  assert(response.status===200&&action==='accept_legacy','legacy transition rejected before the database');
 });
});
Deno.test('Promotion checkout passes only its identifier to authoritative quotes',async()=>{
 await withFetch(async(input,init)=>{
  const url=String(input);
  if(url.includes('order_rate_limit'))return json(true);
  if(url.includes('order_quote')){
   const body=JSON.parse(String(init?.body));
   assert(body.p_request.items[0].type==='promotion'&&body.p_request.items[0].promotion_id==='promo-id','promotion identifier missing');
   return json({total:1000});
  }
  throw new Error('Unexpected network access');
 },async()=>{
  const promotion={...request,items:[{type:'promotion',promotion_id:'promo-id',quantity:1}]};
  assert((await handleRequest(req('quote',{request:promotion}))).status===200,'promotion quote rejected');
  assert((await handleRequest(req('quote',{request:{...promotion,items:[{...promotion.items[0],unit_price_cents:1}]}}))).status===400,'promotion price forgery accepted');
 });
});
Deno.test('Reconciliation rotates 101 failing payments across polls with bounded concurrency',async()=>{
 Deno.env.set('RECONCILIATION_SECRET','scheduler-test');
 const attempts=Array.from({length:101},(_,index)=>({id:String(index).padStart(3,'0'),provider_id:`trx-${index}`,reference:`ref-${index}`,created_at:new Date().toISOString(),checked_at:null as string|null}));
 const visited=new Set<string>();let active=0;let maximum=0;let updates=0;
 await withFetch(async(input,init)=>{
  const url=new URL(String(input));
  if(url.hostname==='sandbox.wompi.co'){
   active++;maximum=Math.max(maximum,active);visited.add(url.pathname.split('/').pop()!);
   await new Promise(resolve=>setTimeout(resolve,1));active--;
   return json({error:'isolated provider failure'},503);
  }
  if(url.pathname.endsWith('/payment_attempts')){
   if(init?.method==='PATCH'){
    const attempt=attempts.find(value=>`eq.${value.id}`===url.searchParams.get('id'))!;
    attempt.checked_at=JSON.parse(String(init.body)).checked_at;updates++;return new Response(null,{status:204});
   }
   assert(url.searchParams.get('order')==='checked_at.asc.nullsfirst,id.asc','fair ordering missing');
   const sorted=[...attempts].sort((a,b)=>(a.checked_at||'').localeCompare(b.checked_at||'')||a.id.localeCompare(b.id));
   return json(sorted.slice(0,100));
  }
  if(url.pathname.endsWith('/orders')||url.pathname.endsWith('/order_refunds'))return new Response(null,{headers:{'Content-Range':'*/0'}});
  throw new Error('Unexpected network access');
 },async()=>{
  for(let index=0;index<2;index++){
   const request=req('reconcile',{});request.headers.set('Authorization','Bearer scheduler-test');
   const response=await handleRequest(request);const result=await response.json();
   assert(response.status===200&&result.reconciled===100&&result.failed===100,'failed poll outcomes not reported');
  }
  assert(visited.size===101,'later payment starved behind failures');
  assert(updates===200,'failed attempts did not rotate');
  assert(maximum<=5&&maximum>1,'provider concurrency not bounded or not parallel');
 });
});
Deno.test('Reconciliation timestamp failures return an error instead of false success',async()=>{
 Deno.env.set('RECONCILIATION_SECRET','scheduler-test');
 await withFetch(async(input,init)=>{
  const url=String(input);
  if(url.includes('sandbox.wompi.co'))return json({data:[]});
  if(url.includes('/payment_attempts')){
   if(init?.method==='PATCH')return json({message:'isolated update failure'},503);
   return json([{id:'test',provider_id:'test',reference:'test',created_at:new Date().toISOString()}]);
  }
  throw new Error('Unexpected network access');
 },async()=>{
  const request=req('reconcile',{});request.headers.set('Authorization','Bearer scheduler-test');
  const response=await handleRequest(request);
  assert(response.status===503,'rotation failure displayed success');
 });
});
Deno.test('Body limit rejects oversized headers and cancels streamed UTF-8 bodies before buffering all input',async()=>{
 let cancelled=false;let chunks=0;
 const stream=new ReadableStream<Uint8Array>({pull(controller){chunks++;controller.enqueue(new TextEncoder().encode('é'.repeat(15000)));},cancel(){cancelled=true;}});
 const streamed=new Request('https://edge.example/order-api/quote',{method:'POST',headers:{origin:'https://shop.example'},body:stream});
 assert((await handleRequest(streamed)).status===413,'stream byte limit bypassed');
 assert(cancelled&&chunks<=3,'oversized stream fully buffered');
 const declared=req('quote',{});declared.headers.set('content-length','50001');
 assert((await handleRequest(declared)).status===413,'declared oversized body accepted');
});
