import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { nodeDatabase, rawDatabase, migrate, databasePath } from '../lib/node-database.mjs';
import { bucket } from '../lib/node-storage.mjs';
import { createInitialAdmin } from '../scripts/create-admin.mjs';
const directory=mkdtempSync(path.join(tmpdir(),'raqamia-test-'));
process.env.DATA_DIR=directory;
process.env.ADMIN_EMAIL='test@example.com';process.env.ADMIN_PASSWORD='test-password-12345';
after(()=>{rawDatabase().close();rmSync(directory,{recursive:true,force:true});});

test('all 17 migrations run once, preserve data, and match current schema',()=>{
 const connection=rawDatabase();
 assert.equal(connection.prepare('SELECT count(*) AS n FROM _node_migrations').get().n,17);
 assert.equal(createInitialAdmin(),true);
 migrate(connection);
 assert.equal(connection.prepare('SELECT count(*) AS n FROM users').get().n,1);
 assert.equal(connection.prepare('PRAGMA foreign_key_check').all().length,0);
 assert.equal(connection.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 assert.equal(createInitialAdmin(),false);
 assert.equal(connection.prepare('SELECT email FROM users').get().email,'test@example.com');
});
test('SQLite adapter preserves RETURNING, JSON, changes() audit guards and atomic rollback',async()=>{
 const db=nodeDatabase();
 rawDatabase().exec('CREATE TABLE node_test_records(key TEXT PRIMARY KEY,value TEXT)');
 const user=await db.prepare('SELECT id FROM users').first('id');
 const result=await db.batch([
  db.prepare("INSERT INTO node_test_records(key,value) VALUES('port-test','{\"n\":1}')"),
  db.prepare("INSERT INTO audit_logs(id,user_id,entity,record_id,before_json,after_json,created_at) SELECT 'test-audit',?,'node_test_records','port-test','{}','{}','now' WHERE changes()>0").bind(user),
 ]);
 assert.equal(result[0].meta.changes,1);assert.equal(result[1].meta.changes,1);
 assert.equal(await db.prepare("SELECT json_extract(value,'$.n') AS n FROM node_test_records WHERE key='port-test'").first('n'),1);
 await assert.rejects(db.batch([db.prepare("UPDATE node_test_records SET value='bad' WHERE key='port-test'"),db.prepare('INSERT INTO missing_table VALUES(1)')]));
 assert.equal(await db.prepare("SELECT json_extract(value,'$.n') AS n FROM node_test_records WHERE key='port-test'").first('n'),1);
 const row=await db.prepare("INSERT INTO login_attempts VALUES('test',1,1) ON CONFLICT(platform_id) DO UPDATE SET attempts=attempts+1 RETURNING attempts").first();
 assert.equal(row.attempts,1);
 const changed=await db.prepare("UPDATE node_test_records SET value='{}' WHERE key='not-present'").run();assert.equal(changed.meta.changes,0);
 const skipped=await db.batch([db.prepare("UPDATE node_test_records SET value='{}' WHERE key='not-present'"),db.prepare("UPDATE node_test_records SET value='bad' WHERE key='port-test' AND changes()>0")]);
 assert.equal(skipped[1].meta.changes,0);
});
test('database persists after process restart',()=>{
 const result=spawnSync(process.execPath,['--input-type=module','-e',"import {rawDatabase} from './lib/node-database.mjs'; console.log(rawDatabase().prepare('SELECT count(*) AS n FROM users').get().n)"],{cwd:process.cwd(),env:process.env,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'1');assert.ok(existsSync(databasePath()));
});
test('private attachments roundtrip and reject traversal',async()=>{
 const storage=bucket(), key='team/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222';
 await storage.put(key,new Uint8Array([1,2,3]));assert.deepEqual((await storage.get(key)).body,new Uint8Array([1,2,3]));
 await assert.rejects(storage.get('../../package.json'));
 await storage.delete(key);assert.equal(await storage.get(key),null);
});
test('existing untracked database refuses unsafe migration replay',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE users(id TEXT)');
 assert.throws(()=>migrate(db),/Import/);db.close();
});
test('offline import preserves accounts and refuses overwrite or incomplete schema',()=>{
 const source=rawDatabase();
 const schema=source.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT IN ('_node_migrations','node_test_records') ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END").all().map(r=>r.sql+';').join('\n');
 const user=source.prepare('SELECT * FROM users').get();
 const quote=value=>value===null?'NULL':typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
 const dump=schema+'\nINSERT INTO users('+Object.keys(user).join(',')+') VALUES('+Object.values(user).map(quote).join(',')+');';
 const input=path.join(directory,'export.sql');
 // Real imports contain data; this fixture covers account compatibility and schema validation.
 writeFileSync(input,dump);
 const destination=path.join(directory,'imported');
 const result=spawnSync(process.execPath,['scripts/import-d1.mjs',input],{cwd:process.cwd(),env:{...process.env,DATA_DIR:destination},encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const imported=new DatabaseSync(path.join(destination,'raqamia.sqlite'));
 assert.deepEqual({...imported.prepare('SELECT * FROM users').get()},{...user});
 assert.equal(imported.prepare('SELECT count(*) AS n FROM _node_migrations').get().n,17);imported.close();
 const again=spawnSync(process.execPath,['scripts/import-d1.mjs',input],{env:{...process.env,DATA_DIR:destination},encoding:'utf8'});assert.notEqual(again.status,0);
 const bad=path.join(directory,'bad.sql');writeFileSync(bad,'CREATE TABLE users(id TEXT);');
 const invalid=path.join(directory,'invalid');
 const rejected=spawnSync(process.execPath,['scripts/import-d1.mjs',bad],{env:{...process.env,DATA_DIR:invalid},encoding:'utf8'});assert.notEqual(rejected.status,0);assert.equal(existsSync(path.join(invalid,'raqamia.sqlite')),false);
});
