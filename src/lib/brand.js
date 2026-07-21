import { supabase } from './supabaseClient'
import { getSignedUrl } from './storage'

export async function uploadBrandFont(clientId, file) {
  const ext = file.name.split('.').pop()
  const path = `${clientId}/brand/font.${ext}`
  const { error } = await supabase.storage.from('content').upload(path, file, {
    upsert: true,
    contentType: file.type || 'font/woff2',
  })
  if (error) throw error
  return path
}

export async function updateBrand(clientId, patch) {
  const { error } = await supabase
    .from('client_meta')
    .upsert({ client_id: clientId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
  if (error) throw error
}

// Deja la fuente lista para usar en canvas (ctx.font) y devuelve el nombre
// de familia CSS a usar. Para fuentes de Google ya están precargadas en
// index.html — solo hay que esperar a que carguen. Para fuentes propias,
// se registran acá mismo con la FontFace API.
export async function resolveBrandFont(client) {
  const brand = client.brand
  if (!brand) return 'Inter'

  if (brand.fontSource === 'custom' && brand.fontPath) {
    const familyName = `brand-${client.id}`
    const already = [...document.fonts].some(f => f.family === familyName)
    if (!already) {
      const url = await getSignedUrl(brand.fontPath, 3600)
      const face = new FontFace(familyName, `url(${url})`)
      await face.load()
      document.fonts.add(face)
    }
    return familyName
  }

  try {
    await document.fonts.load(`700 40px "${brand.fontFamily}"`)
  } catch {
    // si falla la carga, el canvas cae al font por default del browser
  }
  return brand.fontFamily || 'Inter'
}
