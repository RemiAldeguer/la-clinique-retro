export type Admin = { email: string; role: 'admin' };
export type Session = { user: Admin; csrfToken: string; expiresAt: number };
let csrf = '';
export function setSession(session: Session | null) { csrf = session?.csrfToken || ''; }
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method || 'GET';
  let response: Response;
  try {
    response = await fetch(url, {
      method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30000),
      headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && csrf ? { 'X-CSRF-Token': csrf } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch { throw new ApiError('Le serveur est injoignable. Vérifiez votre connexion puis réessayez.', 0); }
  if (response.ok && !response.headers.get('content-type')?.includes('application/json')) throw new ApiError('L’API est indisponible. Démarrez le serveur de l’application.', 502);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !['/api/auth/login', '/api/auth/me'].includes(url)) {
      setSession(null); window.dispatchEvent(new Event('clinique:expired'));
    }
    throw new ApiError(typeof body.error === 'string' ? body.error : 'La requête a échoué.', response.status);
  }
  return body as T;
}
