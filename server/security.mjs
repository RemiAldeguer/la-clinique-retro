import { randomBytes, createHash, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(rawScrypt);
const cost = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const token = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function email(value) {
  if (typeof value !== 'string') return '';
  const result = value.trim().toLowerCase();
  return result.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : '';
}
export function checkPassword(value) {
  if (typeof value !== 'string' || [...value].length < 15 || [...value].length > 128) {
    throw new Error('Choisissez une phrase de passe de 15 à 128 caractères.');
  }
}
export async function hashPassword(value) {
  checkPassword(value);
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(value, salt, 64, cost);
  return `scrypt$131072$8$1$${salt}$${derived.toString('hex')}`;
}
// Unknown emails perform the same expensive computation as existing accounts.
const dummy = 'scrypt$131072$8$1$' + '0'.repeat(32) + '$' + '0'.repeat(128);
export async function verifyPassword(value, encoded = dummy) {
  if (typeof value !== 'string' || value.length > 512) return false;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts.slice(0, 4).join('$') !== 'scrypt$131072$8$1' ||
      !/^[0-9a-f]{32}$/.test(parts[4]) || !/^[0-9a-f]{128}$/.test(parts[5])) return false;
  const derived = await scrypt(value, parts[4], 64, cost);
  return equal(derived.toString('hex'), parts[5]);
}
