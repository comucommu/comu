'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, euro } from '../lib/supabase';
import { today } from '../lib/dates';
import { RELANCE_DAYS, daysSince, relanceMessage } from '../lib/relance';

const num = (v) => Number(String(v).replace(',', '.')) || 0;
const fr = (d) => (d ? `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');

export default function Clients({ initial = null }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(initial);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) setMsg('Impossible de charger les clients.');
    setList(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    const name = prompt('Nom du client ?');
    if (!name || !name.trim()) return;
    const { data, error } = await supabase.from('clients').insert({ name: name.trim() }).select().single();
    if (error) { setMsg('Impossible de créer le client.'); return; }
    await load(); setOpen(data.id);
  }

  if (open) {
    const c = list.find((x) => x.id === open);
    if (c) return <Fiche c={c} back={() => { setOpen(null); load(); }} />;
  }

  const due = list.filter((c) => c.last_visit && daysSince(c.last_visit) >= RELANCE_DAYS);
  const shown = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      {due.length > 0 && (
        <>
          <h3>À relancer ({due.length})</h3>
          {due.map((c) => <Relance key={c.id} c={c} onOpen={() => setOpen(c.id)} />)}
        </>
      )}
      <h3>Mes clients</h3>
      <input placeholder="Chercher un client" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ height: 10 }} />
      {shown.map((c) => (
        <button key={c.id} className="item cl" onClick={() => setOpen(c.id)}>
          <span>
            <strong>{c.name}{c.sensitive ? ' 🤍' : ''}</strong>
            <span className="mu block">{c.visits} visite{c.visits > 1 ? 's' : ''} · dernière : {fr(c.last_visit)}</span>
          </span>
          <span className="mu">›</span>
        </button>
      ))}
      {shown.length === 0 && <p className="mu">Aucun client pour l’instant.</p>}
      <button className="btn gh" onClick={create}>Ajouter un client</button>
      {msg && <p className="notice" role="status">{msg}</p>}
    </div>
  );
}

function Relance({ c, onOpen }) {
  const text = relanceMessage(c);
  const mail = c.email
    ? `mailto:${c.email}?subject=${encodeURIComponent('Un petit coucou')}&body=${encodeURIComponent(text)}`
    : null;
  return (
    <section className="card">
      <div className="row">
        <strong>{c.name}</strong>
        <span className="mu">{daysSince(c.last_visit)} jours</span>
      </div>
      <p className="msgbox">{text}</p>
      <div className="row">
        {mail ? <a className="btn sm" href={mail}>Envoyer par mail</a>
          : <span className="mu">Pas d’email : ouvre la fiche pour l’ajouter.</span>}
        <button className="lk" onClick={() => navigator.clipboard?.writeText(text)}>Copier</button>
        <button className="lk" onClick={onOpen}>Fiche</button>
      </div>
    </section>
  );
}

function Fiche({ c, back }) {
  const [f, setF] = useState(c);
  const [visits, setVisits] = useState([]);
  const [services, setServices] = useState([]);
  const [v, setV] = useState({ visit_date: today(), service_label: '', price_eur: '', topics: '', compta: true });
  const [msg, setMsg] = useState('');

  const loadVisits = useCallback(async () => {
    const a = await supabase.from('visits').select('*').eq('client_id', c.id).order('visit_date', { ascending: false });
    if (a.error) setMsg('Historique indisponible : l’étape 2 SQL a-t-elle été lancée ?');
    setVisits(a.data || []);
  }, [c.id]);
  useEffect(() => {
    loadVisits();
    supabase.from('services').select('name,price_eur').order('position').then(({ data }) => setServices(data || []));
  }, [loadVisits]);

  const set = (k, val) => setF((x) => ({ ...x, [k]: val }));

  async function save() {
    const { error } = await supabase.from('clients').update({
      name: f.name, phone: f.phone, email: f.email, note: f.note,
      technique: f.technique, to_follow_up: f.to_follow_up, sensitive: f.sensitive,
    }).eq('id', c.id);
    setMsg(error ? 'Échec de l’enregistrement.' : 'Fiche enregistrée.');
  }

  function pick(name) {
    const s = services.find((x) => x.name === name);
    setV((x) => ({ ...x, service_label: name, price_eur: s ? String(s.price_eur) : x.price_eur }));
  }

  async function addVisit(e) {
    e.preventDefault();
    const price = num(v.price_eur);
    const ins = await supabase.from('visits').insert({
      client_id: c.id, visit_date: v.visit_date, service_label: v.service_label,
      price_eur: price, topics: v.topics,
    });
    if (ins.error) { setMsg('Impossible d’enregistrer la visite (étape 2 SQL lancée ?).'); return; }
    if (v.compta && price > 0) {
      await supabase.from('ledger').insert({
        entry_date: v.visit_date, client_id: c.id, client_name: f.name,
        service_label: v.service_label, total_eur: price,
      });
    }
    const all = await supabase.from('visits').select('visit_date').eq('client_id', c.id).order('visit_date', { ascending: false });
    const n = (all.data || []).length;
    const patch = { visits: n, last_visit: all.data?.[0]?.visit_date || v.visit_date };
    if (v.topics.trim()) patch.to_follow_up = v.topics.trim();
    await supabase.from('clients').update(patch).eq('id', c.id);
    setF((x) => ({ ...x, ...patch }));
    setV({ visit_date: today(), service_label: '', price_eur: '', topics: '', compta: true });
    setMsg('Visite ajoutée.'); loadVisits();
  }

  async function delVisit(x) {
    if (!confirm('Supprimer cette visite ?')) return;
    await supabase.from('visits').delete().eq('id', x.id);
    const all = await supabase.from('visits').select('visit_date').eq('client_id', c.id).order('visit_date', { ascending: false });
    const patch = { visits: (all.data || []).length, last_visit: all.data?.[0]?.visit_date || null };
    await supabase.from('clients').update(patch).eq('id', c.id);
    setF((y) => ({ ...y, ...patch })); loadVisits();
  }

  async function removeClient() {
    if (!confirm(`Supprimer la fiche de ${f.name} et tout son historique ?`)) return;
    await supabase.from('clients').delete().eq('id', c.id);
    back();
  }

  const editTopics = (id, val) => setVisits((vs) => vs.map((x) => (x.id === id ? { ...x, topics: val } : x)));
  async function saveTopics(x) {
    const { error } = await supabase.from('visits').update({ topics: x.topics }).eq('id', x.id);
    if (!error && x.topics.trim() && x.id === visits[0]?.id) {
      await supabase.from('clients').update({ to_follow_up: x.topics.trim() }).eq('id', c.id);
      setF((y) => ({ ...y, to_follow_up: x.topics.trim() }));
    }
    setMsg(error ? 'Échec de l’enregistrement.' : 'Conversation enregistrée.');
  }

  const lastTopics = visits.find((x) => x.topics)?.topics;

  return (
    <div>
      <button className="lk" onClick={back}>‹ Tous les clients</button>
      <h3 style={{ marginTop: 6 }}>{f.name}</h3>

      <section className="card sum">
        <p><strong>{f.visits} rendez-vous</strong> · dernier le {fr(f.last_visit)}</p>
        {f.technique && <p><span className="mu">Sa coupe :</span> {f.technique}</p>}
        {lastTopics && <p><span className="mu">Dernière conversation :</span> {lastTopics}</p>}
        {!f.technique && !lastTopics && <p className="mu">Rien d’écrit pour l’instant : remplis la fiche ci-dessous.</p>}
      </section>

      <h3>Ajouter une visite</h3>
      <form className="card" onSubmit={addVisit}>
        <div className="g2">
          <label>Date<input type="date" value={v.visit_date} onChange={(e) => setV({ ...v, visit_date: e.target.value })} /></label>
          <label>Montant (€)<input inputMode="decimal" value={v.price_eur} onChange={(e) => setV({ ...v, price_eur: e.target.value })} /></label>
        </div>
        <label>Prestation
          <select value={v.service_label} onChange={(e) => pick(e.target.value)}>
            <option value="">—</option>
            {services.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label>De quoi on a parlé
          <textarea rows={3} placeholder="Ex : sa mère est à l’hôpital, il part en vacances en août…" value={v.topics} onChange={(e) => setV({ ...v, topics: e.target.value })} />
        </label>
        <label className="ck">Ajouter à la compta
          <input type="checkbox" checked={v.compta} onChange={(e) => setV({ ...v, compta: e.target.checked })} />
        </label>
        <button className="btn sm" type="submit">Enregistrer la visite</button>
      </form>

      <h3>Fiche</h3>
      <section className="card">
        <label>Nom<input value={f.name} onChange={(e) => set('name', e.target.value)} /></label>
        <div className="g2">
          <label>Téléphone<input inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></label>
          <label>Email<input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
        </div>
        <label>Particularités de la coupe
          <textarea rows={3} placeholder="Ex : dégradé 2 sur les côtés, raie à gauche, épi à gauche" value={f.technique} onChange={(e) => set('technique', e.target.value)} />
        </label>
        <label>À reprendre à la prochaine visite
          <textarea rows={2} value={f.to_follow_up} onChange={(e) => set('to_follow_up', e.target.value)} />
        </label>
        <label>Notes
          <textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} />
        </label>
        <label className="ck">Sujet sensible (le message de relance ne le citera pas)
          <input type="checkbox" checked={f.sensitive} onChange={(e) => set('sensitive', e.target.checked)} />
        </label>
        <div className="row">
          <button className="btn sm" onClick={save}>Enregistrer la fiche</button>
          <button className="lk danger" onClick={removeClient}>Supprimer</button>
        </div>
      </section>

      <h3>Historique</h3>
      {visits.length === 0 && <p className="mu">Aucune visite enregistrée.</p>}
      {visits.map((x) => (
        <section className="card" key={x.id}>
          <div className="row">
            <strong>{fr(x.visit_date)} · {x.service_label || 'Visite'}</strong>
            <span>{Number(x.price_eur) ? euro(x.price_eur) : ''}</span>
          </div>
          <textarea rows={2} placeholder="De quoi on a parlé…" value={x.topics} onChange={(e) => editTopics(x.id, e.target.value)} />
          <div className="row">
            <button className="btn sm" onClick={() => saveTopics(x)}>Enregistrer</button>
            <button className="lk danger" onClick={() => delVisit(x)}>Supprimer</button>
          </div>
        </section>
      ))}
      {msg && <p className="notice" role="status">{msg}</p>}
    </div>
  );
}
