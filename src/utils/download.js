// ── Download / export utilities ───────────────────────────────────

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadTXT(text, filename) {
  triggerDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename)
}

export function downloadCSV(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const escape  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv     = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
}

export function downloadJSON(data, filename) {
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    filename
  )
}

// Build a full-client TXT report
export function buildClientReport(client, { fmtNum, fmtPct, fmtDate, PLATFORM_META }) {
  const line  = '─'.repeat(60)
  const lines = [
    `REPORTE EJECUTIVO — ${client.name}`,
    `Industria: ${client.industry}`,
    `Generado: ${new Date().toLocaleDateString('es')}`,
    line, '',
    '📊 RESUMEN GLOBAL',
    ...Object.entries(client.platforms).map(([k, p]) => {
      const m = PLATFORM_META[k]
      return `  ${m.label}: ${fmtNum(p.followers)} seg | reach ${fmtPct(p.reach_pct)} | eng ${fmtPct(p.engagement_pct)} | ${p.status}`
    }),
    '',
    '📈 HISTÓRICO INSTAGRAM',
    ...client.history.map(h => `  ${fmtDate(h.date)}: ${fmtNum(h.followers_ig)}${h.milestone ? ` — ${h.milestone}` : ''}`),
    '',
    '🏆 VIRALES DESTACADOS',
    ...client.virals.map(v => `  "${v.title}" — ${fmtNum(v.views)} views | ${fmtNum(v.likes)} likes`),
    '',
    '✅ CONTENIDO QUE FUNCIONA',
    ...client.content.works.map(w => `  • ${w}`),
    '',
    '❌ CONTENIDO QUE NO FUNCIONA',
    ...client.content.fails.map(f => `  • ${f}`),
    '',
    '🏁 BENCHMARK COMPETITIVO',
    ...client.competitors.map(c => `  ${c.name} (${c.handle}): ${fmtNum(c.followers_ig)} seg IG — ${c.type}`),
  ]
  return lines.join('\n')
}
