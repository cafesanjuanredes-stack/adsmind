// Supabase Edge Function: publish-to-meta
//
// Corre por cron (recomendado: cada 15–30 min). Busca piezas en estado
// 'programada' con scheduled_for ya vencido, genera una signed URL de la
// imagen (el bucket es privado — Meta necesita poder buscarla en el
// momento exacto de publicar, no que quede pública para siempre) y las
// publica en Instagram vía Meta Graph API (historia o post según `tipo`).
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

      const { data: signed, error: signErr } = await supabase.storage
        .from('content')
        .createSignedUrl(pieza.storage_path, 900)
      if (signErr) throw signErr

      const containerParams: Record<string, string> = {
        image_url: signed.signedUrl,
        access_token: account.access_token,
      }
      if (pieza.tipo === 'historia') containerParams.media_type = 'STORIES'
      if (pieza.tipo === 'post' && pieza.caption) containerParams.caption = pieza.caption

      const container = await graphPost(`/${account.ig_user_id}/media`, containerParams)
      const published = await graphPost(`/${account.ig_user_id}/media_publish`, {
        creation_id: container.id,
        access_token: account.access_token,
      })

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
