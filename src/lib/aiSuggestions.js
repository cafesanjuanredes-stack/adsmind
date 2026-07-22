import { supabase } from './supabaseClient'

export async function listSuggestions(clientId) {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('client_id', clientId)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// "Usar": la sugerencia pasa a ser un asset real del banco (mismo archivo,
// no se vuelve a subir) para poder editarla con overlay como cualquier foto.
export async function useSuggestion(suggestion) {
  const { data, error } = await supabase.from('media_assets')
    .insert({ client_id: suggestion.client_id, kind: 'foto', storage_path: suggestion.storage_path })
    .select().single()
  if (error) throw error

  const { error: updErr } = await supabase.from('ai_suggestions')
    .update({ estado: 'usada' }).eq('id', suggestion.id)
  if (updErr) throw updErr

  return data
}

export async function discardSuggestion(suggestion) {
  const { error: storageError } = await supabase.storage.from('content').remove([suggestion.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('ai_suggestions').update({ estado: 'descartada' }).eq('id', suggestion.id)
  if (error) throw error
}

// Genera una sugerencia de IA al toque (en vez de esperar el cron de cada
// 3 días). Requiere que la Edge Function "generate-design-now" esté
// deployada y el secret OPENAI_API_KEY configurado.
export async function generateDesignNow(clientId, prompt) {
  const { data, error } = await supabase.functions.invoke('generate-design-now', {
    body: { client_id: clientId, prompt: prompt || undefined },
  })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error || 'No se pudo generar el diseño')
  return data.suggestion
}
