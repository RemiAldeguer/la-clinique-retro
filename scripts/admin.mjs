// Account creation and recovery are server-console operations, never public HTTP routes.
import { createInterface, emitKeypressEvents } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../server/database.mjs';
import { email, hashPassword } from '../server/security.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function password(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error('Utilisez un terminal interactif pour saisir le mot de passe sans l’afficher.'));
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true); process.stdin.resume();
    let value = '';
    function finish(error) {
      process.stdin.off('keypress', onKey); process.stdin.setRawMode(wasRaw); process.stdin.pause(); process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    }
    function onKey(char, key = {}) {
      if (key.ctrl && ['c', 'd'].includes(key.name)) return finish(new Error('Opération annulée.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') { value = [...value].slice(0, -1).join(''); return; }
      if (!key.ctrl && !key.meta && char && !/[\x00-\x1f\x7f]/.test(char)) value += char;
    }
    process.stdin.on('keypress', onKey);
  });
}
let db;
try {
  const mode = process.argv[2];
  if (!['create', 'reset'].includes(mode)) throw new Error('Utilisez npm run admin:create ou npm run admin:reset.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const rawEmail = await new Promise(resolve => rl.question('Adresse e-mail administrateur : ', resolve)); rl.close();
  const address = email(rawEmail);
  if (!address) throw new Error('Adresse e-mail invalide.');
  process.umask(0o077);
  db = openDatabase(path.resolve(root, process.env.DATABASE_PATH || 'data/clinique.sqlite'));
  const existing = db.prepare('SELECT * FROM admin WHERE id = 1').get();
  if (mode === 'create' && existing) throw new Error('Un administrateur existe déjà. Aucune modification.');
  if (mode === 'reset' && (!existing || existing.email !== address)) throw new Error('Ce compte administrateur n’existe pas.');
  const value = await password('Phrase de passe (15 à 128 caractères, saisie masquée) : ');
  if (value !== await password('Confirmez la phrase de passe : ')) throw new Error('Les mots de passe ne correspondent pas.');
  const encoded = await hashPassword(value);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (mode === 'create') db.prepare("INSERT INTO admin(id, email, password_hash, role) VALUES(1, ?, ?, 'admin')").run(address, encoded);
    else db.prepare('UPDATE admin SET password_hash = ? WHERE id = 1').run(encoded);
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM limits').run();
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  console.log(mode === 'create' ? 'Administrateur créé. Vous pouvez vous connecter.' : 'Mot de passe remplacé. Toutes les sessions ont été révoquées.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { db?.close(); }
