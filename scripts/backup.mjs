// Standalone operation: never initialize or migrate the source database.
import { DatabaseSync } from 'node:sqlite';
import { chmodSync, closeSync, fsyncSync, linkSync, mkdirSync, mkdtempSync, openSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let source, check, temporary;
try {
  if (process.argv.length !== 3 || !process.argv[2].endsWith('.sqlite')) {
    throw new Error('Usage : npm run backup -- .backups/clinique-YYYY-MM-DD.sqlite');
  }
  process.umask(0o077);
  const filename = path.resolve(root, process.env.DATABASE_PATH || 'data/clinique.sqlite');
  const destination = path.resolve(root, process.argv[2]);
  if (filename === destination) throw new Error('La destination doit être différente de la source.');
  // readOnly also refuses a missing source instead of creating an empty backup.
  source = new DatabaseSync(filename, { readOnly: true });
  source.exec('PRAGMA busy_timeout = 5000; PRAGMA synchronous = FULL;');
  mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
  temporary = mkdtempSync(path.join(path.dirname(destination), '.backup-'));
  const snapshot = path.join(temporary, 'snapshot.sqlite');
  source.prepare('VACUUM INTO ?').run(snapshot);
  source.close(); source = undefined;
  chmodSync(snapshot, 0o600);
  check = new DatabaseSync(snapshot, { readOnly: true });
  const integrity = check.prepare('PRAGMA integrity_check').all();
  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('Sauvegarde invalide : contrôle d’intégrité échoué.');
  if (check.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Sauvegarde invalide : références incohérentes.');
  check.close(); check = undefined;
  const fd = openSync(snapshot, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
  // Atomic publication without overwriting any existing path (including symlinks).
  linkSync(snapshot, destination);
  console.log(`Sauvegarde SQLite vérifiée : ${destination}`);
} catch (error) {
  console.error(`Sauvegarde impossible : ${error.message}`);
  process.exitCode = 1;
} finally {
  check?.close(); source?.close();
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
