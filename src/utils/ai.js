// ── Claude API helper ─────────────────────────────────────────────
// All calls to Anthropic go through here

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-sonnet-4-6'

/**
 * Send a messages array to Claude and return the text reply.
 * @param {string}   system   - System prompt
 * @param {Array}    messages - [{role, content}]
 * @param {number}   maxTokens
 * @returns {Promise<string>}
 */
export async function callClaude(system, messages, maxTokens = 1000) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// Build system prompt with all client data injected
export function buildClientSystem(client, allClients, { fmtNum, fmtPct, fmtDate, PLATFORM_META }) {
  const platformLines = Object.entries(client.platforms).map(([k, p]) => {
    const m = PLATFORM_META[k]
    return `${m.label}: ${fmtNum(p.followers)} seguidores, reach ${fmtPct(p.reach_pct)}, engagement ${fmtPct(p.engagement_pct)}, viral pico ${fmtNum(p.views_viral)}, frecuencia ${p.freq_week}/sem, estado: ${p.status}. ${p.notes}`
  }).join('\n')

  const historyLine = client.history
    .map(h => `${fmtDate(h.date)}: ${fmtNum(h.followers_ig)}${h.milestone ? ` (${h.milestone})` : ''}`)
    .join(' → ')

  const viralsLine = client.virals
    .map(v => `"${v.title}" ${fmtNum(v.views)} views`)
    .join(' | ')

  return `Eres AdMind Analytics, el estratega de marketing digital más avanzado del mercado hispanohablante. Hablas español rioplatense. Eres directo, analítico y específico. Usás datos concretos, nunca generalidades.

CLIENTE ACTIVO: ${client.name} (${client.industry})

PLATAFORMAS:
${platformLines}

HISTÓRICO INSTAGRAM: ${historyLine}

VIRALES HISTÓRICOS: ${viralsLine}

CONTENIDO — Funciona: ${client.content.works.join(', ')}
CONTENIDO — No funciona: ${client.content.fails.join(', ')}
MEJOR HORARIO: ${client.content.best_days?.join(', ')} · ${client.content.best_time}

COMPETIDORES: ${client.competitors.map(c => `${c.name} (${fmtNum(c.followers_ig)} IG)`).join(', ')}

AGENCIA COMPLETA: ${allClients.length} clientes. ${allClients.map(c => `${c.name}: ${fmtNum(c.platforms.instagram.followers)} IG`).join(', ')}

INSTRUCCIONES:
- Cuando el usuario pega un link de post, analizá en detalle: tipo, hook, caption, CTA, estimación vs promedios de la cuenta, qué replicar.
- Cuando pida reporte ejecutivo, usá secciones con emojis como separadores y sé exhaustivo.
- Cuando pidan análisis de período, calculá velocidad de crecimiento, comparación con otros períodos, y qué lo causó.
- Formato limpio, saltos de línea claros, datos con números reales siempre.`
}
