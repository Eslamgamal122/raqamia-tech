import { backup } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { rawDatabase, dataDirectory } from '../lib/node-database.mjs';
const folder=path.join(dataDirectory(),'backups');mkdirSync(folder,{recursive:true,mode:0o700});
const filename=path.join(folder,'raqamia-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
await backup(rawDatabase(),filename);chmodSync(filename,0o600);console.log('Database snapshot saved: '+filename);
