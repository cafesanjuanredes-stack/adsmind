import { supabase } from './supabaseClient'

export async function listVideos(clientId) {
  const { data, error } = await supabase
    .from('videos_externos')
    .select('*')
    .eq('client_id', clientId)
    .order('scheduled_for', { ascending: true })
  if (error) throw error
  return data
}

export async function createVideo({ clientId, titulo, videoUrl, scheduledFor, notas }) {
  const { data, error } = await supabase.from('videos_externos').insert({
    client_id: clientId,
    titulo,
    video_url: videoUrl,
    scheduled_for: scheduledFor || null,
    notas: notas || null,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateVideo(id, patch) {
  const { data, error } = await supabase.from('videos_externos').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteVideo(id) {
  const { error } = await supabase.from('videos_externos').delete().eq('id', id)
  if (error) throw error
}

// Trae views/likes/comments reales de YouTube para los videos externos del
// cliente que tengan un link de YouTube reconocible. Requiere la Edge
// Function "sync-youtube-stats" deployada y el secret YOUTUBE_API_KEY.
export async function syncYoutubeStats(clientId) {
  const { data, error } = await supabase.functions.invoke('sync-youtube-stats', {
    body: { client_id: clientId },
  })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error || 'No se pudo sincronizar')
  return data
}
