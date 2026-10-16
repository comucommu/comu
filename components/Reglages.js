'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { themeVars } from '../lib/theme';
import { FONTS, fontsHref, titleVars } from '../lib/fonts';

const num = (v) => Number(String(v).replace(',', '.')) || 0;

export default function Reglages({ part = 'design' }) {
  const [rows, setRows] = useState([]);
  const [set, setSet] = useState(null);
  const saved = useRef(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const a = await supabase.from('services').select('*').order('position');
    const b = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (a.error || b.error) setMsg('Impossible de charger les données.');
    setRows(a.data || []);
    setSet(b.data);
    saved.current = b.data;
  }
  useEffect(() => { load(); }, []);

  // toute la page d'admin suit la couleur choisie en direct ; elle revient à la couleur enregistrée en quittant l'onglet
  const applyTheme = (x) => {
    const root = document.documentElement;
    const vars = { ...themeVars(x), ...titleVars(x) };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, String(v)));
    ['--font-title', '--title-weight'].forEach((k) => { if (!(k in vars)) root.style.removeProperty(k); });
  };
  useEffect(() => { if (part === 'design' && set) applyTheme(set); }, [part, set]);
  useEffect(() => () => { if (saved.current) applyTheme(saved.current); }, []);
  useEffect(() => {
    if (part !== 'design') return;
    // une requête par police : si un nom était refusé, seule cette police manquerait
    const links = FONTS.map((f) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = fontsHref([f]);
      document.head.appendChild(l);
      return l;
    });
    return () => links.forEach((l) => l.remove());
  }, [part]);

  const edit = (id, f, v) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [f]: v } : x)));

  async function saveRow(r) {
    const { error } = await supabase.from('services').update({
      name: r.name,
      description: r.description,
      duration_min: parseInt(r.duration_min, 10) || 0,
      price_eur: num(r.price_eur),
      deposit_eur: num(r.deposit_eur),
      active: r.active,
      booking_url: r.booking_url || '',
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
      bg_image_url: set.bg_image_url || '', bg_video_url: set.bg_video_url || '',
      bg_dim: parseInt(set.bg_dim, 10) || 0,
      title_effect: set.title_effect || 'none',
      address: set.address || '', instagram_url: set.instagram_url || '',
      title_font: set.title_font || '',
    }).eq('id', 1);
    if (!error) saved.current = { ...set };
    setMsg(error ? 'Échec de l’enregistrement.' : 'Apparence enregistrée. Recharge le site pour la voir.');
  }

  const up = (f, v) => setSet((s) => ({ ...s, [f]: v }));

  async function upload(e, kind) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const max = kind === 'video' ? 10 : 6;
    if (file.size > max * 1024 * 1024) { setMsg(`Fichier trop lourd (max ${max} Mo). Compresse-le d’abord.`); return; }
    setMsg('Envoi en cours…');
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site').upload(path, file, { contentType: file.type, upsert: true });
    if (error) { setMsg('Envoi impossible (étape 3 SQL lancée ?).'); return; }
    const { data } = supabase.storage.from('site').getPublicUrl(path);
    up(kind === 'video' ? 'bg_video_url' : 'bg_image_url', data.publicUrl);
    setMsg('Fichier envoyé. Clique sur « Enregistrer l’apparence » pour l’appliquer.');
  }

  return (
    <div>
      {part === 'prix' && (
        <>
      <h3>Mes prix</h3>
      {rows.map((r) => (
        <section className="card" key={r.id}>
          <label>Prestation
            <input value={r.name} onChange={(e) => edit(r.id, 'name', e.target.value)} />
          </label>
          <label>Description
            <input value={r.description} onChange={(e) => edit(r.id, 'description', e.target.value)} />
          </label>
          <label>Lien direct de réservation (facultatif)
            <input placeholder="Ex : https://cal.com/ton-nom/coupe-classique" value={r.booking_url || ''} onChange={(e) => edit(r.id, 'booking_url', e.target.value)} />
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

        </>
      )}
      {part === 'design' && set && (
        <>
          <div className="live" style={{ ...themeVars(set), ...titleVars(set) }} aria-label="Aperçu en direct">
            {(set.bg_image_url || set.bg_video_url) && (
              <div className="bgm">
                <div className={`bgimg${(set.bg_image_url || '').startsWith('preset:') ? ` preset-${set.bg_image_url.slice(7)}` : ''}`}
                  style={set.bg_image_url && !set.bg_image_url.startsWith('preset:') ? { backgroundImage: `url(${set.bg_image_url})` } : undefined} />
                <div className="bgdim" style={{ opacity: (set.bg_dim ?? 55) / 100 }} />
              </div>
            )}
            <div className="live-in">
              {set.logo_mode !== 'none' && <div className="pole sm" aria-hidden="true" />}
              <h1 className={`fx-${set.title_effect || 'none'}`}>{set.shop_name || 'Ma barbershop'}</h1>
              <p className="mu">{set.tagline}</p>
              <div className="live-extra">
                <span className="btn sm" style={{ marginTop: 10, display: 'inline-block' }}>Réserver un créneau</span>
              </div>
            </div>
          </div>
          <p className="mu" style={{ textAlign: 'center', margin: '6px 0 0' }}>Aperçu en direct : rien n’est publié tant que tu n’as pas enregistré.</p>
          <h3>Design et réglages</h3>
          <section className="card">
            <label>Nom de la barbershop
              <input value={set.shop_name} onChange={(e) => up('shop_name', e.target.value)} />
            </label>
            <div>
              <p className="mu" style={{ margin: '0 0 6px' }}>Effet sur le nom</p>
              <div className="chips fxchips" style={{ margin: 0 }}>
                {[['none', 'Aucun'], ['glow', 'Glow'], ['neon', 'Néon'], ['degrade', 'Dégradé'], ['contour', 'Contour'], ['ombre', 'Ombre'], ['pulse', 'Pulsation']].map(([k, l]) => (
                  <button type="button" key={k} className={(set.title_effect || 'none') === k ? 'on' : ''} onClick={() => up('title_effect', k)}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mu" style={{ margin: '0 0 6px' }}>Police du nom</p>
              <div className="chips fxchips fontlist" style={{ margin: 0 }}>
                <button type="button" className={!set.title_font ? 'on' : ''} onClick={() => up('title_font', '')}>Classique</button>
                {FONTS.map((f) => (
                  <button type="button" key={f.id} className={set.title_font === f.id ? 'on' : ''}
                    style={{ fontFamily: `'${f.id}', sans-serif`, fontWeight: f.weight }} onClick={() => up('title_font', f.id)}>{f.id}</button>
                ))}
              </div>
            </div>
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
            <div>
              <p className="mu" style={{ margin: '0 0 6px' }}>Fond du site (sans photo)</p>
              <div className="chips" style={{ margin: 0 }}>
                <button type="button" className={set.bg_image_url === 'preset:chaud' ? 'on' : ''} onClick={() => up('bg_image_url', 'preset:chaud')}>Décor sombre chaud</button>
                <button type="button" className={set.bg_image_url === 'preset:couleur' ? 'on' : ''} onClick={() => up('bg_image_url', 'preset:couleur')}>Aux couleurs du site</button>
                <button type="button" className={!set.bg_image_url ? 'on' : ''} onClick={() => up('bg_image_url', '')}>Aucun</button>
              </div>
            </div>
            <label>Ou envoie ta propre photo de fond
              <input type="file" accept="image/*" onChange={(e) => upload(e, 'image')} />
            </label>
            {set.bg_image_url && !set.bg_image_url.startsWith('preset:') && <button className="lk danger" onClick={() => up('bg_image_url', '')}>Retirer la photo</button>}
            <label>Vidéo de fond (courte, muette, moins de 3 Mo idéalement)
              <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => upload(e, 'video')} />
            </label>
            {set.bg_video_url && <button className="lk danger" onClick={() => up('bg_video_url', '')}>Retirer la vidéo</button>}
            <label>Voile sombre sur le fond : {set.bg_dim ?? 55} %
              <input type="range" min="0" max="90" value={set.bg_dim ?? 55} onChange={(e) => up('bg_dim', e.target.value)} />
            </label>
            <label>Adresse du salon (affichée avec un bouton Itinéraire)
              <input placeholder="Ex : Rue Saint-Gilles 12, 4000 Liège" value={set.address || ''} onChange={(e) => up('address', e.target.value)} />
            </label>
            <label>Lien Instagram (facultatif)
              <input placeholder="https://instagram.com/ton_compte" value={set.instagram_url || ''} onChange={(e) => up('instagram_url', e.target.value)} />
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
    </div>
  );
}
