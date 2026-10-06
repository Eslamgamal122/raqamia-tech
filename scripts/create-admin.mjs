import { randomUUID, pbkdf2Sync } from 'node:crypto';
import { rawDatabase } from '../lib/node-database.mjs';
export function createInitialAdmin() {
  const connection=rawDatabase();
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(), password=process.env.ADMIN_PASSWORD;
  if (connection.prepare('SELECT id FROM users LIMIT 1').get()) return false;
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || email.length>200 || !password || password.length<12 || password.length>128)
    throw new Error('Empty database: set ADMIN_EMAIL and a 12-128 character ADMIN_PASSWORD to create the first admin.');
  const salt=randomUUID(), hash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
  const result=connection.prepare("INSERT INTO users(id,email,password_hash,salt,role,platform_id) SELECT ?,?,?,?,'admin',? WHERE NOT EXISTS(SELECT 1 FROM users)").run(randomUUID(),email,hash,salt,'node:'+randomUUID());
  return Number(result.changes)>0;
}
if (process.argv[1]?.endsWith('/create-admin.mjs')) console.log(createInitialAdmin()?'Initial admin created.':'Existing accounts preserved; no changes.');
