// Supabase Edge Function: compute-content-insights
//
// Corre por cron (recomendado: 1 vez por semana). Reemplaza el análisis
// manual de "qué funciona / qué no funciona" por uno calculado con datos
// reales de las piezas publicadas desde la app (piezas + metricas_piezas):
//   - Mejor día y mejor franja horaria para publicar (por reach promedio).
//   - Qué tipo de pieza (historia/post/reel/carrusel) rinde mejor o peor
//     que el promedio de la cuenta.
//   - Alerta si el reach promedio cayó ≥20% en el último mes vs el anterior.
//   - Detecta piezas "virales" (reach ≥ 1.8x el promedio) y las agrega solas
//     a client_virals, con el link real al post (permalink).
//
// Solo corre para clientes con cuenta de Meta activa Y al menos 5 piezas
// publicadas con métricas — si no hay suficiente data real todavía, no
// toca nada (para no pisar el diagnóstico cargado a mano de otros clientes).
// Las líneas que agrega van marcadas con el prefijo "[Auto]" y se
// reemplazan solas en cada corrida, sin duplicarse ni borrar lo cargado
// a mano.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MIN_SAMPLES = 5
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function dayName(iso: string) {
  return DAY_NAMES[new Date(iso).getUTCDay()]
}

function timeBucket(iso: string) {
  const h = new Date(iso).getUTCHours()
  if (h >= 6 && h < 12) return 'mañana (6-12hs)'
  if (h >= 12 && h < 19) return 'tarde (12-19hs)'
  return 'noche (19-6hs)'
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

Deno.serve(async () => {
  const { data: accounts, error } = await supabase
    .from('meta_accounts')
    .select('client_id')
    .eq('status', 'active')

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results: unknown[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()

  for (const account of accounts || []) {
    try {
      const { data: piezas, error: pErr } = await supabase
        .from('piezas')
        .select('id, tipo, caption, published_at, permalink')
        .eq('client_id', account.client_id)
        .eq('estado', 'publicada')
        .gte('published_at', ninetyDaysAgo)
      if (pErr) throw pErr
      if (!piezas || piezas.length < MIN_SAMPLES) {
        results.push({ client_id: account.client_id, ok: true, skipped: 'no hay suficientes piezas publicadas todavía' })
        continue
      }

      const piezaIds = piezas.map(p => p.id)
      const { data: metricas, error: mErr } = await supabase
        .from('metricas_piezas')
        .select('pieza_id, reach, likes, comments, fetched_at')
        .in('pieza_id', piezaIds)
        .order('fetched_at', { ascending: false })
      if (mErr) throw mErr

      // Última lectura de métricas por pieza.
      const latestByPieza = new Map<string, any>()
      for (const m of metricas || []) {
        if (!latestByPieza.has(m.pieza_id)) latestByPieza.set(m.pieza_id, m)
      }

      const enriched = piezas
        .map(p => ({ ...p, metrics: latestByPieza.get(p.id) }))
        .filter(p => p.metrics && typeof p.metrics.reach === 'number')

      if (enriched.length < MIN_SAMPLES) {
        results.push({ client_id: account.client_id, ok: true, skipped: 'no hay suficientes piezas con métricas todavía' })
        continue
      }

      const avgReach = avg(enriched.map(p => p.metrics.reach))

      // ── Mejor día / horario ──────────────────────────────────────
      const byDay: Record<string, number[]> = {}
      const byBucket: Record<string, number[]> = {}
      for (const p of enriched) {
        const d = dayName(p.published_at); (byDay[d] ||= []).push(p.metrics.reach)
        const b = timeBucket(p.published_at); (byBucket[b] ||= []).push(p.metrics.reach)
      }
      const dayScores = Object.entries(byDay).filter(([, v]) => v.length >= 2).map(([d, v]) => [d, avg(v)] as const)
      const bestDays = dayScores.sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d)
      const bucketScores = Object.entries(byBucket).map(([b, v]) => [b, avg(v)] as const)
      const bestTime = bucketScores.sort((a, b) => b[1] - a[1])[0]?.[0] || ''

      // ── Qué tipo rinde mejor / peor ──────────────────────────────
      const byTipo: Record<string, number[]> = {}
      for (const p of enriched) (byTipo[p.tipo] ||= []).push(p.metrics.reach)
      const autoWorks: string[] = []
      const autoFails: string[] = []
      for (const [tipo, vals] of Object.entries(byTipo)) {
        if (vals.length < 2) continue
        const rel = avg(vals) / avgReach
        if (rel >= 1.15) autoWorks.push(`[Auto] ${tipo} — ${Math.round((rel - 1) * 100)}% más reach que el promedio de la cuenta`)
        else if (rel <= 0.85) autoFails.push(`[Auto] ${tipo} — ${Math.round((1 - rel) * 100)}% menos reach que el promedio de la cuenta`)
      }

      // ── Alerta de caída ────────────────────────────────────────────
      const now = Date.now()
      const last30 = enriched.filter(p => new Date(p.published_at).getTime() >= now - 30 * 24 * 3600 * 1000)
      const prev30 = enriched.filter(p => {
        const t = new Date(p.published_at).getTime()
        return t < now - 30 * 24 * 3600 * 1000 && t >= now - 60 * 24 * 3600 * 1000
      })
      if (last30.length >= 3 && prev30.length >= 3) {
        const dropPct = 1 - avg(last30.map(p => p.metrics.reach)) / avg(prev30.map(p => p.metrics.reach))
        if (dropPct >= 0.2) autoFails.unshift(`[Auto] ⚠️ Reach cayó ${Math.round(dropPct * 100)}% este último mes vs el anterior`)
      }

      // ── Guardar en client_meta, sin pisar lo cargado a mano ───────
      const { data: existingMeta } = await supabase
        .from('client_meta').select('content_works, content_fails').eq('client_id', account.client_id).maybeSingle()
      const manualWorks = (existingMeta?.content_works || []).filter((s: string) => !s.startsWith('[Auto]'))
      const manualFails = (existingMeta?.content_fails || []).filter((s: string) => !s.startsWith('[Auto]'))

      await supabase.from('client_meta').upsert({
        client_id: account.client_id,
        content_works: [...manualWorks, ...autoWorks],
        content_fails: [...autoFails, ...manualFails],
        best_days: bestDays,
        best_time: bestTime,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' })

      // ── Virales automáticos ────────────────────────────────────────
      let autoVirals = 0
      for (const p of enriched) {
        if (p.metrics.reach < avgReach * 1.8) continue
        const { error: insErr } = await supabase.from('client_virals').insert({
          client_id: account.client_id,
          pieza_id: p.id,
          title: (p.caption || 'Pieza publicada').slice(0, 80),
          platform: 'instagram',
          date: p.published_at?.slice(0, 7) || null,
          views: p.metrics.reach,
          likes: p.metrics.likes || 0,
          comments: p.metrics.comments || 0,
          type: p.tipo,
          url: p.permalink || null,
        })
        // 23505 = unique_violation → ya estaba cargado, seguimos sin frenar.
        if (!insErr) autoVirals++
        else if (insErr.code !== '23505') throw insErr
      }

      results.push({ client_id: account.client_id, ok: true, sampleSize: enriched.length, bestDays, bestTime, autoWorks, autoFails, autoVirals })
    } catch (err) {
      results.push({ client_id: account.client_id, ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
