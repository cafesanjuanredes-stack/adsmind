import { supabase } from './supabaseClient'

const DEFAULTS = {
  historias_x_semana: 0,
  posts_x_semana: 0,
  reels_x_semana: 0,
  carruseles_x_semana: 0,
  ads_instagram: false,
  ads_instagram_budget: 0,
  ads_google: false,
  ads_google_budget: 0,
  landing_url: '',
  landing_visits: 0,
  landing_conversions: 0,
  landing_notes: '',
  notes: '',
}

export async function getStrategy(clientId) {
  const { data, error } = await supabase
    .from('client_strategy')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw error
  return { ...DEFAULTS, ...(data || {}), client_id: clientId }
}

export async function saveStrategy(clientId, patch) {
  const { data, error } = await supabase
    .from('client_strategy')
    .upsert({ client_id: clientId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
