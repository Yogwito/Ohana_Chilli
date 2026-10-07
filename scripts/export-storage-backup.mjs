// Explicitly-authorized Supabase Storage export. Do not run against production
// until the backup operator has approved both credentials and destination.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, createWriteStream, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STORAGE_BACKUP_OUTPUT_DIR'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);
if (process.env.STORAGE_BACKUP_CONFIRMATION !== 'EXPORT_STORAGE_BACKUP') {
  throw new Error('Set STORAGE_BACKUP_CONFIRMATION=EXPORT_STORAGE_BACKUP after approving the target project and destination');
}

const base = process.env.SUPABASE_URL.replace(/\/$/, '');
const output = resolve(process.env.STORAGE_BACKUP_OUTPUT_DIR);
if (output === resolve('.') || output === resolve('public') || output === resolve('src')) throw new Error('STORAGE_BACKUP_OUTPUT_DIR must be a dedicated backup directory');
mkdirSync(output, { recursive: true, mode: 0o700 });
const headers = { authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY };
const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Storage request failed (${response.status})`);
  return response;
};
const safePath = (value) => {
  const segments = value.split('/');
  if (!value || segments.some(segment => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) throw new Error('Unsafe storage object path');
  const destination = resolve(output, ...segments);
  if (!destination.startsWith(`${output}${sep}`)) throw new Error('Storage object escaped backup directory');
  return destination;
};
const listObjects = async (bucket, prefix = '') => {
  const response = await request(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  const entries = await response.json();
  const results = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null && !entry.metadata) results.push(...await listObjects(bucket, path));
    else results.push({ path, metadata: entry.metadata || {}, updated_at: entry.updated_at || null });
  }
  return results;
};
const buckets = process.env.STORAGE_BACKUP_BUCKETS
  ? process.env.STORAGE_BACKUP_BUCKETS.split(',').map(value => value.trim()).filter(Boolean).map(name => ({ name }))
  : await (await request('/storage/v1/bucket')).json();
const capturedAt = new Date().toISOString();
const objects = [];
for (const bucket of buckets) {
  const name = bucket.name;
  if (!name) continue;
  for (const item of await listObjects(name)) {
    const localPath = safePath(join(name, item.path));
    mkdirSync(dirname(localPath), { recursive: true, mode: 0o700 });
    const response = await request(`/storage/v1/object/${encodeURIComponent(name)}/${item.path.split('/').map(encodeURIComponent).join('/')}`);
    if (!response.body) throw new Error('Storage object had no body');
    const hash = createHash('sha256');
    const stream = createWriteStream(localPath, { mode: 0o600 });
    await pipeline(Readable.fromWeb(response.body), async function* (source) { for await (const chunk of source) { hash.update(chunk); yield chunk; } }, stream);
    objects.push({ bucket: name, path: item.path, size_bytes: Number(response.headers.get('content-length')) || null, sha256: hash.digest('hex'), content_type: response.headers.get('content-type'), cache_control: response.headers.get('cache-control'), updated_at: item.updated_at, metadata: item.metadata });
  }
}
const manifest = { version: 1, captured_at: capturedAt, source_project: new URL(base).host, buckets: buckets.map(bucket => ({ name: bucket.name, public: Boolean(bucket.public) })), objects };
writeFileSync(join(output, 'storage-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ buckets: manifest.buckets.length, objects: objects.length, manifest: relative(process.cwd(), join(output, 'storage-manifest.json')) }));
