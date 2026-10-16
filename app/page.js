import { supabase, euro } from '../lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: set } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  const { data: services } = await supabase
    .from('services').select('*').eq('active', true).order('position');

  return (
    <main className="wrap pub">
      <div className="hero">
        {set?.logo_mode !== 'none' && <div className="pole" aria-hidden="true" />}
        <div>
          <h1>{set?.shop_name || 'Ma barbershop'}</h1>
          <p className="mu">{set?.tagline}</p>
        </div>
      </div>

      <h3>Nos prestations</h3>
      {(services || []).map((s) => (
        <div className="item" key={s.id}>
          <div>
            <h2>{s.name}</h2>
            <p className="mu">
              {s.description && `${s.description} · `}{s.duration_min} min
              {Number(s.deposit_eur) > 0 && ` · acompte de ${euro(s.deposit_eur)} à régler au salon`}
            </p>
          </div>
          <span className="price">{euro(s.price_eur)}</span>
        </div>
      ))}

      {set?.show_powered_by !== false && <p className="pw">Propulsé par <b>comu</b></p>}
      {set?.cal_url && (
        <div className="stick">
          <a className="btn" href={set.cal_url}>Réserver un créneau</a>
        </div>
      )}
    </main>
  );
}
