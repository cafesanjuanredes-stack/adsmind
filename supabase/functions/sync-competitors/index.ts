// Supabase Edge Function: sync-competitors
//
// Corre por cron (recomendado: 1 vez por semana). Para cada competidor
// cargado en client_competitors que tenga un handle de Instagram, usa la
// Business Discovery API de Meta para leer sus seguidores públicos SIN que
// el competidor tenga que autorizar nada — alcanza con que su cuenta sea
// business/creator pública, y con el token del cliente propio (ya
// conectado en meta_accounts) para hacer la consulta.
//
// Si el competidor no es una cuenta business/creator (por ejemplo, es una
// cuenta personal), la Graph API no va a poder devolver sus datos — en ese
// caso queda como estaba y hay que seguir cargándolo a mano.

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

function cleanHandle(handle: string) {
  return handle.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '')
}

Deno.serve(async () => {
  const { data: competitors, error } = await supabase
    .from('client_competitors')
    .select('*')
    .not('handle', 'is', null)
    .neq('handle', '')

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  // Cachear cuentas de Meta por cliente para no repetir la consulta.
  const accountCache = new Map<string, any>()
  const results: unknown[] = []

  for (const comp of competitors || []) {
    try {
      let account = accountCache.get(comp.client_id)
      if (account === undefined) {
        const { data } = await supabase
          .from('meta_accounts')
          .select('ig_user_id, access_token, status')
          .eq('client_id', comp.client_id)
          .maybeSingle()
        account = data || null
        accountCache.set(comp.client_id, account)
      }
      if (!account || account.status !== 'active') throw new Error('El cliente no tiene una cuenta de Meta activa para hacer la consulta')

      const username = cleanHandle(comp.handle)
      const data = await graphGet(`/${account.ig_user_id}`, {
        fields: `business_discovery.username(${username}){followers_count,media_count,name}`,
        access_token: account.access_token,
      })

      const bd = data.business_discovery
      if (!bd) throw new Error('No se encontró como cuenta business/creator pública')

      await supabase.from('client_competitors')
        .update({ followers_ig: bd.followers_count ?? comp.followers_ig })
        .eq('id', comp.id)

      results.push({ competitor_id: comp.id, ok: true, followers_ig: bd.followers_count })
    } catch (err) {
      results.push({ competitor_id: comp.id, ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
