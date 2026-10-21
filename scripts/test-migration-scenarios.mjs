import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { databaseEnv } from './database-env.mjs';

const source = databaseEnv(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(source.PGHOST) || !/^ohana_(ci|test|workflow)/.test(source.PGDATABASE)) {
  throw new Error('Scenarios require an isolated local ohana_test/ohana_ci database URL.');
}

const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const baseline = 'supabase/migrations/20261005000000_prod_baseline.sql';
const migrations = readdirSync('supabase/migrations')
  .filter(file => file >= '20261006120000')
  .sort()
  .map(file => `supabase/migrations/${file}`);
const regressions = readdirSync('supabase/tests')
  .filter(file => file.endsWith('.sql') && !['local-bootstrap.sql', 'legacy-sentinel.sql', 'verify-legacy.sql', 'order-workflow.sql', 'live-audit.sql', 'prod-sentinel.sql', 'verify-prod-sentinel.sql'].includes(file))
  .sort()
  .map(file => `supabase/tests/${file}`);
// Production schema snapshot, restored as-is (as on the live project). Only lines that
// an older server would reject are dropped: transaction_timeout is PostgreSQL 17+.
const snapshotDir = mkdtempSync(join(tmpdir(), 'ohana-prod-snapshot-'));
const prodSnapshot = join(snapshotDir, 'prod_schema.sql');
const snapshotFile = readdirSync('supabase/baseline').filter(file => /^prod_schema_.*\.sql$/.test(file)).sort().at(-1);
writeFileSync(prodSnapshot, readFileSync(`supabase/baseline/${snapshotFile}`, 'utf8').split('\n').filter(line => !/^SET transaction_timeout\b/.test(line)).join('\n'));
const dropPublic = join(snapshotDir, 'drop_public.sql');
writeFileSync(dropPublic, 'DROP SCHEMA public CASCADE;\n');
const run = (command, args, env) => execFileSync(command, args, { env, stdio: 'inherit' });
const runSql = (env, files) => run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', ...files.flatMap(file => ['-f', file])], env);

const scenarios = [
  {
    // Baseline applied twice: proves it is idempotent (re-runnable without errors).
    name: 'A clean baseline (applied twice)',
    files: ['supabase/tests/local-bootstrap.sql', baseline, baseline, ...migrations, 'supabase/tests/order-workflow.sql', ...regressions],
  },
  {
    name: 'B prior baseline then additive upgrade',
    files: ['supabase/tests/local-bootstrap.sql', baseline],
    upgrade: [...migrations, 'supabase/tests/order-workflow.sql', ...regressions],
  },
  {
    name: 'C historical records preserved',
    files: ['supabase/tests/local-bootstrap.sql', baseline, 'supabase/tests/legacy-sentinel.sql'],
    upgrade: [...migrations, 'supabase/tests/order-workflow.sql', ...regressions, 'supabase/tests/verify-legacy.sql'],
  },
  {
    name: 'D production snapshot (prod-shaped rows) then additive upgrade',
    files: ['supabase/tests/local-bootstrap.sql', dropPublic, prodSnapshot, baseline, 'supabase/tests/prod-sentinel.sql'],
    upgrade: [...migrations, 'supabase/tests/verify-prod-sentinel.sql', 'supabase/tests/order-workflow.sql', ...regressions],
  },
];

try {
for (let index = 0; index < scenarios.length; index += 1) {
  const scenario = scenarios[index];
  const database = `ohana_test_migration_${suffix}_${index + 1}`;
  const env = { ...source, PGDATABASE: database };
  let created = false;
  try {
    run('createdb', [database], { ...source, PGDATABASE: 'postgres' });
    created = true;
    console.log(`Running scenario ${scenario.name}.`);
    runSql(env, scenario.files);
    if (scenario.upgrade) runSql(env, scenario.upgrade);
    console.log(`Scenario ${scenario.name} passed.`);
  } finally {
    if (created) run('dropdb', [database], { ...source, PGDATABASE: 'postgres' });
  }
}
} finally {
  rmSync(snapshotDir, { recursive: true, force: true });
}
