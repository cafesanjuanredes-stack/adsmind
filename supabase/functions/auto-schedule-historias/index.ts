// Supabase Edge Function: auto-schedule-historias
//
// Corre por cron (recomendado: 1 vez por día, ej. 8am). Para cada cliente
// con auto_historias activado en Instagram (Café San Juan, Mr Green Coffee),
// si esta semana todavía no se alcanzó el objetivo de historias
// programadas/publicadas, elige la más vieja del banco y la programa sola.
// Candelaria no tiene que tocar nada semana a semana — solo mantener el
// banco con piezas cargadas desde el Generador.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo en
// cada Edge Function del mismo proyecto — no hace falta configurarlos a mano.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function startOfWeek(d = new Date()) {
  const day = d.getUTCDay() || 7 // lunes=1 ... domingo=7
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - day + 1)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

Deno.serve(async () => {
  const { data: autoPlatforms, error } = await supabase
    .from('client_platforms')
    .select('client_id, historias_per_week')
    .eq('platform', 'instagram')
    .eq('auto_historias', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const weekStart = startOfWeek().toISOString()
  const results: unknown[] = []

  for (const cp of autoPlatforms || []) {
    const { count } = await supabase
      .from('piezas')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', cp.client_id)
      .eq('tipo', 'historia')
      .in('estado', ['programada', 'publicada'])
      .gte('created_at', weekStart)

    const need = (cp.historias_per_week || 2) - (count || 0)
    if (need <= 0) {
      results.push({ client_id: cp.client_id, picked: 0, reason: 'objetivo semanal ya cubierto' })
      continue
    }

    const { data: candidates } = await supabase
      .from('piezas')
      .select('id')
      .eq('client_id', cp.client_id)
      .eq('tipo', 'historia')
      .eq('estado', 'banco')
      .order('created_at', { ascending: true })
      .limit(need)

    for (const pieza of candidates || []) {
      await supabase.from('piezas').update({
        estado: 'programada',
        scheduled_for: new Date().toISOString(),
        auto_picked: true,
        updated_at: new Date().toISOString(),
      }).eq('id', pieza.id)
    }

    results.push({
      client_id: cp.client_id,
      picked: candidates?.length || 0,
      reason: (candidates?.length || 0) < need ? 'banco insuficiente — se agotaron las piezas disponibles' : 'ok',
    })
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
