import next from 'next';
import { createServer } from 'node:http';
import { rawDatabase } from './lib/node-database.mjs';
import { createInitialAdmin } from './scripts/create-admin.mjs';
process.env.NODE_ENV ||= 'production';
if (process.env.NODE_ENV === 'production') {
  const url = new URL(process.env.APP_URL || '');
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password)
    throw new Error('APP_URL must be the public HTTPS origin, such as https://example.com');
}
if (process.env.NODE_ENV === 'production' && (!process.env.SITE_CONNECTION_ENCRYPTION_KEY || process.env.SITE_CONNECTION_ENCRYPTION_KEY.length < 32)) throw new Error('Set a persistent SITE_CONNECTION_ENCRYPTION_KEY of at least 32 characters.');
rawDatabase();
createInitialAdmin();
const port=Number(process.env.PORT||3000), hostname=process.env.LISTEN_HOST||'0.0.0.0';
const app=next({dev:false,hostname,port});
await app.prepare();
const handle=app.getRequestHandler();
const server=createServer((req,res)=>handle(req,res));
server.requestTimeout=30000;
server.listen(port,hostname,()=>console.log('Raqamia Node server listening on port '+port));
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.close(()=>process.exit(0)));
