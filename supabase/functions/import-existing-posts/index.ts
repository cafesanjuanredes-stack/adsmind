// Supabase Edge Function: import-existing-posts
//
// A diferencia de sync-pieza-metrics (que solo actualiza piezas publicadas
// DESDE la app), esta función trae del feed real de Instagram los posts que
// ya existen — publicados a mano, desde el celu, antes de usar AdMind — y
// los crea como piezas retroactivas (estado='publicada', imported=true) con
// su primer snapshot de métricas. Así Candelaria ve reach/likes/comments de
// todo lo que ya está público, no solo de lo que programe de acá en más.
//
// Se puede correr las veces que haga falta: no duplica (chequea
// meta_media_id antes de insertar), así que sirve tanto para el backfill
// inicial como para agarrar posts nuevos publicados por fuera de la app.
//
// Limitación real de la API de Meta: esto NO puede traer historias viejas.
// Instagram solo expone insights de una historia mientras está activa
// (24hs); pasado ese tiempo, la Graph API ya no la devuelve. Por eso acá
// solo se backfillean posts, carruseles y reels (contenido permanente).
//
// Se invoca manualmente desde la app (botón "Importar publicaciones de
// Instagram") pasando { client_id }, o sin body para correr sobre todas las
// cuentas activas.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const GRAPH = 'https://graph.facebook.com/v21.0'
const MAX_PAGES = 4       // ~50 posts x 4 páginas = hasta 200 posts por corrida
const PAGE_SIZE = 50

async function graphGet(url: string, params?: Record<string, string>) {
  const full = params ? `${url}?${new URLSearchParams(params)}` : url
  const res = await fetch(full)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Graph API error ${res.status}`)
  return json
}

const METRIC_SETS: Record<string, string[]> = {
  post:     ['reach', 'saved', 'shares'],
  carrusel: ['reach', 'saved', 'shares'],
  reel:     ['reach', 'saved', 'shares', 'plays'],
}

function mapTipo(item: any): 'post' | 'carrusel' | 'reel' {
  if (item.media_product_type === 'REELS') return 'reel'
  if (item.media_type === 'CAROUSEL_ALBUM') return 'carrusel'
  return 'post'
}

async function fetchInsights(mediaId: string, tipo: string, accessToken: string) {
  const out: Record<string, number | null> = { reach: null, saves: null, shares: null, plays: null }
  try {
    const insights = await graphGet(`${GRAPH}/${mediaId}/insights`, {
      metric: (METRIC_SETS[tipo] || METRIC_SETS.post).join(','),
      access_token: accessToken,
    })
    for (const it of insights.data || []) {
      const val = it.values?.[0]?.value ?? it.total_value?.value ?? null
      if (it.name === 'reach')  out.reach  = val
      if (it.name === 'saved')  out.saves  = val
      if (it.name === 'shares') out.shares = val
      if (it.name === 'plays')  out.plays  = val
    }
  } catch (_) { /* alguna métrica puede no aplicar — no frena el resto */ }
  return out
}

Deno.serve(async (req) => {
  let clientId: string | null = null
  try {
    const body = await req.json()
    clientId = body?.client_id || null
  } catch (_) { /* sin body — corre para todas las cuentas activas */ }

  let query = supabase.from('meta_accounts').select('*').eq('status', 'active')
  if (clientId) query = query.eq('client_id', clientId)
  const { data: accounts, error } = await query
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results: unknown[] = []

  for (const account of accounts || []) {
    let imported = 0
    let skipped = 0
    let failed = 0
    try {
      let url = `${GRAPH}/${account.ig_user_id}/media`
      let params: Record<string, string> | undefined = {
        fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,thumbnail_url,media_url',
        access_token: account.access_token,
        limit: String(PAGE_SIZE),
      }

      for (let page = 0; page < MAX_PAGES; page++) {
        const data = await graphGet(url, params)
        params = undefined // la próxima página ya viene con todos los params en el cursor

        for (const item of data.data || []) {
          try {
            const { data: existing } = await supabase
              .from('piezas')
              .select('id')
              .eq('meta_media_id', item.id)
              .maybeSingle()
            if (existing) { skipped++; continue }

            const tipo = mapTipo(item)
            const externalImg = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url

            const { data: pieza, error: insErr } = await supabase.from('piezas').insert({
              client_id: account.client_id,
              tipo,
              storage_path: null,
              external_image_url: externalImg || null,
              caption: item.caption || null,
              estado: 'publicada',
              meta_media_id: item.id,
              published_at: item.timestamp,
              permalink: item.permalink || null,
              imported: true,
            }).select().single()
            if (insErr) throw insErr

            const insights = await fetchInsights(item.id, tipo, account.access_token)
            await supabase.from('metricas_piezas').insert({
              pieza_id: pieza.id,
              reach: insights.reach,
              likes: item.like_count ?? null,
              comments: item.comments_count ?? null,
              saves: insights.saves,
              shares: insights.shares,
              plays: insights.plays,
            })

            imported++
          } catch (itemErr) {
            failed++
            results.push({ client_id: account.client_id, media_id: item.id, ok: false, error: String(itemErr?.message || itemErr) })
          }
        }

        if (!data.paging?.next) break
        url = data.paging.next
      }

      results.push({ client_id: account.client_id, ok: true, imported, skipped, failed })
    } catch (err) {
      results.push({ client_id: account.client_id, ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
