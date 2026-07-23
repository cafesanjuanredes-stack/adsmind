import { supabase } from './supabaseClient'

export async function listTrips(clientId) {
  const { data, error } = await supabase
    .from('client_trips')
    .select('*')
    .eq('client_id', clientId)
    .order('start_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createTrip({ clientId, title, startDate, endDate, notes }) {
  const { data, error } = await supabase.from('client_trips').insert({
    client_id: clientId,
    title,
    start_date: startDate,
    end_date: endDate,
    notes: notes || null,
    items: [],
  }).select().single()
  if (error) throw error
  return data
}

export async function updateTrip(id, patch) {
  const { data, error } = await supabase
    .from('client_trips')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTrip(id) {
  const { error } = await supabase.from('client_trips').delete().eq('id', id)
  if (error) throw error
}
