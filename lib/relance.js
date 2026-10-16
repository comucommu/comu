export const RELANCE_DAYS = 21;

export const daysSince = (d) => Math.floor((Date.now() - new Date(d + 'T12:00').getTime()) / 864e5);

// Message de relance personnalisé. Pour un sujet sensible, on ne cite jamais le sujet.
export function relanceMessage(c, calUrl = '') {
  const first = (c.name || '').split(' ')[0];
  const link = calUrl
    ? `\n\nRéserve en un clic : ${calUrl}${calUrl.includes('?') ? '&' : '?'}name=${encodeURIComponent(c.name || '')}${c.email ? `&email=${encodeURIComponent(c.email)}` : ''}`
    : '';
  if (c.sensitive) return `Salut ${first}, j'ai pensé à toi. Comment ça va ? Passe quand tu veux, je te garde un créneau.${link}`;
  const topic = (c.to_follow_up || '').split(/\n| · /)[0].trim();
  if (topic) return `Salut ${first} ! Je repensais à notre discussion : « ${topic} ». Comment ça s'est passé ? Si tu veux passer, je te garde un créneau.${link}`;
  return `Salut ${first} ! Ça fait un moment, je te garde un créneau si tu veux passer.${link}`;
}
