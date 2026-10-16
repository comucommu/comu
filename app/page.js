import { supabase, euro } from '../lib/supabase';

const SOCIALS = [
  { key: 'instagram_url', label: 'Instagram', icon: (<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>) },
  { key: 'tiktok_url', label: 'TikTok', icon: (<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.3 2.5 2 4.2 5 4.5" />) },
  { key: 'facebook_url', label: 'Facebook', icon: (<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5c0-.3.2-.5.5-.5z" fill="currentColor" stroke="none" />) },
  { key: 'youtube_url', label: 'YouTube', icon: (<><rect x="2" y="5" width="20" height="14" rx="4" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" /></>) },
];

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

      {(set?.address || SOCIALS.some((x) => set?.[x.key])) && (
        <section className="place">
          {set?.address && <p className="addr">{set.address}</p>}
          {SOCIALS.map((x) => set?.[x.key] ? (
            <a key={x.key} className="soc" href={set[x.key]} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{x.icon}</svg>
            </a>
          ) : null)}
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
