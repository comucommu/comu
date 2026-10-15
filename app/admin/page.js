'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const num = (v) => Number(String(v).replace(',', '.')) || 0;

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
  const [rows, setRows] = useState([]);
  const [set, setSet] = useState(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const a = await supabase.from('services').select('*').order('position');
    const b = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (a.error || b.error) setMsg('Impossible de charger les données.');
    setRows(a.data || []);
    setSet(b.data);
  }
  useEffect(() => { load(); }, []);

  const edit = (id, f, v) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [f]: v } : x)));

  async function saveRow(r) {
    const { error } = await supabase.from('services').update({
      name: r.name,
      description: r.description,
      duration_min: parseInt(r.duration_min, 10) || 0,
      price_eur: num(r.price_eur),
      deposit_eur: num(r.deposit_eur),
      active: r.active,
    }).eq('id', r.id);
    setMsg(error ? 'Échec de l’enregistrement.' : `« ${r.name} » enregistré.`);
  }

  async function addRow() {
    const { error } = await supabase.from('services').insert({
      name: 'Nouvelle prestation', duration_min: 30, price_eur: 0, deposit_eur: 0,
      position: rows.length + 1,
    });
    if (error) setMsg('Impossible d’ajouter la prestation.');
    else load();
  }

  async function removeRow(r) {
    if (!confirm(`Supprimer « ${r.name} » ?`)) return;
    const { error } = await supabase.from('services').delete().eq('id', r.id);
    if (error) setMsg('Impossible de supprimer.');
    else { setMsg(`« ${r.name} » supprimé.`); load(); }
  }

  async function saveSettings() {
    const { error } = await supabase.from('settings').update({
      shop_name: set.shop_name, tagline: set.tagline,
      color_main: set.color_main, color_bg: set.color_bg,
      logo_mode: set.logo_mode, show_powered_by: set.show_powered_by,
      cal_url: set.cal_url,
    }).eq('id', 1);
    setMsg(error ? 'Échec de l’enregistrement.' : 'Apparence enregistrée. Recharge le site pour la voir.');
  }

  const up = (f, v) => setSet((s) => ({ ...s, [f]: v }));

  return (
    <main className="wrap">
      <header className="bar">
        <h1>Mon admin</h1>
        <button className="lk" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </header>

      <h3>Mes prix</h3>
      {rows.map((r) => (
        <section className="card" key={r.id}>
          <label>Prestation
            <input value={r.name} onChange={(e) => edit(r.id, 'name', e.target.value)} />
          </label>
          <label>Description
            <input value={r.description} onChange={(e) => edit(r.id, 'description', e.target.value)} />
          </label>
          <div className="g3">
            <label>Prix (€)
              <input inputMode="decimal" value={r.price_eur} onChange={(e) => edit(r.id, 'price_eur', e.target.value)} />
            </label>
            <label>Acompte (€)
              <input inputMode="decimal" value={r.deposit_eur} onChange={(e) => edit(r.id, 'deposit_eur', e.target.value)} />
            </label>
            <label>Durée (min)
              <input inputMode="numeric" value={r.duration_min} onChange={(e) => edit(r.id, 'duration_min', e.target.value)} />
            </label>
          </div>
          <label className="ck">Visible sur le site
            <input type="checkbox" checked={r.active} onChange={(e) => edit(r.id, 'active', e.target.checked)} />
          </label>
          <div className="row">
            <button className="btn sm" onClick={() => saveRow(r)}>Enregistrer</button>
            <button className="lk danger" onClick={() => removeRow(r)}>Supprimer</button>
          </div>
        </section>
      ))}
      <button className="btn gh" onClick={addRow}>Ajouter une prestation</button>

      {set && (
        <>
          <h3>Apparence et réglages</h3>
          <section className="card">
            <label>Nom de la barbershop
              <input value={set.shop_name} onChange={(e) => up('shop_name', e.target.value)} />
            </label>
            <label>Phrase d’accueil
              <input value={set.tagline} onChange={(e) => up('tagline', e.target.value)} />
            </label>
            <div className="g3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label>Couleur principale
                <input type="color" value={set.color_main} onChange={(e) => up('color_main', e.target.value)} />
              </label>
              <label>Couleur de fond
                <input type="color" value={set.color_bg} onChange={(e) => up('color_bg', e.target.value)} />
              </label>
            </div>
            <label className="ck">Afficher l’enseigne de barber
              <input type="checkbox" checked={set.logo_mode !== 'none'}
                onChange={(e) => up('logo_mode', e.target.checked ? 'base' : 'none')} />
            </label>
            <label>Lien de réservation Cal.com
              <input value={set.cal_url} onChange={(e) => up('cal_url', e.target.value)} />
            </label>
            <label className="ck">Afficher « Propulsé par comu »
              <input type="checkbox" checked={set.show_powered_by}
                onChange={(e) => up('show_powered_by', e.target.checked)} />
            </label>
            <button className="btn sm" onClick={saveSettings}>Enregistrer l’apparence</button>
          </section>
        </>
      )}
      {msg && <p className="notice" role="status">{msg}</p>}
    </main>
  );
}
