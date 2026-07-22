// Supabase Edge Function: publish-to-meta
//
// Corre por cron (recomendado: cada 15–30 min). Busca piezas en estado
// 'programada' con scheduled_for ya vencido, genera signed URLs de los
// archivos (el bucket es privado — Meta necesita poder buscarlos en el
// momento exacto de publicar, no que queden públicos para siempre) y las
// publica en Instagram vía Meta Graph API según el tipo:
//   - historia:  media_type=STORIES, foto
//   - post:      posteo de feed normal, foto + caption
//   - reel:      media_type=REELS, video + caption
//   - carrusel:  media_type=CAROUSEL_ALBUM, varios items (storage_path +
//                carousel_paths) + caption
//
// Requiere que la tabla meta_accounts tenga, por cliente, ig_user_id y
// access_token (token de larga duración) ya cargados — eso se hace una
// vez que el Developer App de Meta esté aprobado con los permisos
// instagram_content_publish + instagram_manage_insights.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Actualizar a la versión estable vigente de Graph API al momento de deployar.
const GRAPH = 'https://graph.facebook.com/v21.0'

async function graphPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Graph API error ${res.status}`)
  return json
}

async function signedUrlFor(path: string, expires = 900) {
  const { data, error } = await supabase.storage.from('content').createSignedUrl(path, expires)
  if (error) throw error
  return data.signedUrl
}

async function publishPieza(pieza: any, account: any) {
  const accessToken = account.access_token

  if (pieza.tipo === 'carrusel') {
    const allPaths = [pieza.storage_path, ...(pieza.carousel_paths || [])].filter(Boolean)
    if (allPaths.length < 2) throw new Error('Carrusel necesita al menos 2 fotos (falta carousel_paths)')

    const childIds: string[] = []
    for (const path of allPaths) {
      const url = await signedUrlFor(path)
      const child = await graphPost(`/${account.ig_user_id}/media`, {
        image_url: url,
        is_carousel_item: 'true',
        access_token: accessToken,
      })
      childIds.push(child.id)
    }

    const parentParams: Record<string, string> = {
      media_type: 'CAROUSEL_ALBUM',
      children: childIds.join(','),
      access_token: accessToken,
    }
    if (pieza.caption) parentParams.caption = buildCaption(pieza)
    const container = await graphPost(`/${account.ig_user_id}/media`, parentParams)
    return graphPost(`/${account.ig_user_id}/media_publish`, { creation_id: container.id, access_token: accessToken })
  }

  const url = await signedUrlFor(pieza.storage_path)
  const containerParams: Record<string, string> = { access_token: accessToken }

  if (pieza.tipo === 'historia') {
    containerParams.image_url = url
    containerParams.media_type = 'STORIES'
  } else if (pieza.tipo === 'reel') {
    containerParams.video_url = url
    containerParams.media_type = 'REELS'
    if (pieza.caption) containerParams.caption = buildCaption(pieza)
  } else {
    // post (feed, foto simple)
    containerParams.image_url = url
    if (pieza.caption) containerParams.caption = buildCaption(pieza)
  }

  const container = await graphPost(`/${account.ig_user_id}/media`, containerParams)
  return graphPost(`/${account.ig_user_id}/media_publish`, { creation_id: container.id, access_token: accessToken })
}

function buildCaption(pieza: any) {
  return [pieza.caption, pieza.tags].filter(Boolean).join('\n\n')
}

Deno.serve(async () => {
  const nowIso = new Date().toISOString()
  const { data: due, error } = await supabase
    .from('piezas')
    .select('*')
    .eq('estado', 'programada')
    .lte('scheduled_for', nowIso)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results: unknown[] = []

  for (const pieza of due || []) {
    try {
      const { data: account, error: accErr } = await supabase
        .from('meta_accounts')
        .select('*')
        .eq('client_id', pieza.client_id)
        .single()
      if (accErr || !account) throw new Error('Sin cuenta de Meta conectada para este cliente')
      if (account.status !== 'active') throw new Error(`Cuenta de Meta en estado "${account.status}"`)

      const published = await publishPieza(pieza, account)

      await supabase.from('piezas').update({
        estado: 'publicada',
        meta_media_id: published.id,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', pieza.id)

      results.push({ id: pieza.id, ok: true })
    } catch (err) {
      await supabase.from('piezas').update({
        estado: 'error',
        error_detail: String(err?.message || err),
        updated_at: new Date().toISOString(),
      }).eq('id', pieza.id)
      results.push({ id: pieza.id, ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
