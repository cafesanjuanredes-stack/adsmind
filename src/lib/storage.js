import { supabase } from './supabaseClient'

const BUCKET = 'content'

// Bucket privado: no hay URLs públicas permanentes. Toda lectura pasa por
// una signed URL de corta duración (default 10 min), generada bajo demanda
// para: (a) previsualizar en la app, (b) que el Edge Function de Meta la
// use en el momento exacto de publicar.
export async function getSignedUrl(path, expiresInSeconds = 600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export async function uploadOriginal(clientId, file, kind /* 'foto' | 'diseno' */) {
  const ext = file.name.split('.').pop()
  const path = `${clientId}/originals/${kind}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error

  const { data, error: dbError } = await supabase
    .from('media_assets')
    .insert({ client_id: clientId, kind, storage_path: path })
    .select()
    .single()
  if (dbError) throw dbError
  return data
}

export async function uploadPieza(clientId, blob, filename) {
  const path = `${clientId}/piezas/${filename}`
  // Los renders del canvas son siempre PNG (blob sin .type propio), pero los
  // reels vienen de un <input type="file"> y son un video real — usar el
  // .type del propio blob/File si lo trae, si no default a PNG.
  const contentType = blob?.type || 'image/png'
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
  })
  if (error) throw error
  return path
}
