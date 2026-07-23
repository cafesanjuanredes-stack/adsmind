// Supabase Edge Function: sync-youtube-stats
//
// A diferencia de todo lo de Meta (que necesita OAuth + verificación de
// negocio), YouTube expone views/likes/comments de CUALQUIER video público
// con solo una API key gratuita de Google Cloud — sin dueño de canal, sin
// login. Recorre videos_externos, detecta los links de YouTube, y les
// actualiza las estadísticas reales.
//
// Requiere el secret YOUTUBE_API_KEY seteado en el proyecto de Supabase
// (Project Settings → Edge Functions → Secrets), o vía:
//   supabase secrets set YOUTUBE_API_KEY=tu_api_key
//
// Se invoca manualmente desde el botón "Sincronizar YouTube" pasando
// { client_id }, o sin body para correr sobre todos los videos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const YT_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const YT_API = 'https://www.googleapis.com/youtube/v3/videos'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Soporta youtube.com/watch?v=, youtu.be/, youtube.com/shorts/ y /embed/
function extractVideoId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  if (!YT_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Falta el secret YOUTUBE_API_KEY en el proyecto de Supabase' }), { status: 500, headers: corsHeaders })
  }

  let clientId: string | null = null
  try {
    const body = await req.json()
    clientId = body?.client_id || null
  } catch (_) { /* sin body — corre para todos los clientes */ }

  let query = supabase.from('videos_externos').select('*')
  if (clientId) query = query.eq('client_id', clientId)
  const { data: videos, error } = await query
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })

  const withId = (videos || [])
    .map(v => ({ v, videoId: extractVideoId(v.video_url) }))
    .filter(x => x.videoId)

  if (!withId.length) {
    return new Response(JSON.stringify({ ok: true, updated: 0, message: 'No hay videos con link de YouTube reconocible' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let updated = 0
  const results: unknown[] = []

  // La API de YouTube permite pedir hasta 50 ids por request.
  for (let i = 0; i < withId.length; i += 50) {
    const chunk = withId.slice(i, i + 50)
    const ids = chunk.map(x => x.videoId).join(',')
    try {
      const res = await fetch(`${YT_API}?part=statistics,snippet&id=${ids}&key=${YT_API_KEY}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || `YouTube API error ${res.status}`)

      const byId: Record<string, any> = {}
      for (const item of json.items || []) byId[item.id] = item

      for (const { v, videoId } of chunk) {
        const item = byId[videoId!]
        if (!item) { results.push({ id: v.id, ok: false, error: 'Video no encontrado (privado o eliminado)' }); continue }
        const stats = item.statistics || {}
        const { error: updErr } = await supabase.from('videos_externos').update({
          views: stats.viewCount ? Number(stats.viewCount) : null,
          likes: stats.likeCount ? Number(stats.likeCount) : null,
          comments: stats.commentCount ? Number(stats.commentCount) : null,
          thumbnail_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
          last_synced_at: new Date().toISOString(),
        }).eq('id', v.id)
        if (updErr) { results.push({ id: v.id, ok: false, error: updErr.message }); continue }
        updated++
        results.push({ id: v.id, ok: true, views: stats.viewCount, likes: stats.likeCount })
      }
    } catch (err) {
      results.push({ ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, updated, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
