import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { databaseEnv } from './database-env.mjs';
const env=databaseEnv(process.env.TEST_DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(env.PGHOST)||!/^ohana_(ci|test|workflow)/.test(env.PGDATABASE))throw new Error('Tests require an isolated local ohana_test/ohana_ci database.');
const regressionFiles=readdirSync('supabase/tests').filter(f=>f.endsWith('.sql')&&!['local-bootstrap.sql','legacy-sentinel.sql','verify-legacy.sql','order-workflow.sql','live-audit.sql'].includes(f)).sort();
const files=['supabase/tests/local-bootstrap.sql','supabase/baseline/catalog.sql','supabase/tests/legacy-sentinel.sql',...readdirSync('supabase/migrations').filter(f=>f>='20261006120000').sort().map(f=>`supabase/migrations/${f}`),'supabase/tests/order-workflow.sql',...regressionFiles.map(f=>`supabase/tests/${f}`)];
execFileSync('psql',['-X','-v','ON_ERROR_STOP=1',...files.flatMap(f=>['-f',f])],{env,stdio:'inherit'});
console.log('Baseline, additive migrations and permission/workflow tests passed.');

execFileSync('psql',['-X','-v','ON_ERROR_STOP=1','-f','supabase/tests/verify-legacy.sql'],{env,stdio:'inherit'});
