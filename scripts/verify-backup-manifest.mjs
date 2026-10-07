import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const [manifestFile, objectDirectory] = process.argv.slice(2);
if (!manifestFile || !objectDirectory) throw new Error('Usage: node scripts/verify-backup-manifest.mjs <storage-manifest.json> <backup-directory>');
const root = resolve(objectDirectory);
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
if (!Array.isArray(manifest.objects)) throw new Error('Invalid storage manifest');
for (const object of manifest.objects) {
  const file = resolve(root, object.bucket, ...object.path.split('/'));
  if (!file.startsWith(`${root}${sep}`) || !existsSync(file)) throw new Error('Missing backup object');
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (hash !== object.sha256) throw new Error('Storage backup checksum mismatch');
  if (object.size_bytes !== null && statSync(file).size !== object.size_bytes) throw new Error('Storage backup size mismatch');
}
console.log(JSON.stringify({ verified_objects: manifest.objects.length, manifest_version: manifest.version, verified: true }));
