import { supabase } from './supabaseClient'

export async function listContentTasks(clientId) {
  const { data, error } = await supabase
    .from('content_tasks')
    .select('*')
    .eq('client_id', clientId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createContentTask({ clientId, platform, kind, title, description, dueDate }) {
  const { data, error } = await supabase.from('content_tasks').insert({
    client_id: clientId,
    platform: platform || null,
    kind: kind || 'filmacion',
    title,
    description: description || null,
    due_date: dueDate,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateContentTask(id, patch) {
  const { data, error } = await supabase
    .from('content_tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleContentTaskDone(id, done) {
  return updateContentTask(id, { done })
}

export async function deleteContentTask(id) {
  const { error } = await supabase.from('content_tasks').delete().eq('id', id)
  if (error) throw error
}
