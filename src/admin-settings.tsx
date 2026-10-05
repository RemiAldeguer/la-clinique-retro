import React, { useRef, useState } from 'react';
import { useApp, downloadFile } from './store';
import { useAuth } from './auth';
import { api } from './api';
import { Icon, Panel, Field } from './ui';
import { PageHeader } from './pages';
import { validateStore, STORAGE_KEY, emptyStore, addEvent, dateFmt } from './domain';
import { demoStore } from './seed';
export function Settings() {
  const { data, transact, ask, notify, exportData, exportInventory, go } = useApp();
  const { user, signedOut } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [legacy] = useState(() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } });
  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget, f = new FormData(form);
    setError('');
    if (f.get('newPassword') !== f.get('confirmation')) { setError('Les mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      await api('/api/auth/password', { method: 'POST', body: { currentPassword: f.get('currentPassword'), newPassword: f.get('newPassword') } });
      form.reset(); signedOut('Mot de passe modifié. Toutes les sessions sont fermées. Connectez-vous avec votre nouveau mot de passe.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Modification impossible.'); }
    finally { setBusy(false); }
  }
  async function restore(file: File) {
    try {
      if (file.size > 19 * 1024 * 1024) throw new Error('Fichier trop volumineux (19 Mo maximum).');
      const parsed = validateStore(JSON.parse(await file.text()));
      ask({ title: 'Restaurer cette sauvegarde ?', body: `${parsed.consoles.length} consoles, ${parsed.repairs.length} réparations et ${parsed.parts.length} références remplaceront l’atelier sur le serveur. Exportez vos données avant de poursuivre.`, verify: 'RESTAURER', destructive: true, label: 'Restaurer', run: () => transact(s => { Object.assign(s, parsed); addEvent(s, 'Atelier restauré depuis une sauvegarde JSON.', 'system'); }, 'Sauvegarde restaurée sur le serveur.') });
    } catch (e) { notify(e instanceof Error ? e.message : 'Sauvegarde illisible.', true); }
    finally { if (input.current) input.current.value = ''; }
  }
  function reset(demo: boolean) {
    ask({ title: demo ? 'Charger la démonstration ?' : 'Commencer avec un atelier vide ?', body: 'Cette action remplace les données de l’atelier sur le serveur, pour toutes les sessions. Votre compte et son mot de passe restent inchangés. Exportez d’abord une sauvegarde.', verify: 'EFFACER', destructive: true, label: 'Remplacer les données', run: () => {
      const ok = transact(s => { const next = demo ? demoStore() : emptyStore(); if (!demo) next.settings = { ...s.settings, demo: false, lastExportAt: '' }; Object.assign(s, next); }, 'Atelier mis à jour.'); if (ok) go('/dashboard'); return ok;
    } });
  }
  return <><PageHeader eyebrow="ADMINISTRATION" title="Les réglages de la clinique" description="Votre compte, votre atelier et vos sauvegardes."/><div className="settings-grid">
    <Panel title="Compte administrateur"><div className="panel-body"><p><strong>{user.email}</strong></p><p className="settings-text">Accès administrateur. Session limitée à 8 heures, expiration après 30 minutes sans requête d’activité. Aucun autre compte ne peut s’inscrire.</p><form className="form-stack" onSubmit={changePassword}><Field label="Mot de passe actuel"><input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128}/></Field><Field label="Nouvelle phrase de passe"><input type="password" name="newPassword" autoComplete="new-password" required minLength={15} maxLength={128}/></Field><Field label="Confirmation"><input type="password" name="confirmation" autoComplete="new-password" required minLength={15} maxLength={128}/></Field><p className="form-hint">15 à 128 caractères. La modification déconnecte tous les appareils.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="btn primary" disabled={busy}>{busy ? 'Modification…' : 'Changer le mot de passe'}</button></form></div></Panel>
    <Panel title="Identité de l’atelier"><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); transact(s => { s.settings.workshop = String(f.get('workshop') || '').trim(); s.settings.owner = String(f.get('owner') || '').trim(); s.settings.hourlyRate = Number(f.get('hourlyRate')); if (!s.settings.workshop) throw new Error('Nom de l’atelier obligatoire.'); addEvent(s, 'Paramètres de l’atelier mis à jour.', 'system'); }, 'Paramètres enregistrés.'); }}><div className="panel-body form-stack"><Field label="Nom de l’atelier"><input name="workshop" required defaultValue={data.settings.workshop} maxLength={120}/></Field><Field label="Nom affiché"><input name="owner" defaultValue={data.settings.owner} maxLength={80}/></Field><Field label="Valorisation du temps (€/h)"><input name="hourlyRate" type="number" min="0" max="1000000000" step="0.01" required defaultValue={data.settings.hourlyRate}/></Field><button className="btn primary">Enregistrer</button></div></form></Panel>
    <Panel title="Sauvegarder votre atelier"><div className="panel-body"><p className="settings-text">Les consoles, réparations et photos sont stockées dans la base du serveur. L’accès à cette base via l’API exige une session administrateur. Exportez régulièrement une copie JSON indépendante.</p><p>{data.consoles.length} consoles · {data.repairs.length} dossiers · {data.parts.length} références</p><small>Dernier export : {data.settings.lastExportAt ? dateFmt(data.settings.lastExportAt, true) : 'aucun'}</small><div className="button-row"><button className="btn primary" onClick={exportData}><Icon name="download" size={17}/>Exporter en JSON</button><button className="btn secondary" onClick={exportInventory}>Inventaire CSV</button></div></div></Panel>
    <Panel title="Restaurer ou migrer des données"><div className="panel-body"><p className="settings-text">Importez le JSON exporté depuis l’ancienne application locale pour retrouver votre collection sur le serveur. Rien n’est transféré ou supprimé automatiquement.</p>{legacy && <div className="auth-notice"><p>Une ancienne sauvegarde locale est présente dans ce navigateur. Téléchargez-la, puis importez-la ci-dessous. Cette ancienne copie reste lisible localement tant que vous ne l’avez pas supprimée dans votre navigateur.</p><button className="btn secondary" onClick={() => downloadFile(legacy, 'clinique-retro-ancienne-sauvegarde.json')}>Récupérer l’ancienne sauvegarde</button></div>}<input ref={input} className="sr-only" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; if (file) void restore(file); }}/><button className="btn primary" onClick={() => input.current?.click()}>Importer une sauvegarde JSON</button></div></Panel>
    <Panel title="Réinitialiser l’atelier"><div className="panel-body"><p className="settings-text">Ces actions sont réservées à l’administrateur et demandent une confirmation.</p><div className="button-row"><button className="btn secondary" onClick={() => reset(false)}>Commencer avec un atelier vide</button><button className="btn secondary" onClick={() => reset(true)}>Charger la démonstration</button></div></div></Panel>
  </div></>;
}
