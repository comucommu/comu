'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, euro } from '../lib/supabase';
import { PERIODS, range, today } from '../lib/dates';

const num = (v) => Number(String(v).replace(',', '.')) || 0;
const blank = () => ({ entry_date: today(), client_name: '', service_label: '', total_eur: '', note: '' });

export default function Compta() {
  const [period, setPeriod] = useState('mois');
  const [off, setOff] = useState(0);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank());
  const [msg, setMsg] = useState('');
  const r = range(period, off);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('ledger').select('*')
      .gte('entry_date', r.from).lte('entry_date', r.to).order('entry_date', { ascending: false });
    if (error) setMsg('Impossible de charger la compta.');
    setRows(data || []);
  }, [r.from, r.to]);
  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, x) => s + Number(x.total_eur), 0);
  const sums = r.bars.map(() => 0);
  rows.forEach((x) => { const i = r.idx(x.entry_date); if (i >= 0 && i < sums.length) sums[i] += Number(x.total_eur); });
  const max = Math.max(...sums, 1);

  async function add(e) {
    e.preventDefault();
    if (!form.client_name.trim() || !num(form.total_eur)) { setMsg('Il faut au moins un nom et un montant.'); return; }
    const { error } = await supabase.from('ledger').insert({
      entry_date: form.entry_date, client_name: form.client_name.trim(),
      service_label: form.service_label, total_eur: num(form.total_eur), note: form.note,
    });
    if (error) { setMsg('Impossible d’ajouter la ligne.'); return; }
    setForm(blank()); setMsg('Ligne ajoutée.'); load();
  }

  async function del(x) {
    if (!confirm(`Supprimer la ligne de ${x.client_name} (${euro(x.total_eur)}) ?`)) return;
    const { error } = await supabase.from('ledger').delete().eq('id', x.id);
    if (error) setMsg('Impossible de supprimer.'); else load();
  }

  return (
    <div>
      <div className="chips">
        {PERIODS.map(([k, l]) => (
          <button key={k} className={k === period ? 'on' : ''} onClick={() => { setPeriod(k); setOff(0); }}>{l}</button>
        ))}
      </div>
      <div className="row nav">
        <button className="lk" onClick={() => setOff(off - 1)} aria-label="Période précédente">‹</button>
        <strong>{r.label}</strong>
        <button className="lk" onClick={() => setOff(off + 1)} aria-label="Période suivante">›</button>
      </div>

      <section className="card">
        <div className="g3">
          <div><p className="mu">Encaissé</p><p className="big">{euro(total)}</p></div>
          <div><p className="mu">Lignes</p><p className="big">{rows.length}</p></div>
          <div><p className="mu">Panier moyen</p><p className="big">{rows.length ? euro(total / rows.length) : '—'}</p></div>
        </div>
        <div className="bars" aria-hidden="true">
          {sums.map((s, i) => (
            <div key={i}>{s > 0 && <b>{euro(s)}</b>}<span style={{ height: `${(s / max) * 82}%` }} /><em>{r.bars[i]}</em></div>
          ))}
        </div>
      </section>

      <h3>Lignes</h3>
      {rows.length === 0 ? <p className="mu">Rien d’encaissé sur cette période.</p> : (
        <table className="tb">
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>{x.entry_date.slice(8)}/{x.entry_date.slice(5, 7)}</td>
                <td>{x.client_name}<br /><span className="mu">{x.service_label}{x.note ? ` · ${x.note}` : ''}</span></td>
                <td className="amt">{euro(x.total_eur)}</td>
                <td><button className="lk danger" onClick={() => del(x)} aria-label="Supprimer">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Ajouter une ligne</h3>
      <form className="card" onSubmit={add}>
        <div className="g2">
          <label>Date<input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></label>
          <label>Montant (€)<input inputMode="decimal" value={form.total_eur} onChange={(e) => setForm({ ...form, total_eur: e.target.value })} /></label>
        </div>
        <label>Client<input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></label>
        <label>Prestation ou produit<input value={form.service_label} onChange={(e) => setForm({ ...form, service_label: e.target.value })} /></label>
        <label>Remarque (annulation, acompte…)<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        <button className="btn sm" type="submit">Ajouter</button>
      </form>
      {msg && <p className="notice" role="status">{msg}</p>}
    </div>
  );
}
