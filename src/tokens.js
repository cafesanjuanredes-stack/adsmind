// ── AdMind Analytics — Design Tokens ─────────────────────────────
// Single source of truth for all colors, typography, spacing

import { Camera, Music2, Users, Play, X, Circle } from 'lucide-react'

export const T = {
  // Backgrounds — tema claro, look limpio/neutro
  bg:      '#F9FAFB',
  card:    '#FFFFFF',
  surf:    '#F7F8FA',
  surf2:   '#F1F3F5',

  // Borders
  border:  '#E9ECEF',
  border2: '#DEE2E6',

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
  text: '#16181D',
  sub:  '#5C6470',
  dim:  '#98A2B3',

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

// ── Escala de radios y sombras — sistema de diseño más moderno ──────
// (tarjetas más redondeadas, sombras suaves en vez de solo bordes planos)
export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
}

export const SHADOW = {
  xs: '0 1px 2px rgba(16,24,40,.04)',
  sm: '0 1px 3px rgba(16,24,40,.05)',
  md: '0 4px 16px rgba(16,24,40,.06)',
  lg: '0 12px 32px rgba(16,24,40,.10)',
}

export const PLATFORM_META = {
  instagram: { label: 'Instagram', color: T.ig,   icon: Camera, short: 'IG' },
  tiktok:    { label: 'TikTok',    color: T.tk,   icon: Music2, short: 'TK' },
  facebook:  { label: 'Facebook',  color: T.fb,   icon: Users,  short: 'FB' },
  youtube:   { label: 'YouTube',   color: T.yt,   icon: Play,   short: 'YT' },
  twitter:   { label: 'X / Twitter', color: T.tw, icon: X,      short: 'X'  },
}

// Fallback seguro para plataformas que todavía no tengan entrada en PLATFORM_META
export function getPlatformMeta(key) {
  return PLATFORM_META[key] || { label: key, color: T.dim, icon: Circle, short: key?.slice(0, 2).toUpperCase() }
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
