import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, ApiError, setSession, type Session, type Admin } from './api';
import { Icon, Logo } from './ui';
const AuthContext = createContext<{ user: Admin; logout: () => Promise<void>; signedOut: (message: string) => void } | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Connexion administrateur requise.');
  return value;
}
function broadcastLogout() {
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('clinique-auth'); channel.postMessage('logout'); channel.close();
  }
}
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, saveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true), [serviceError, setServiceError] = useState('');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  function accept(value: Session) { setSession(value); saveSession(value); setError(''); setMessage(''); }
  function clear(text: string) { setSession(null); saveSession(null); setMessage(text); }
  async function check() {
    try { accept(await api<Session>('/api/auth/me')); setServiceError(''); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) { setSession(null); saveSession(null); setServiceError(''); }
      else setServiceError(e instanceof Error ? e.message : 'Serveur indisponible.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void check(); }, []);
  useEffect(() => {
    const expired = () => clear('Votre session est terminée. Reconnectez-vous. Les actions non confirmées ne sont pas garanties enregistrées.');
    window.addEventListener('clinique:expired', expired);
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('clinique-auth') : null;
    if (channel) channel.onmessage = e => { if (e.data === 'logout') expired(); };
    return () => { window.removeEventListener('clinique:expired', expired); channel?.close(); };
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const current = await api<Session>('/api/auth/me');
        if (active) { setSession(current); saveSession(current); }
      } catch (e) { if (active && e instanceof ApiError && e.status === 401) clear('Votre session a expiré. Reconnectez-vous.'); }
    }, 60000);
    const timeout = setTimeout(() => clear('Votre session a expiré. Reconnectez-vous.'), Math.max(0, session.expiresAt - Date.now()));
    return () => { active = false; clearInterval(interval); clearTimeout(timeout); };
  }, [session?.expiresAt]);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget, fields = new FormData(form);
    setBusy(true); setError(''); setMessage('');
    try {
      const value = await api<Session>('/api/auth/login', { method: 'POST', body: { email: fields.get('email'), password: fields.get('password') } });
      form.reset(); accept(value);
    } catch (e) { setError(e instanceof Error ? e.message : 'Connexion impossible.'); }
    finally { setBusy(false); }
  }
  function signedOut(text: string) { clear(text); broadcastLogout(); }
  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    signedOut('Vous êtes déconnecté.');
  }
  if (loading || serviceError) return <div className="auth-page"><section className="auth-card" aria-live="polite"><Logo/><h1>La Clinique Rétro</h1><p>{loading ? 'Vérification de votre session…' : serviceError}</p>{!loading && <><p>L’administration nécessite le serveur de l’application. Aucun accès local de secours ne contourne la connexion.</p><button className="btn primary" onClick={() => { setLoading(true); void check(); }}>Réessayer</button></>}</section></div>;
  if (session) return <AuthContext.Provider value={{ user: session.user, logout, signedOut }}>{children}</AuthContext.Provider>;
  return <div className="auth-page"><div className="auth-intro"><Logo/><span className="auth-eyebrow">LA CLINIQUE RÉTRO</span><h1>Les belles histoires<br/>méritent une seconde vie.</h1><p>Votre collection. Votre atelier.<br/>Un espace réservé à son administrateur.</p><div className="auth-motto"><Icon name="gamepad" size={38}/><span>Réparer. Préserver. Rejouer.</span></div></div><section className="auth-card"><span className="auth-lock"><Icon name="shield" size={27}/></span><span className="auth-eyebrow">ESPACE ADMINISTRATEUR</span><h2>Bienvenue à l’atelier.</h2><p>Connectez-vous pour retrouver vos consoles et vos réparations.</p>{message && <p className="auth-notice" role="status">{message}</p>}<form onSubmit={login}><label className="field"><span>Adresse e-mail</span><input type="email" name="email" autoComplete="username" maxLength={254} required autoFocus disabled={busy}/></label><label className="field"><span>Mot de passe</span><input type="password" name="password" autoComplete="current-password" maxLength={128} required disabled={busy}/></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="btn primary auth-submit" disabled={busy}>{busy ? 'Connexion…' : 'Ouvrir mon atelier'}<Icon name="arrow" size={18}/></button></form><p className="auth-help">Pas d’inscription publique. Le premier compte et la récupération du mot de passe se gèrent depuis le serveur.</p></section></div>;
}
export function SessionActions() {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <span className="session-actions"><span className="session-email" title={user.email}>Administrateur</span><button className="icon-btn" title="Se déconnecter" aria-label="Se déconnecter" disabled={busy} onClick={async () => {
    setBusy(true); setError(''); try { await logout(); } catch (e) { setError(e instanceof Error ? e.message : 'Déconnexion impossible.'); } finally { setBusy(false); }
  }}><Icon name="logout" size={19}/></button>{error && <span role="alert" className="auth-error session-error">{error}</span>}</span>;
}
