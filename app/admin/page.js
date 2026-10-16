'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Agenda from '../../components/Agenda';
import Clients from '../../components/Clients';
import Compta from '../../components/Compta';
import Reglages from '../../components/Reglages';

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <main className="wrap"><p className="mu">Chargement…</p></main>;
  return session ? <Panel /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Email ou mot de passe incorrect.');
  }

  return (
    <main className="wrap narrow">
      <h1>Espace admin</h1>
      <form onSubmit={submit} className="stack">
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>Mot de passe
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Se connecter</button>
      </form>
    </main>
  );
}

function Panel() {
  const [tab, setTab] = useState('agenda');
  const [target, setTarget] = useState(null);
  const tabs = [['agenda', 'Agenda'], ['clients', 'Clients'], ['compta', 'Compta'], ['prix', 'Prix'], ['reglages', 'Réglages']];
  return (
    <main className="wrap">
      <header className="bar">
        <h1>Mon admin</h1>
        <button className="lk" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </header>
      <div className="chips tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={k === tab ? 'on' : ''} onClick={() => { setTarget(null); setTab(k); }}>{l}</button>
        ))}
      </div>
      {tab === 'agenda' && <Agenda goClient={(id) => { setTarget(id); setTab('clients'); }} />}
      {tab === 'clients' && <Clients key={target || 'liste'} initial={target} />}
      {tab === 'compta' && <Compta />}
      {tab === 'prix' && <Reglages part="prix" />}
      {tab === 'reglages' && <Reglages part="design" />}
    </main>
  );
}
