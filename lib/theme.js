const HEX = /^#[0-9a-f]{6}$/i;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
const mix = (a, b, t) => {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => ('0' + Math.round(v + (y[i] - v) * t).toString(16)).slice(-2)).join('');
};
const lum = (h) => { const c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };

export function themeVars(s) {
  const m = HEX.test(s?.color_main || '') ? s.color_main : '#d4a933';
  const b = HEX.test(s?.color_bg || '') ? s.color_bg : '#000000';
  const dark = lum(b) < 0.5;
  const tx = dark ? '#efe8d8' : '#1a1a1a';
  const e = dark ? '#ffffff' : '#000000';
  return {
    '--bg': b, '--g': m, '--gh': mix(m, '#ffffff', 0.35), '--gl': mix(m, '#000000', 0.35),
    '--tx': tx, '--mu': mix(tx, b, 0.5), '--p1': mix(b, e, 0.07), '--p2': mix(b, e, 0.12),
    '--ln': mix(b, e, 0.2), '--on': lum(m) > 0.55 ? '#000000' : '#ffffff',
  };
}
