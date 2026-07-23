import { supabase } from './supabaseClient'

export async function listAds(clientId) {
  const { data, error } = await supabase
    .from('client_ads')
    .select('*')
    .eq('client_id', clientId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createAd({ clientId, platform, name, objective, startDate, endDate, spend, reach, clicks, conversions, notes }) {
  const { data, error } = await supabase.from('client_ads').insert({
    client_id: clientId,
    platform,
    name,
    objective: objective || null,
    start_date: startDate || null,
    end_date: endDate || null,
    spend: spend || 0,
    reach: reach || 0,
    clicks: clicks || 0,
    conversions: conversions || 0,
    notes: notes || null,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateAd(id, patch) {
  const { data, error } = await supabase
    .from('client_ads')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAd(id) {
  const { error } = await supabase.from('client_ads').delete().eq('id', id)
  if (error) throw error
}
