// Offline CLI: imports a trusted, complete SQL export of the latest schema only.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, renameSync, unlinkSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { databasePath, migrate } from '../lib/node-database.mjs';
const input=process.argv[2];if(!input)throw new Error('Usage: node scripts/import-d1.mjs /private/full-d1-export.sql');
const target=databasePath();if(existsSync(target))throw new Error('Target database already exists. Import only into a new DATA_DIR with the app stopped.');
const temporary=target+'.importing';if(existsSync(temporary))throw new Error('Previous import temporary file exists. Inspect it before retrying.');
const reference=new DatabaseSync(':memory:');migrate(reference);
const imported=new DatabaseSync(temporary);
try {
 imported.exec('PRAGMA foreign_keys=OFF;');
 imported.exec(readFileSync(input,'utf8'));
 if(imported.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Imported database integrity check failed');
 if(imported.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Imported database has broken relationships');
 const objects=reference.prepare("SELECT name,type FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '_node_migrations' AND sql IS NOT NULL").all();
 for(const object of objects){
  const match=imported.prepare('SELECT type FROM sqlite_master WHERE name=?').get(object.name);
  if(!match||match.type!==object.type)throw new Error('Missing schema object: '+object.name+'; export the latest complete D1 database');
  if(object.type==='table'){
   const escaped=object.name.replaceAll('"','""');
   const expected=reference.prepare('PRAGMA table_info("'+escaped+'")').all();
   const actual=imported.prepare('PRAGMA table_info("'+escaped+'")').all();
   if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('Schema mismatch: '+object.name);
  }
 }
 imported.exec('BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS _node_migrations(tag TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at TEXT NOT NULL);');
 for(const entry of JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')).entries){
  const hash=createHash('sha256').update(readFileSync('drizzle/'+entry.tag+'.sql')).digest('hex');
  imported.prepare('INSERT OR REPLACE INTO _node_migrations VALUES(?,?,?)').run(entry.tag,hash,new Date().toISOString());
 }
 // Require all imported users to sign in again on the new hostname.
 imported.exec('DELETE FROM sessions; DELETE FROM login_attempts; COMMIT;');
 imported.close();reference.close();chmodSync(temporary,0o600);renameSync(temporary,target);
 console.log('Verified database imported. Copy private attachments and preserve the original encryption key before starting.');
} catch(error){try{imported.close();reference.close();}catch{}try{unlinkSync(temporary);}catch{}throw error;}
