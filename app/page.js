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
          <h1 className={`fx-${set?.title_effect || 'none'}`}>{set?.shop_name || 'Ma barbershop'}</h1>
          <p className="mu">{set?.tagline}</p>
        </div>
      </div>

      <h3>Nos prestations</h3>
      {(services || []).map((s) => {
        const href = s.booking_url || set?.cal_url || '';
        const Tag = href ? 'a' : 'div';
        return (
          <Tag className={`item${href ? ' go' : ''}`} key={s.id} {...(href ? { href } : {})}>
            <div>
              <h2>{s.name}</h2>
              <p className="mu">
                {s.description && `${s.description} · `}{s.duration_min} min
                {Number(s.deposit_eur) > 0 && ` · acompte de ${euro(s.deposit_eur)} à régler au salon`}
              </p>
            </div>
            <span className="right">
              <span className="price">{euro(s.price_eur)}</span>
              {href && <span className="chev" aria-hidden="true">›</span>}
            </span>
          </Tag>
        );
      })}

      {(set?.address || set?.instagram_url) && (
        <section className="place">
          {set?.address && (
            <p className="addr">{set.address}</p>
          )}
          {set?.instagram_url && (
            <a className="pbtn" href={set.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a>
          )}
        </section>
      )}

      {set?.show_powered_by !== false && <p className="pw">Propulsé par <b>comu</b></p>}
      {set?.cal_url && (
        <div className="stick">
          <a className="btn" href={set.cal_url}>Réserver un créneau</a>
        </div>
      )}
    </main>
  );
}
