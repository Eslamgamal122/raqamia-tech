import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const require=createRequire(import.meta.url);
function run(command,args){
  const result=spawnSync(command,args,{stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
const required=['@tailwindcss/postcss','tailwindcss','typescript','@types/react/package.json','@types/node/package.json'];
const missing=required.filter(name=>{try{require.resolve(name);return false;}catch{return true;}});
if(missing.length){
  console.log('Installing build tools omitted by the production installation: '+missing.join(', '));
  // Hostinger can install with NODE_ENV=production before invoking the build script.
  // Explicit include=dev overrides omit=dev for this build; pruning comes after build.
  const args=['ci','--include=dev','--no-audit','--no-fund'];
  if(process.env.npm_execpath)run(process.execPath,[process.env.npm_execpath,...args]);
  else run(process.platform==='win32'?'npm.cmd':'npm',args);
}
run(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'build','--webpack']);
run(process.execPath,['scripts/offline-assets.mjs']);
run(process.execPath,['scripts/clean-build-cache.mjs']);
