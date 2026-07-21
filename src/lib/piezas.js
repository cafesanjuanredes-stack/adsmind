import { supabase } from './supabaseClient'

// ── media_assets (banco de fotos/diseños crudos) ───────────────────
export async function listAssets(clientId) {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteAsset(asset) {
  const { error: storageError } = await supabase.storage.from('content').remove([asset.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('media_assets').delete().eq('id', asset.id)
  if (error) throw error
}

// ── piezas (historias/posts ya generados con overlay) ──────────────
export async function listPiezas(clientId) {
  const { data, error } = await supabase
    .from('piezas')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createPieza(pieza) {
  const { data, error } = await supabase.from('piezas').insert(pieza).select().single()
  if (error) throw error
  return data
}

export async function updatePiezaEstado(id, estado, extra = {}) {
  const { data, error } = await supabase
    .from('piezas')
    .update({ estado, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePieza(pieza) {
  const { error: storageError } = await supabase.storage.from('content').remove([pieza.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('piezas').delete().eq('id', pieza.id)
  if (error) throw error
}
