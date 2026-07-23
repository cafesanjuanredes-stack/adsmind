import { supabase } from './supabaseClient'

// month: string 'YYYY-MM'
export async function getContentGoal(clientId, month) {
  const { data, error } = await supabase
    .from('content_goals')
    .select('*')
    .eq('client_id', clientId)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveContentGoal(clientId, month, items, notes) {
  const { data, error } = await supabase
    .from('content_goals')
    .upsert({
      client_id: clientId,
      month,
      items,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id,month' })
    .select()
    .single()
  if (error) throw error
  return data
}
