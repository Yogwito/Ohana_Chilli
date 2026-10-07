export function databaseEnv(url) {
  if(!url)throw new Error('DATABASE_URL is required');
  const parsed=new URL(url);
  if(!['postgres:','postgresql:'].includes(parsed.protocol))throw new Error('Invalid database URL');
  return {...process.env,PGHOST:parsed.hostname,PGPORT:parsed.port||'5432',PGUSER:decodeURIComponent(parsed.username),PGPASSWORD:decodeURIComponent(parsed.password),PGDATABASE:decodeURIComponent(parsed.pathname.slice(1)),PGSSLMODE:parsed.searchParams.get('sslmode')||(parsed.hostname==='localhost'||parsed.hostname==='127.0.0.1'?'prefer':'require')};
}
