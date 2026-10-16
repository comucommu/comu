import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pad = (n) => String(n).padStart(2, '0');

function localDate(iso) {
  // date du rendez-vous à l'heure de Bruxelles
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  return parts;
}

function wishes(p) {
  let cut = '', beard = '';
  const all = { ...(p.userFieldsResponses || {}), ...(p.responses || {}) };
  for (const [key, raw] of Object.entries(all)) {
    const label = String(raw?.label || key).toLowerCase();
    const val = typeof raw === 'object' ? raw?.value : raw;
    if (!val || typeof val !== 'string') continue;
    if (label.includes('coupe') || norm(key).includes('coupe')) cut = val;
    else if (label.includes('barbe') || norm(key).includes('barbe')) beard = val;
  }
  return { cut, beard };
}

function phoneOf(p) {
  const r = p.responses || {};
  const v = r.attendeePhoneNumber?.value || r.phone?.value || r.phoneNumber?.value;
  return typeof v === 'string' ? v : '';
}

function findService(services, p) {
  const hay = norm(`${p.eventTitle || ''} ${p.type || ''} ${p.title || ''}`);
  return [...services]
    .sort((a, b) => b.name.length - a.name.length)
    .find((s) => hay.includes(norm(s.name))) || null;
}

async function upsertClient(db, p) {
  const att = (p.attendees || [])[0] || {};
  const email = String(att.email || p.responses?.email?.value || '').trim().toLowerCase();
  const name = String(att.name || p.responses?.name?.value || 'Client').trim();
  if (email) {
    const { data } = await db.from('clients').select('*').ilike('email', email).maybeSingle();
    if (data) {
      const phone = phoneOf(p);
      if (phone && !data.phone) await db.from('clients').update({ phone }).eq('id', data.id);
      return data;
    }
  }
  const { data, error } = await db.from('clients').insert({ name, email, phone: phoneOf(p) }).select().single();
  if (error) throw error;
  return data;
}

async function ensureAppointment(db, p, services) {
  const { data: existing } = await db.from('appointments').select('*').eq('cal_booking_uid', p.uid).maybeSingle();
  if (existing) return existing;
  const client = await upsertClient(db, p);
  const service = findService(services, p);
  const w = wishes(p);
  const { data, error } = await db.from('appointments').insert({
    client_id: client.id, service_id: service?.id || null, starts_at: p.startTime,
    status: 'planned', wish_cut: w.cut, wish_beard: w.beard, cal_booking_uid: p.uid,
  }).select().single();
  if (error) throw error;
  return data;
}

async function refreshClient(db, clientId) {
  const { data } = await db.from('visits').select('visit_date').eq('client_id', clientId).order('visit_date', { ascending: false });
  await db.from('clients').update({ visits: (data || []).length, last_visit: data?.[0]?.visit_date || null }).eq('id', clientId);
}

export async function POST(req) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !key) return new Response('not configured', { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get('x-cal-signature-256') || '';
  const good = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return new Response('bad signature', { status: 401 });

  let body;
  try { body = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  const event = body.triggerEvent;
  const p = body.payload || {};
  if (!p.uid) return Response.json({ ok: true, ignored: 'no uid' });

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: services = [] } = await db.from('services').select('id,name,price_eur');

  try {
    if (event === 'BOOKING_CREATED' || event === 'BOOKING_RESCHEDULED') {
      if (p.rescheduleUid) await db.from('appointments').update({ status: 'cancelled' }).eq('cal_booking_uid', p.rescheduleUid);
      await ensureAppointment(db, p, services);
    } else if (event === 'BOOKING_CANCELLED') {
      await db.from('appointments').update({ status: 'cancelled' }).eq('cal_booking_uid', p.uid);
    } else if (event === 'MEETING_ENDED') {
      const appt = await ensureAppointment(db, p, services);
      if (appt.status === 'planned') {
        const service = services.find((s) => s.id === appt.service_id);
        const price = Number(service?.price_eur || 0);
        const date = localDate(appt.starts_at);
        const { data: client } = await db.from('clients').select('name').eq('id', appt.client_id).single();
        await db.from('visits').insert({ client_id: appt.client_id, visit_date: date, service_label: service?.name || '', price_eur: price });
        if (price > 0) {
          await db.from('ledger').insert({ entry_date: date, client_id: appt.client_id, client_name: client?.name || 'Client', service_label: service?.name || '', total_eur: price });
        }
        await db.from('appointments').update({ status: 'done' }).eq('id', appt.id);
        await refreshClient(db, appt.client_id);
      }
    }
  } catch (e) {
    return new Response('error: ' + (e.message || 'unknown'), { status: 500 });
  }
  return Response.json({ ok: true });
}
