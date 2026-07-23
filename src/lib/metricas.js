import { supabase } from './supabaseClient'

export async function getLatestMetrica(piezaId) {
  const { data, error } = await supabase
    .from('metricas_piezas')
    .select('*')
    .eq('pieza_id', piezaId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createMetrica({ piezaId, reach, likes, comments, saves, shares, plays }) {
  const { data, error } = await supabase.from('metricas_piezas').insert({
    pieza_id: piezaId,
    reach: reach || 0,
    likes: likes || 0,
    comments: comments || 0,
    saves: saves || 0,
    shares: shares || 0,
    plays: plays || 0,
  }).select().single()
  if (error) throw error
  return data
}

// Backfillea posts/reels/carruseles que ya están públicos en Instagram
// (publicados a mano, no generados en AdMind) con su primer snapshot de
// métricas reales. Requiere la Edge Function "import-existing-posts"
// deployada y una cuenta de Meta activa para el cliente.
export async function importExistingPosts(clientId) {
  const { data, error } = await supabase.functions.invoke('import-existing-posts', {
    body: { client_id: clientId },
  })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error || 'No se pudo importar')
  return data.results
}
