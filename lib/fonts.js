// Polices proposées pour le nom (Google Fonts). Le site public ne charge que celle qui est choisie.
export const FONTS = [
  // Majuscules affirmées
  { id: 'Bebas Neue', weight: 400 }, { id: 'Oswald', weight: 700 }, { id: 'Anton', weight: 400 },
  { id: 'Staatliches', weight: 400 }, { id: 'Teko', weight: 700 }, { id: 'Fjalla One', weight: 400 },
  { id: 'Archivo Black', weight: 400 }, { id: 'Alfa Slab One', weight: 400 },
  // Élégantes (avec empattements)
  { id: 'Playfair Display', weight: 800 }, { id: 'Cinzel', weight: 700 }, { id: 'Abril Fatface', weight: 400 },
  { id: 'Bodoni Moda', weight: 700 }, { id: 'DM Serif Display', weight: 400 }, { id: 'Cormorant Garamond', weight: 700 },
  { id: 'Libre Baskerville', weight: 700 }, { id: 'Lora', weight: 700 },
  // Modernes et sobres
  { id: 'Montserrat', weight: 800 }, { id: 'Raleway', weight: 800 }, { id: 'Poppins', weight: 700 },
  { id: 'Inter', weight: 800 }, { id: 'Josefin Sans', weight: 700 },
  // Gothiques
  { id: 'UnifrakturCook', weight: 700 }, { id: 'UnifrakturMaguntia', weight: 400 }, { id: 'Pirata One', weight: 400 },
  { id: 'New Rocker', weight: 400 }, { id: 'Grenze Gotisch', weight: 700 },
  // Comiques
  { id: 'Bangers', weight: 400 }, { id: 'Luckiest Guy', weight: 400 }, { id: 'Chewy', weight: 400 },
  // Néon et science-fiction
  { id: 'Monoton', weight: 400 }, { id: 'Tilt Neon', weight: 400 }, { id: 'Orbitron', weight: 700 },
  { id: 'Audiowide', weight: 400 }, { id: 'Michroma', weight: 400 }, { id: 'Rajdhani', weight: 700 },
  { id: 'Oxanium', weight: 700 }, { id: 'Exo 2', weight: 800 },
  // Western, vintage et blocs
  { id: 'Rye', weight: 400 }, { id: 'Special Elite', weight: 400 }, { id: 'Bungee', weight: 400 },
  { id: 'Righteous', weight: 400 }, { id: 'Russo One', weight: 400 },
  // Écriture
  { id: 'Permanent Marker', weight: 400 }, { id: 'Lobster', weight: 400 }, { id: 'Pacifico', weight: 400 },
  { id: 'Kaushan Script', weight: 400 }, { id: 'Great Vibes', weight: 400 }, { id: 'Dancing Script', weight: 700 },
  { id: 'Yellowtail', weight: 400 },
];

const q = (f) => `family=${f.id.replace(/ /g, '+')}:wght@${f.weight}`;
export const fontsHref = (list) => `https://fonts.googleapis.com/css2?${list.map(q).join('&')}&display=swap`;

export const chosenFont = (set) => FONTS.find((f) => f.id === set?.title_font) || null;

// variables CSS à poser sur l'élément qui contient le nom
export function titleVars(set) {
  const f = chosenFont(set);
  return f ? { '--font-title': `'${f.id}'`, '--title-weight': f.weight } : {};
}
