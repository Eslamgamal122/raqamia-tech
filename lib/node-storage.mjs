import { mkdir, readFile, writeFile, rename, unlink, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataDirectory } from './node-database.mjs';
async function location(key) {
  if (!/^team\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(key)) throw new Error('Invalid private object key');
  const root = path.join(dataDirectory(), 'attachments');
  const directory = path.join(root, path.dirname(key));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const base = await realpath(dataDirectory());
  const resolved = await realpath(directory);
  if (!resolved.startsWith(base + path.sep)) throw new Error('Unsafe storage path');
  return path.join(directory, path.basename(key));
}
export function bucket() {
  return {
    async get(key) {
      const filename = await location(key);
      try {
        if (!(await lstat(filename)).isFile() || (await lstat(filename)).isSymbolicLink()) throw new Error('Unsafe object');
        return { body: new Uint8Array(await readFile(filename)) };
      } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    async put(key, bytes) {
      const filename = await location(key), temporary = filename + '.' + randomUUID() + '.tmp';
      try { await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 }); await rename(temporary, filename); }
      finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
    },
    async delete(key) {
      try { await unlink(await location(key)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    },
  };
}
