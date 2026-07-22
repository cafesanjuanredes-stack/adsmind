// Supabase Edge Function: sync-pieza-metrics
//
// Corre por cron (recomendado: cada 6-12 horas). Busca piezas publicadas
// desde la app (estado='publicada', con meta_media_id) entre 24hs y 14 días
// atrás, y les pide sus métricas reales a la Instagram Graph API: reach,
// likes, comments, saves, shares y plays (según el tipo de pieza). Guarda
// cada lectura en metricas_piezas con su fecha, para poder ver cómo
// evolucionó cada publicación en el tiempo.
//
// No vuelve a pedir métricas de una pieza si ya la consultó en las
// últimas 20hs, para no gastar de más contra la API.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const GRAPH = 'https://graph.facebook.com/v21.0'

async function graphGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params)
  const res = await fetch(`${GRAPH}${path}?${qs}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Graph API error ${res.status}`)
  return json
}

// Los nombres de métrica disponibles cambian según el tipo de media y la
// versión de la Graph API — si Meta empieza a rechazar alguna, sacarla de
// acá sin romper el resto (el fetch de insights está en un try/catch).
const METRIC_SETS: Record<string, string[]> = {
  historia:  ['reach'],
  post:      ['reach', 'saved', 'shares'],
  carrusel:  ['reach', 'saved', 'shares'],
  reel:      ['reach', 'saved', 'shares', 'plays'],
}

async function fetchMetrics(mediaId: string, tipo: string, accessToken: string) {
  const out: Record<string, number | null> = {
    reach: null, likes: null, comments: null, saves: null, shares: null, plays: null,
  }
  let permalink: string | null = null

  try {
    const base = await graphGet(`/${mediaId}`, {
      fields: 'like_count,comments_count,permalink',
      access_token: accessToken,
    })
    out.likes = base.like_count ?? null
    out.comments = base.comments_count ?? null
    permalink = base.permalink ?? null
  } catch (_) { /* seguimos con lo que sí tengamos */ }

  const metrics = METRIC_SETS[tipo] || METRIC_SETS.post
  try {
    const insights = await graphGet(`/${mediaId}/insights`, {
      metric: metrics.join(','),
      access_token: accessToken,
    })
    for (const item of insights.data || []) {
      const val = item.values?.[0]?.value ?? item.total_value?.value ?? null
      if (item.name === 'reach')  out.reach  = val
      if (item.name === 'saved')  out.saves  = val
      if (item.name === 'shares') out.shares = val
      if (item.name === 'plays')  out.plays  = val
    }
  } catch (_) { /* alguna métrica no aplica a este tipo/versión — no frena el resto */ }

  return { ...out, permalink }
}

Deno.serve(async () => {
  const now = new Date()
  const dayAgo   = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
  const twoWeeks = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString()

  const { data: piezas, error } = await supabase
    .from('piezas')
    .select('*')
    .eq('estado', 'publicada')
    .not('meta_media_id', 'is', null)
    .lte('published_at', dayAgo)
    .gte('published_at', twoWeeks)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results: unknown[] = []

  for (const pieza of piezas || []) {
    try {
      const { data: lastFetch } = await supabase
        .from('metricas_piezas')
        .select('fetched_at')
        .eq('pieza_id', pieza.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastFetch && new Date(lastFetch.fetched_at) > new Date(now.getTime() - 20 * 3600 * 1000)) {
        results.push({ pieza_id: pieza.id, ok: true, skipped: 'ya consultada hace menos de 20hs' })
        continue
      }

      const { data: account, error: accErr } = await supabase
        .from('meta_accounts')
        .select('access_token, status')
        .eq('client_id', pieza.client_id)
        .single()
      if (accErr || !account || account.status !== 'active') throw new Error('Sin cuenta de Meta activa')

      const m = await fetchMetrics(pieza.meta_media_id, pieza.tipo, account.access_token)

      await supabase.from('metricas_piezas').insert({
        pieza_id: pieza.id,
        reach: m.reach, likes: m.likes, comments: m.comments,
        saves: m.saves, shares: m.shares, plays: m.plays,
      })

      if (m.permalink && !pieza.permalink) {
        await supabase.from('piezas').update({ permalink: m.permalink }).eq('id', pieza.id)
      }

      results.push({ pieza_id: pieza.id, ok: true, ...m })
    } catch (err) {
      results.push({ pieza_id: pieza.id, ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
