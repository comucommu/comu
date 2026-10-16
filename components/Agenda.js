'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, euro } from '../lib/supabase';

const tz = 'Europe/Brussels';
const dayKey = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso));
const dayLabel = (iso) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
const hourLabel = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });

export default function Agenda({ goClient }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 36 * 3600e3).toISOString();
    const { data, error } = await supabase.from('appointments')
      .select('*, clients(id,name,technique,to_follow_up,sensitive,visits), services(name,price_eur)')
      .eq('status', 'planned').gte('starts_at', since).order('starts_at');
    if (error) setMsg('Impossible de charger l’agenda.');
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function finish(a) {
    const price = Number(a.services?.price_eur || 0);
    const date = dayKey(a.starts_at);
    const name = a.clients?.name || 'Client';
    const v = await supabase.from('visits').insert({
      client_id: a.client_id, visit_date: date, service_label: a.services?.name || '', price_eur: price,
    });
    if (v.error) { setMsg('Impossible de terminer (étape 2 SQL lancée ?).'); return; }
    if (price > 0) {
      await supabase.from('ledger').insert({
        entry_date: date, client_id: a.client_id, client_name: name,
        service_label: a.services?.name || '', total_eur: price,
      });
    }
    await supabase.from('appointments').update({ status: 'done' }).eq('id', a.id);
    const all = await supabase.from('visits').select('visit_date').eq('client_id', a.client_id).order('visit_date', { ascending: false });
    await supabase.from('clients').update({ visits: (all.data || []).length, last_visit: all.data?.[0]?.visit_date || null }).eq('id', a.client_id);
    setMsg(`${name} : coupe terminée, ajoutée à la compta.`);
    load();
  }

  const nextId = rows.find((a) => new Date(a.starts_at).getTime() > Date.now() - 3600e3)?.id;
  const groups = [];
  rows.forEach((a) => {
    const k = dayKey(a.starts_at);
    const g = groups.find((x) => x.k === k);
    if (g) g.items.push(a); else groups.push({ k, label: dayLabel(a.starts_at), items: [a] });
  });

  return (
    <div>
      {rows.length === 0 && (
        <p className="mu" style={{ marginTop: 18 }}>
          Aucun rendez-vous à venir. Dès qu’un client réserve, il apparaît ici.
        </p>
      )}
      {groups.map((g) => (
        <div key={g.k}>
          <h3>{g.label}</h3>
          {g.items.map((a) => {
            const c = a.clients || {};
            return (
              <section className={`card${a.id === nextId ? ' next' : ''}`} key={a.id}>
                {a.id === nextId && <span className="tag">Prochain client</span>}
                <div className="row">
                  <strong className="big">{hourLabel(a.starts_at)} · {c.name || 'Client'}</strong>
                </div>
                <p className="mu" style={{ margin: 0 }}>
                  {a.services?.name || 'Prestation'}{a.services ? ` · ${euro(a.services.price_eur)}` : ''}
                  {c.visits ? ` · ${c.visits} visite${c.visits > 1 ? 's' : ''}` : ' · nouveau client'}
                </p>
                {(a.wish_cut || a.wish_beard) && (
                  <p style={{ margin: 0 }}>
                    {a.wish_cut && <span>Coupe voulue : {a.wish_cut}. </span>}
                    {a.wish_beard && <span>Barbe voulue : {a.wish_beard}.</span>}
                  </p>
                )}
                {c.technique && <p style={{ margin: 0 }}><span className="mu">Sa coupe :</span> {c.technique}</p>}
                {c.to_follow_up && !c.sensitive && <p style={{ margin: 0 }}><span className="mu">Dernière conversation :</span> {c.to_follow_up}</p>}
                {c.to_follow_up && c.sensitive && <p className="mu" style={{ margin: 0 }}>Sujet sensible noté : ouvre la fiche.</p>}
                <div className="row">
                  <button className="btn sm" onClick={() => goClient(a.client_id)}>Voir la fiche</button>
                  <button className="btn sm gh" onClick={() => finish(a)}>Terminer la coupe</button>
                </div>
              </section>
            );
          })}
        </div>
      ))}
      <p className="mu" style={{ marginTop: 24 }}>
        Pour poser un congé ou bloquer un créneau, ajoute un événement dans Google Agenda : Cal.com ne propose plus ces horaires.
      </p>
      {msg && <p className="notice" role="status">{msg}</p>}
    </div>
  );
}
