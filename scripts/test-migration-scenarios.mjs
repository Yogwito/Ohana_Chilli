import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { databaseEnv } from './database-env.mjs';

const source = databaseEnv(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(source.PGHOST) || !/^ohana_(ci|test|workflow)/.test(source.PGDATABASE)) {
  throw new Error('Scenarios require an isolated local ohana_test/ohana_ci database URL.');
}

const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const migrations = readdirSync('supabase/migrations')
  .filter(file => file >= '20261006120000')
  .sort()
  .map(file => `supabase/migrations/${file}`);
const regressions = readdirSync('supabase/tests')
  .filter(file => file.endsWith('.sql') && !['local-bootstrap.sql', 'legacy-sentinel.sql', 'verify-legacy.sql', 'order-workflow.sql', 'live-audit.sql'].includes(file))
  .sort()
  .map(file => `supabase/tests/${file}`);
const run = (command, args, env) => execFileSync(command, args, { env, stdio: 'inherit' });
const runSql = (env, files) => run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', ...files.flatMap(file => ['-f', file])], env);

const scenarios = [
  {
    name: 'A clean baseline',
    files: ['supabase/tests/local-bootstrap.sql', 'supabase/baseline/catalog.sql', ...migrations, 'supabase/tests/order-workflow.sql', ...regressions],
  },
  {
    name: 'B prior baseline then additive upgrade',
    files: ['supabase/tests/local-bootstrap.sql', 'supabase/baseline/catalog.sql'],
    upgrade: [...migrations, 'supabase/tests/order-workflow.sql', ...regressions],
  },
  {
    name: 'C historical records preserved',
    files: ['supabase/tests/local-bootstrap.sql', 'supabase/baseline/catalog.sql', 'supabase/tests/legacy-sentinel.sql'],
    upgrade: [...migrations, 'supabase/tests/order-workflow.sql', ...regressions, 'supabase/tests/verify-legacy.sql'],
  },
];

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
