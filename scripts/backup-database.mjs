// Daily off-site backup. Credentials stay in environment variables; nothing sensitive is logged.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { databaseEnv } from './database-env.mjs';
if(!process.env.BACKUP_S3_BUCKET)throw new Error('BACKUP_S3_BUCKET required');
const directory=mkdtempSync(join(tmpdir(),'ohana-backup-'));
const file=join(directory,'database.dump');
const manifest=join(directory,'database-manifest.json');
try{
 execFileSync('pg_dump',['--format=custom','--no-owner','--file',file],{env:databaseEnv(process.env.DATABASE_URL),stdio:['ignore','ignore','pipe']});
 if(statSync(file).size<1024)throw new Error('Empty backup');
 const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
 const key=`ohana/${timestamp}`;
 const archiveSha256=createHash('sha256').update(readFileSync(file)).digest('hex');
 const pgVersion=execFileSync('pg_dump',['--version'],{encoding:'utf8'}).trim();
 writeFileSync(manifest,`${JSON.stringify({version:1,captured_at:new Date().toISOString(),archive:{key:`${key}.dump`,bytes:statSync(file).size,sha256:archiveSha256,format:'pg_dump custom',client:pgVersion},source_revision:process.env.GITHUB_SHA||null},null,2)}\n`,{mode:0o600});
 for(const [local,remote] of [[file,`${key}.dump`],[manifest,`${key}.manifest.json`]])execFileSync('aws',['s3','cp',local,`s3://${process.env.BACKUP_S3_BUCKET}/${remote}`,'--sse','AES256','--only-show-errors'],{stdio:['ignore','ignore','pipe']});
 console.log(JSON.stringify({database_backup_uploaded:true,archive_sha256:archiveSha256,manifest_uploaded:true}));
}catch{throw new Error('Database backup or upload failed. Inspect the backup job securely.');}
finally{rmSync(directory,{recursive:true,force:true});}
