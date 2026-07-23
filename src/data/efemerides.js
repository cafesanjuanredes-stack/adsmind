// AdMind Analytics — Efemérides y feriados
//
// Fuente feriados 2026: Ley 27.399 (feriados inamovibles) + relevamiento de
// prensa (Infobae, La Nación, Diario de Cuyo, AssistCard) — los 3 "puentes
// turísticos" (23/3, 10/7, 7/12) los fija el Poder Ejecutivo por decreto,
// habitualmente publicado en noviembre del año anterior; están confirmados
// en la cobertura de prensa pero conviene reconfirmar cerca de fin de año.
//
// Fuente días temáticos gastronómicos: calendario gastronómico Bistrosoft
// 2026 + prensa (Día del Amigo, Día de la Milanesa, Día de la Empanada).
// Se priorizaron los que más rinden como excusa de contenido para cuentas
// de gastronomía/café (que es el rubro de la mayoría de nuestros clientes).

export const FERIADOS_2026 = [
  { date: '2026-01-01', name: 'Año Nuevo', type: 'feriado' },
  { date: '2026-02-16', name: 'Carnaval', type: 'feriado' },
  { date: '2026-02-17', name: 'Carnaval', type: 'feriado' },
  { date: '2026-03-23', name: 'Puente turístico', type: 'puente' },
  { date: '2026-03-24', name: 'Día de la Memoria por la Verdad y la Justicia', type: 'feriado' },
  { date: '2026-04-02', name: 'Día del Veterano y de los Caídos en Malvinas', type: 'feriado' },
  { date: '2026-04-17', name: 'Viernes Santo', type: 'feriado' },
  { date: '2026-05-01', name: 'Día del Trabajador', type: 'feriado' },
  { date: '2026-05-25', name: 'Día de la Revolución de Mayo', type: 'feriado' },
  { date: '2026-06-17', name: 'Paso a la Inmortalidad del Gral. Güemes', type: 'feriado' },
  { date: '2026-06-20', name: 'Paso a la Inmortalidad del Gral. Belgrano', type: 'feriado' },
  { date: '2026-07-09', name: 'Día de la Independencia', type: 'feriado' },
  { date: '2026-07-10', name: 'Puente turístico', type: 'puente' },
  { date: '2026-08-17', name: 'Paso a la Inmortalidad del Gral. San Martín', type: 'feriado' },
  { date: '2026-10-12', name: 'Día del Respeto a la Diversidad Cultural', type: 'feriado' },
  { date: '2026-11-20', name: 'Día de la Soberanía Nacional', type: 'feriado' },
  { date: '2026-12-07', name: 'Puente turístico', type: 'puente' },
  { date: '2026-12-08', name: 'Inmaculada Concepción de María', type: 'feriado' },
  { date: '2026-12-25', name: 'Navidad', type: 'feriado' },
]

export const DIAS_GASTRONOMICOS_2026 = [
  { date: '2026-01-06', name: 'Día del Alfajor (Arg.)' },
  { date: '2026-01-20', name: 'Día Internacional del Queso' },
  { date: '2026-02-09', name: 'Día Internacional de la Pizza' },
  { date: '2026-02-14', name: 'San Valentín' },
  { date: '2026-03-08', name: 'Día Internacional de la Mujer' },
  { date: '2026-04-08', name: 'Día Nacional de la Empanada (Arg.)' },
  { date: '2026-05-03', name: 'Día de la Milanesa (Arg.)' },
  { date: '2026-05-28', name: 'Día Internacional de la Hamburguesa' },
  { date: '2026-06-18', name: 'Día Internacional del Sushi' },
  { date: '2026-06-21', name: 'Día del Padre (Arg.)' },
  { date: '2026-07-07', name: 'Día Mundial del Chocolate' },
  { date: '2026-07-20', name: 'Día del Amigo (Arg.)' },
  { date: '2026-08-04', name: 'Día Internacional de la Cerveza' },
  { date: '2026-08-09', name: 'Día del Niño (Arg.)' },
  { date: '2026-10-01', name: 'Día Internacional del Café' },
  { date: '2026-10-11', name: 'Día del Dulce de Leche (Arg.)' },
  { date: '2026-10-13', name: 'Día Internacional del Chef' },
  { date: '2026-10-18', name: 'Día de la Madre (Arg.)' },
  { date: '2026-10-31', name: 'Halloween' },
  { date: '2026-11-03', name: 'Día Internacional del Sandwich' },
  { date: '2026-11-24', name: 'Día del Vino Argentino' },
  { date: '2026-11-30', name: 'Día Nacional del Mate (Arg.)' },
  { date: '2026-12-24', name: 'Nochebuena' },
  { date: '2026-12-31', name: 'Fin de año' },
]

// ── Helpers ──────────────────────────────────────────────────────────

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function toISO(d) {
  return d.toISOString().slice(0, 10)
}
function addDays(d, n) {
  const nd = new Date(d)
  nd.setUTCDate(nd.getUTCDate() + n)
  return nd
}
function isWeekend(d) {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

/**
 * Calcula los fines de semana largos del año a partir de la lista de
 * feriados: agrupa corridas de 3+ días no laborables consecutivos
 * (fines de semana + feriados/puentes pegados) que incluyan al menos
 * un feriado real (para no marcar un finde de semana común).
 */
export function computeFindesLargos(feriados = FERIADOS_2026) {
  const feriadoDates = new Map(feriados.map(f => [f.date, f.name]))
  if (!feriados.length) return []

  const allDates = feriados.map(f => toDate(f.date))
  const minDate = addDays(new Date(Math.min(...allDates)), -4)
  const maxDate = addDays(new Date(Math.max(...allDates)), 4)

  const nonWorking = new Set()
  for (let d = new Date(minDate); d <= maxDate; d = addDays(d, 1)) {
    if (isWeekend(d) || feriadoDates.has(toISO(d))) nonWorking.add(toISO(d))
  }

  const findes = []
  let runStart = null
  let prevISO = null
  const sortedDates = [...nonWorking].sort()

  const flush = (endISO) => {
    if (!runStart) return
    const startD = toDate(runStart)
    const endD = toDate(endISO)
    const days = Math.round((endD - startD) / 86400000) + 1
    const motivos = feriados
      .filter(f => f.date >= runStart && f.date <= endISO)
      .map(f => f.name)
    if (days >= 3 && motivos.length) {
      findes.push({ start: runStart, end: endISO, days, motivos: [...new Set(motivos)] })
    }
    runStart = null
  }

  for (const iso of sortedDates) {
    if (!runStart) { runStart = iso; prevISO = iso; continue }
    const gap = (toDate(iso) - toDate(prevISO)) / 86400000
    if (gap === 1) {
      prevISO = iso
    } else {
      flush(prevISO)
      runStart = iso
      prevISO = iso
    }
  }
  flush(prevISO)

  return findes
}

export const FINDES_LARGOS_2026 = computeFindesLargos(FERIADOS_2026)

/**
 * Devuelve el próximo finde largo que empieza dentro de los próximos
 * `withinDays` días (contando desde `fromISO`, default hoy). Sirve para
 * el aviso "se viene un finde largo, generá contenido" en el calendario.
 */
export function getUpcomingFindeLargo(fromISO = toISO(new Date()), withinDays = 12) {
  const from = toDate(fromISO)
  const limit = addDays(from, withinDays)
  return FINDES_LARGOS_2026.find(f => {
    const start = toDate(f.start)
    return start >= from && start <= limit
  }) || null
}

/** Efeméride (feriado o día temático) para una fecha YYYY-MM-DD puntual. */
export function getEfemerideFor(iso) {
  const feriado = FERIADOS_2026.find(f => f.date === iso)
  const tematico = DIAS_GASTRONOMICOS_2026.find(d => d.date === iso)
  if (!feriado && !tematico) return null
  return { feriado: feriado || null, tematico: tematico || null }
}
