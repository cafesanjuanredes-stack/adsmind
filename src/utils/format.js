// ── Number & date formatters ──────────────────────────────────────

export function fmtNum(n) {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toFixed(1) + '%'
}

export function fmtDate(s) {
  if (!s) return '—'
  const [y, m] = s.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[+m - 1]} ${y}`
}

export function fmtCurrency(n) {
  if (n == null) return '—'
  return '$' + n.toLocaleString('es')
}

export function fmtDateFull(s) {
  if (!s) return '—'
  return new Date(s + '-01').toLocaleDateString('es', { month: 'long', year: 'numeric' })
}

// Growth between two values
export function calcGrowth(from, to) {
  if (!from || from === 0) return null
  return (((to - from) / from) * 100).toFixed(1)
}
