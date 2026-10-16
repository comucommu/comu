import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { supabase } from '../lib/supabase';
import { themeVars } from '../lib/theme';

export const dynamic = 'force-dynamic';

const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' });

export const metadata = {
  title: 'Réservation',
  description: 'Prestations et réservation',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'comu', statusBarStyle: 'black' },
  icons: { apple: '/icon-192.png' },
};

export const viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  const img = data?.bg_image_url || '';
  const preset = img.startsWith('preset:') ? img.slice(7) : '';
  const hasBg = !!(img || data?.bg_video_url);
  return (
    <html lang="fr" style={themeVars(data)}>
      <body className={`${body.variable} ${display.variable}${hasBg ? ' hasbg' : ''}`}>
        {hasBg && (
          <div className="bgm" aria-hidden="true">
            {data.bg_video_url ? (
              <video src={data.bg_video_url} poster={img && !preset ? img : undefined} autoPlay muted loop playsInline preload="auto" />
            ) : (
              <div className={`bgimg${preset ? ` preset-${preset}` : ''}`} style={preset ? undefined : { backgroundImage: `url(${img})` }} />
            )}
            <div className="bgdim" style={{ opacity: (data.bg_dim ?? 55) / 100 }} />
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
