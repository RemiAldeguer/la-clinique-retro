import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { openDatabase, limit } from './database.mjs';
import { token, digest, equal, email, checkPassword, hashPassword, verifyPassword } from './security.mjs';
import { validateStore } from '../tests/.compiled/domain.cjs';
const HOUR = 3600000;
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readJSON(req, max) {
  if ((req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') {
    throw new HttpError(415, 'Le format JSON est requis.');
  }
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new HttpError(415, 'Le contenu compressé n’est pas accepté.');
  }
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [], failed = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > max && !failed) { failed = true; chunks = []; reject(new HttpError(413, 'Requête trop volumineuse.')); }
      if (!failed) chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('aborted', () => reject(new HttpError(400, 'Requête interrompue.')));
    req.on('end', () => {
      if (failed) return;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
        resolve(body);
      } catch { reject(new HttpError(400, 'JSON invalide.')); }
    });
  });
}
export function createApplication({ databasePath, origin, distPath, production = false, now = Date.now,
  sessionMs = 8 * HOUR, idleMs = HOUR / 2 } = {}) {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password) throw new Error('APP_ORIGIN doit être une origine, sans chemin ni slash final.');
  const secure = url.protocol === 'https:';
  if (!secure && (production || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) {
    throw new Error('HTTPS est obligatoire hors développement sur localhost.');
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Origine HTTP(S) requise.');
  const db = openDatabase(databasePath);
  const cookieName = secure ? '__Host-clinique_session' : 'clinique_session';
  const cookie = (value, seconds) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  let hashing = 0;
  function throttle(key, max, windowMs, res) {
    const seconds = limit(db, key, max, windowMs, now());
    if (seconds) { res.setHeader('Retry-After', String(seconds)); throw new HttpError(429, 'Trop de tentatives. Réessayez plus tard.'); }
  }
  async function withHash(fn) {
    if (hashing >= 2) throw new HttpError(429, 'Le service est occupé. Réessayez dans un instant.');
    hashing++;
    try { return await fn(); } finally { hashing--; }
  }
  function session(req, touch = true) {
    const cookies = (req.headers.cookie || '').split(';').map(x => x.trim());
    const candidates = cookies.filter(x => x.startsWith(cookieName + '='));
    if (candidates.length !== 1) throw new HttpError(401, 'Connexion administrateur requise.');
    const value = candidates[0].slice(cookieName.length + 1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new HttpError(401, 'Session invalide.');
    const key = digest(value);
    const row = db.prepare(`SELECT s.*, a.email, a.role FROM sessions s
      JOIN admin a ON a.id = s.admin_id WHERE token_hash = ?`).get(key);
    if (!row || row.expires_at <= now() || row.seen_at + idleMs <= now()) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(key);
      throw new HttpError(401, 'Votre session a expiré. Reconnectez-vous.');
    }
    if (row.role !== 'admin') throw new HttpError(403, 'Accès administrateur requis.');
    if (touch) db.prepare('UPDATE sessions SET seen_at = ? WHERE token_hash = ?').run(now(), key);
    return row;
  }
  const userView = row => ({ user: { email: row.email, role: row.role }, csrfToken: row.csrf, expiresAt: row.expires_at });
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const pathname = new URL(req.url || '/', origin).pathname;
      if (!pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Méthode non autorisée.');
        if (!distPath) throw new HttpError(404, 'Interface indisponible.');
        const root = await realpath(distPath);
        let decoded;
        try { decoded = decodeURIComponent(pathname); } catch { throw new HttpError(400, 'Chemin invalide.'); }
        let filename = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
        if (!filename.startsWith(root + path.sep) || decoded.includes('\0')) throw new HttpError(404, 'Fichier introuvable.');
        try { filename = await realpath(filename); } catch { throw new HttpError(404, 'Fichier introuvable.'); }
        if (!filename.startsWith(root + path.sep) || !(await stat(filename)).isFile()) throw new HttpError(404, 'Fichier introuvable.');
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
        const type = types[path.extname(filename)];
        if (!type) throw new HttpError(404, 'Fichier introuvable.');
        const body = await readFile(filename);
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
        return res.end(req.method === 'HEAD' ? undefined : body);
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Requête intersite refusée.');
      const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (mutation && req.headers.origin !== origin) throw new HttpError(403, 'Origine non autorisée.');
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown'; // Do not trust arbitrary X-Forwarded-For headers.
        throttle('ip:' + digest(ip), 30, HOUR / 4, res);
        throttle('global', 60, 60000, res);
        const body = await readJSON(req, 4096), address = email(body.email);
        throttle('email:' + digest(address || 'invalid'), 5, HOUR / 4, res);
        const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
        if (!admin) throw new HttpError(503, 'Le compte administrateur doit être initialisé sur le serveur.');
        const match = address === admin.email;
        const valid = await withHash(() => verifyPassword(body.password, match ? admin.password_hash : undefined));
        const current = db.prepare('SELECT password_hash FROM admin WHERE id = 1').get();
        if (!valid || !match || !current || current.password_hash !== admin.password_hash) throw new HttpError(401, 'Identifiants incorrects.');
        db.prepare('DELETE FROM limits WHERE key = ?').run('email:' + digest(address));
        db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR seen_at <= ?').run(now(), now() - idleMs);
        // Bound session count without invalidating ordinary concurrent devices.
        db.prepare('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions ORDER BY seen_at DESC LIMIT -1 OFFSET 9)').run();
        const value = token(), csrf = token(), expires = now() + sessionMs;
        db.prepare('INSERT INTO sessions(token_hash, admin_id, csrf, expires_at, seen_at) VALUES(?, 1, ?, ?, ?)')
          .run(digest(value), csrf, expires, now());
        res.setHeader('Set-Cookie', cookie(value, Math.floor(sessionMs / 1000)));
        return json(res, 200, userView({ ...admin, csrf, expires_at: expires }));
      }
      if (pathname === '/api/auth/me' && req.method === 'GET') return json(res, 200, userView(session(req, false)));
      const auth = session(req);
      if (mutation && !equal(req.headers['x-csrf-token'], auth.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(auth.token_hash);
        res.setHeader('Set-Cookie', cookie('', 0));
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/auth/password' && req.method === 'POST') {
        throttle('password:' + auth.admin_id, 5, HOUR / 4, res);
        const body = await readJSON(req, 4096);
        try { checkPassword(body.newPassword); } catch (error) { throw new HttpError(400, error.message); }
        const admin = db.prepare('SELECT password_hash FROM admin WHERE id = 1').get();
        const encoded = await withHash(async () => {
          if (!await verifyPassword(body.currentPassword, admin.password_hash)) throw new HttpError(400, 'Mot de passe actuel incorrect.');
          return hashPassword(body.newPassword);
        });
        db.exec('BEGIN IMMEDIATE');
        try {
          // Recheck the session and old hash after the asynchronous password computation.
          session(req, false);
          const changed = db.prepare('UPDATE admin SET password_hash = ? WHERE id = 1 AND password_hash = ?').run(encoded, admin.password_hash);
          if (!changed.changes) throw new HttpError(409, 'Le compte a changé. Reconnectez-vous.');
          db.prepare('DELETE FROM sessions').run();
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        res.setHeader('Set-Cookie', cookie('', 0));
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/store' && req.method === 'GET') {
        return json(res, 200, JSON.parse(db.prepare('SELECT data FROM workshop WHERE id = 1').get().data));
      }
      if (pathname === '/api/store' && req.method === 'PUT') {
        const body = await readJSON(req, 20 * 1024 * 1024);
        session(req, false); // Authentication may expire while a large upload is arriving.
        if (!Number.isSafeInteger(body.revision) || body.revision < 0 || body.revision >= 1e9) throw new HttpError(400, 'Révision invalide.');
        let data;
        try { data = validateStore(body.data); } catch (error) { throw new HttpError(400, error.message); }
        data.revision = body.revision + 1;
        const changed = db.prepare('UPDATE workshop SET revision = ?, data = ? WHERE id = 1 AND revision = ?')
          .run(data.revision, JSON.stringify(data), body.revision);
        if (!changed.changes) throw new HttpError(409, 'L’atelier a changé dans une autre session. Rechargez les données avant de réessayer.');
        return json(res, 200, data);
      }
      throw new HttpError(404, 'Route introuvable.');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('Erreur interne de l’API', error.code || error.name); // Never log request bodies, passwords or cookies.
      if (!res.headersSent && !res.destroyed) json(res, status, { error: status === 500 ? 'Erreur interne du serveur.' : error.message });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.on('close', () => db.close());
  return { server, db };
}
