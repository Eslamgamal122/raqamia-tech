import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
// Only generated compiler cache; retain server output, browser assets and private DATA_DIR.
const output=path.resolve('.next');
if (!existsSync(path.join(output,'BUILD_ID'))) throw new Error('Build must succeed before cleaning its compiler cache.');
rmSync(path.join(output,'cache'),{recursive:true,force:true});
console.log('Generated build cache removed.');
