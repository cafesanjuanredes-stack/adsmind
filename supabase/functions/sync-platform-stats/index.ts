// Supabase Edge Function: sync-platform-stats
//
// Corre por cron (recomendado: 1 vez por día, ej. 7am, antes de que
// Candelaria abra la app). Para cada cliente con una cuenta de Meta activa
// en meta_accounts, lee seguidores y cantidad de posts reales desde la
// Instagram Graph API y actualiza:
//   - client_platforms (fila 'instagram'): followers, posts, last_synced_at
//   - client_history: agrega o actualiza el punto del mes actual, para que
//     el histórico de crecimiento se arme solo, sin carga manual.
//
// No hace falta que Candelaria entre a Instagram a mirar seguidores "de hoy"
// — esto lo deja cargado antes de que abra la app.

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

function currentMonth() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

Deno.serve(async () => {
  const { data: accounts, error } = await supabase
    .from('meta_accounts')
    .select('*')
    .eq('status', 'active')

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results: unknown[] = []

  for (const account of accounts || []) {
    try {
      // Token vencido: no seguimos intentando, marcamos el estado para que
      // se note en la UI (checklist de cuentas Meta) que hay que renovarlo.
      if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
        await supabase.from('meta_accounts').update({ status: 'expired' }).eq('id', account.id)
        results.push({ client_id: account.client_id, ok: false, error: 'Token vencido — hay que renovarlo a mano' })
        continue
      }

      const igData = await graphGet(`/${account.ig_user_id}`, {
        fields: 'followers_count,media_count',
        access_token: account.access_token,
      })

      const followers = igData.followers_count ?? 0
      const posts = igData.media_count ?? 0

      // ── client_platforms ──────────────────────────────────────────
      const { data: existingPlatform } = await supabase
        .from('client_platforms')
        .select('id')
        .eq('client_id', account.client_id)
        .eq('platform', 'instagram')
        .maybeSingle()

      if (existingPlatform) {
        await supabase.from('client_platforms')
          .update({ followers, posts, last_synced_at: new Date().toISOString() })
          .eq('id', existingPlatform.id)
      } else {
        await supabase.from('client_platforms').insert({
          client_id: account.client_id, platform: 'instagram', followers, posts,
          last_synced_at: new Date().toISOString(),
        })
      }

      // ── client_history (checkpoint del mes actual) ──────────────────
      const month = currentMonth()
      const { data: existingHistory } = await supabase
        .from('client_history')
        .select('id')
        .eq('client_id', account.client_id)
        .eq('date', month)
        .maybeSingle()

      if (existingHistory) {
        await supabase.from('client_history').update({ followers }).eq('id', existingHistory.id)
      } else {
        await supabase.from('client_history').insert({ client_id: account.client_id, date: month, followers })
      }

      results.push({ client_id: account.client_id, ok: true, followers, posts })
    } catch (err) {
      results.push({ client_id: account.client_id, ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
