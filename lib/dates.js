export const pad = (n) => String(n).padStart(2, '0');
export const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dstr(new Date());
export const PERIODS = [['sem', 'Semaine'], ['mois', 'Mois'], ['tri', 'Trimestre'], ['an', 'Année']];

export function range(period, off) {
  const n = new Date(), y = n.getFullYear(), mo = n.getMonth();
  let b, e, label, bars, idx;
  if (period === 'sem') {
    b = new Date(y, mo, n.getDate() + off * 7 - ((n.getDay() + 6) % 7));
    e = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 6);
    const f = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    label = `Semaine du ${f(b)} au ${f(e)}`;
    bars = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    idx = (s) => Math.round((new Date(s + 'T12:00') - new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12)) / 864e5);
  } else if (period === 'mois') {
    b = new Date(y, mo + off, 1);
    e = new Date(y, mo + off + 1, 0);
    label = b.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    bars = ['S1', 'S2', 'S3', 'S4', 'S5'];
    idx = (s) => Math.min(4, Math.floor((+s.slice(8) - 1) / 7));
  } else if (period === 'tri') {
    b = new Date(y, Math.floor(mo / 3) * 3 + off * 3, 1);
    e = new Date(b.getFullYear(), b.getMonth() + 3, 0);
    label = `T${Math.floor(b.getMonth() / 3) + 1} ${b.getFullYear()}`;
    bars = [0, 1, 2].map((k) => new Date(b.getFullYear(), b.getMonth() + k, 1).toLocaleDateString('fr-FR', { month: 'short' }));
    idx = (s) => +s.slice(5, 7) - 1 - b.getMonth();
  } else {
    b = new Date(y + off, 0, 1);
    e = new Date(y + off, 11, 31);
    label = String(y + off);
    bars = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    idx = (s) => +s.slice(5, 7) - 1;
  }
  return { from: dstr(b), to: dstr(e), label, bars, idx };
}
