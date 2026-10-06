import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function dataDirectory() {
  const input = process.env.DATA_DIR;
  if (process.env.NODE_ENV === 'production' && (!input || !path.isAbsolute(input)))
    throw new Error('Set DATA_DIR to an absolute persistent directory outside the deployment before starting.');
  const directory = path.resolve(input || '.data');
  const publicDir = path.resolve('public');
  if (directory === publicDir || directory.startsWith(publicDir + path.sep))
    throw new Error('DATA_DIR must not be publicly served.');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}
export function databasePath() { return path.join(dataDirectory(), 'raqamia.sqlite'); }
export function migrate(connection) {
  // Refuse to silently replay ALTER TABLE on an imported database.
  const existing = connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  const journal = connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_node_migrations'").get();
  if (existing && !journal) throw new Error('Existing database has no Node migration history. Import with scripts/import-d1.mjs first.');
  connection.exec('CREATE TABLE IF NOT EXISTS _node_migrations (tag TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const entries = JSON.parse(readFileSync(path.resolve('drizzle/meta/_journal.json'), 'utf8')).entries;
  connection.exec('BEGIN IMMEDIATE');
  try {
    for (const entry of entries) {
      const sql = readFileSync(path.resolve('drizzle', entry.tag + '.sql'), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      const applied = connection.prepare('SELECT hash FROM _node_migrations WHERE tag=?').get(entry.tag);
      if (applied) {
        if (applied.hash !== hash) throw new Error('Applied migration changed: ' + entry.tag);
        continue;
      }
      connection.exec(sql);
      connection.prepare('INSERT INTO _node_migrations VALUES(?,?,?)').run(entry.tag, hash, new Date().toISOString());
    }
    connection.exec('COMMIT');
  } catch (error) { connection.exec('ROLLBACK'); throw error; }
}

const stateKey = Symbol.for('raqamia.node.database');
export function rawDatabase() {
  if (!globalThis[stateKey]) {
    const filename = databasePath();
    const connection = new DatabaseSync(filename);
    connection.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    try { migrate(connection); chmodSync(filename, 0o600); }
    catch (error) { connection.close(); throw error; }
    globalThis[stateKey] = connection;
  }
  return globalThis[stateKey];
}
class PreparedStatement {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...args) { return new PreparedStatement(this.sql, args.map(x => typeof x === 'boolean' ? Number(x) : x)); }
  execute(method) {
    const connection = rawDatabase();
    const statement = connection.prepare(this.sql);
    const value = statement[method](...this.args);
    const changes = Number(connection.prepare('SELECT changes() AS count').get().count);
    return { success: true, results: method === 'all' ? value : [], meta: { changes, last_row_id: method === 'run' ? Number(value.lastInsertRowid) : 0 } };
  }
  async all() { return this.execute('all'); }
  async first(column) {
    const row = rawDatabase().prepare(this.sql).get(...this.args);
    return row ? (column ? row[column] : row) : null;
  }
  async run() { return this.execute('run'); }
}
const adapter = {
  prepare(sql) { return new PreparedStatement(sql); },
  async batch(statements) {
    const connection = rawDatabase();
    connection.exec('BEGIN IMMEDIATE');
    try {
      // No awaits: the audit changes() guards and writes stay on one connection/transaction.
      const results = statements.map(statement => statement.execute('all'));
      connection.exec('COMMIT');
      return results;
    } catch (error) { connection.exec('ROLLBACK'); throw error; }
  },
};
export function nodeDatabase() { return adapter; }
