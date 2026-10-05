import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './application.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3040);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT invalide.');
const production = process.env.NODE_ENV === 'production';
if (production && !process.env.APP_ORIGIN) throw new Error('APP_ORIGIN est obligatoire en production.');
const origin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
process.umask(0o077);
const { server } = createApplication({
  databasePath: path.resolve(root, process.env.DATABASE_PATH || 'data/clinique.sqlite'),
  distPath: path.join(root, 'dist'), origin, production,
});
server.on('error', error => { console.error('Démarrage impossible :', error.message); process.exitCode = 1; });
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`La Clinique Rétro : ${origin}\nAuthentification administrateur requise.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
