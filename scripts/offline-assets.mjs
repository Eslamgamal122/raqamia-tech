import fs from 'node:fs';
import path from 'node:path';
const directory=path.resolve('.next/static');
const paths=fs.readdirSync(directory,{recursive:true}).filter(p=>/\.(js|css|woff2?)$/.test(p)).map(p=>'/_next/static/'+p.replaceAll('\\','/'));
paths.push('/fonts/Cairo-Regular.ttf','/fonts/Cairo-Arabic.ttf','/brand/raqamia-logo.png','/brand/raqamia-mark.png','/brand/icon-192.png','/brand/icon-512.png');
fs.writeFileSync('public/offline-assets.json',JSON.stringify(paths));
