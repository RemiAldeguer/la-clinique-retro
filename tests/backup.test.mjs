import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'retro-backup-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, source: path.join(dir, 'source.sqlite'), backup: path.join(dir, "backup ' test.sqlite") };
}
function run(source, ...args) {
  return spawnSync(process.execPath, [path.join(root, 'scripts/backup.mjs'), ...args], {
    cwd: os.tmpdir(), env: { ...process.env, DATABASE_PATH: source }, encoding: 'utf8', timeout: 15000,
  });
}

test('Live WAL backup restores committed data and account records without sidecars', t => {
  const f = fixture(t), db = new DatabaseSync(f.source);
  t.after(() => db.close());
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0;
    CREATE TABLE admin(id INTEGER PRIMARY KEY, email TEXT, password_hash TEXT);
    CREATE TABLE workshop(id INTEGER PRIMARY KEY, revision INTEGER, data TEXT);
    CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, admin_id INTEGER REFERENCES admin(id));
    CREATE TABLE limits(key TEXT PRIMARY KEY, hits INTEGER);
    PRAGMA wal_checkpoint(TRUNCATE);`);
  db.prepare('INSERT INTO admin VALUES(1, ?, ?)').run('backup@example.invalid', 'synthetic-hash');
  db.prepare('INSERT INTO workshop VALUES(1, 7, ?)').run(JSON.stringify({ consoles: [{ id: 'synthetic-console' }] }));
  db.exec("INSERT INTO sessions VALUES('synthetic-token-hash', 1); INSERT INTO limits VALUES('synthetic-limit', 2);");
  assert.ok(statSync(f.source + '-wal').size > 0);
  // Demonstrate that the fixture really needs its WAL: a raw copy lacks the rows.
  const rawPath = path.join(f.dir, 'raw.sqlite'); copyFileSync(f.source, rawPath);
  const raw = new DatabaseSync(rawPath); assert.equal(raw.prepare('SELECT count(*) AS n FROM admin').get().n, 0); raw.close();
  db.exec('BEGIN; UPDATE workshop SET revision = 999;');
  const result = run(f.source, f.backup);
  assert.equal(result.status, 0, result.stderr);
  db.exec('ROLLBACK; UPDATE workshop SET revision = 8;');
  assert.equal(existsSync(f.backup + '-wal'), false);
  assert.equal(existsSync(f.backup + '-shm'), false);
  const restoredPath = path.join(f.dir, 'restored.sqlite'); copyFileSync(f.backup, restoredPath);
  const restored = new DatabaseSync(restoredPath);
  try {
    assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(restored.prepare('SELECT revision FROM workshop').get().revision, 7);
    assert.deepEqual(JSON.parse(restored.prepare('SELECT data FROM workshop').get().data), { consoles: [{ id: 'synthetic-console' }] });
    for (const table of ['admin', 'sessions', 'limits']) {
      assert.deepEqual(restored.prepare(`SELECT * FROM ${table}`).all(), db.prepare(`SELECT * FROM ${table}`).all());
    }
    restored.exec('UPDATE workshop SET revision = 9;');
  } finally { restored.close(); }
  assert.equal(db.prepare('SELECT revision FROM workshop').get().revision, 8);
  if (process.platform !== 'win32') assert.equal(statSync(f.backup).mode & 0o777, 0o600);
  assert.equal(readdirSync(f.dir).some(name => name.startsWith('.backup-')), false);
});

test('Missing source, invalid arguments and source destination fail without creating a database', t => {
  const f = fixture(t);
  for (const args of [[], [f.backup], [f.source], ['invalid.json'], [f.backup, 'extra']]) {
    assert.notEqual(run(f.source, ...args).status, 0);
  }
  assert.equal(existsSync(f.source), false); assert.equal(existsSync(f.backup), false);
});

test('Existing backup is preserved and corrupt sources publish no output', t => {
  const f = fixture(t), db = new DatabaseSync(f.source);
  db.exec('CREATE TABLE fixture(value TEXT); INSERT INTO fixture VALUES(\'synthetic\');'); db.close();
  assert.equal(run(f.source, f.backup).status, 0);
  const previous = readFileSync(f.backup);
  assert.notEqual(run(f.source, f.backup).status, 0);
  assert.deepEqual(readFileSync(f.backup), previous);
  const corrupt = path.join(f.dir, 'corrupt.sqlite'); copyFileSync(path.join(root, 'package.json'), corrupt);
  const destination = path.join(f.dir, 'failed.sqlite');
  assert.notEqual(run(corrupt, destination).status, 0);
  assert.equal(existsSync(destination), false);
  assert.equal(readdirSync(f.dir).some(name => name.startsWith('.backup-')), false);
});
