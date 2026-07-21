// ── AdMind Analytics — Design Tokens ─────────────────────────────
// Single source of truth for all colors, typography, spacing

export const T = {
  // Backgrounds — tema claro
  bg:      '#F5F1EA',
  card:    '#FFFFFF',
  surf:    '#F7F4EE',
  surf2:   '#EFEAE1',

  // Borders
  border:  '#E2DCD0',
  border2: '#D4CCBC',

  // Platform brand colors
  ig:   '#E1306C',
  tk:   '#00F2EA',
  fb:   '#1877F2',
  yt:   '#FF0000',
  tw:   '#1D9BF0',
  ga:   '#4285F4',
  meta: '#0668E1',

  // Status
  active: '#10B981',
  warn:   '#F59E0B',
  dead:   '#EF4444',

  // Text
  text: '#171310',
  sub:  '#6B6459',
  dim:  '#A69C8C',

  // Accents
  primary: '#E23F79',
  blue:   '#3B82F6',
  violet: '#8B5CF6',
  green:  '#178A45',
  orange: '#C4601F',
  pink:   '#EC4899',
  cyan:   '#0B93A8',
  red:    '#B4232F',
  yellow: '#B8860B',
}

export const PLATFORM_META = {
  instagram: { label: 'Instagram', color: T.ig,   icon: '◈', short: 'IG' },
  tiktok:    { label: 'TikTok',    color: T.tk,   icon: '◉', short: 'TK' },
  facebook:  { label: 'Facebook',  color: T.fb,   icon: '◇', short: 'FB' },
  youtube:   { label: 'YouTube',   color: T.yt,   icon: '▶',  short: 'YT' },
  twitter:   { label: 'X / Twitter', color: T.tw, icon: '✕', short: 'X'  },
}

// Fallback seguro para plataformas que todavía no tengan entrada en PLATFORM_META
export function getPlatformMeta(key) {
  return PLATFORM_META[key] || { label: key, color: T.dim, icon: '●', short: key?.slice(0, 2).toUpperCase() }
}

export const CLIENT_COLORS = [
  T.orange, T.cyan, T.pink, T.green, T.violet, T.primary, T.yellow,
]

export const PLATFORM_KEYS = ['instagram', 'tiktok', 'facebook', 'youtube']

export const POST_TYPES = ['Reel', 'Video corto', 'Video largo', 'Carrusel', 'Imagen', 'Story', 'Short']

export const COMPETITOR_TYPES = [
  'Cadena internacional',
  'Cadena local',
  'Independiente',
  'Persona pública',
  'Marca digital',
]
