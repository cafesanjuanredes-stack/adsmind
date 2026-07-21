import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CLIENT_COLORS } from '../tokens'
import { updateBrand as updateBrandKit } from '../lib/brand'

// ── Todo persistido en Supabase ─────────────────────────────────────
// clients            → identidad del cliente
// client_platforms   → una fila por red social que tenga (link + métricas)
// client_history     → histórico de seguidores (Instagram como referencia)
// client_virals      → posts virales cargados a mano
// client_competitors → benchmark
// client_meta        → qué funciona/no funciona, sentimiento, ads (1 fila por cliente)

function platformRowToObj(row) {
  return {
    rowId: row.id,
    handle: row.handle || '',
    profile_url: row.profile_url || '',
    followers: row.followers || 0,
    posts: row.posts || 0,
    reach_pct: row.reach_pct || 0,
    engagement_pct: row.engagement_pct || 0,
    views_avg: row.views_avg || 0,
    views_viral: row.views_viral || 0,
    freq_week: row.freq_week || 0,
    video_dur: row.video_dur || 0,
    completion_pct: row.completion_pct || 0,
    saves_avg: row.saves_avg || 0,
    shares_avg: row.shares_avg || 0,
    status: row.status || 'warn',
    notes: row.notes || '',
    last_synced_at: row.last_synced_at || null,
  }
}

function groupBy(rows, key) {
  const map = {}
  for (const r of rows || []) (map[r[key]] ||= []).push(r)
  return map
}

export function useClients() {
  const [clients,   setClients]   = useState([])
  const [loading,    setLoading]  = useState(true)
  const [loadError,  setLoadError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const { data: clientRows, error: cErr } = await supabase.from('clients').select('*').order('created_at', { ascending: true })
      if (cErr) throw cErr
      const ids = clientRows.map(c => c.id)

      const [platforms, history, virals, comps, metas] = await Promise.all([
        supabase.from('client_platforms').select('*').in('client_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('client_history').select('*').in('client_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']).order('date'),
        supabase.from('client_virals').select('*').in('client_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('client_competitors').select('*').in('client_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('client_meta').select('*').in('client_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
      ])
      for (const r of [platforms, history, virals, comps, metas]) if (r.error) throw r.error

      const platformsByClient = groupBy(platforms.data, 'client_id')
      const historyByClient   = groupBy(history.data, 'client_id')
      const viralsByClient    = groupBy(virals.data, 'client_id')
      const compsByClient     = groupBy(comps.data, 'client_id')
      const metaByClient      = Object.fromEntries((metas.data || []).map(m => [m.client_id, m]))

      const assembled = clientRows.map(row => {
        const meta = metaByClient[row.id]
        return {
          id: row.id,
          name: row.name,
          industry: row.industry || 'General',
          avatar: row.avatar || row.name.slice(0, 3).toUpperCase(),
          color: row.color || CLIENT_COLORS[0],
          platforms: Object.fromEntries((platformsByClient[row.id] || []).map(p => [p.platform, platformRowToObj(p)])),
          history: (historyByClient[row.id] || []).map(h => ({ date: h.date, followers_ig: h.followers, milestone: h.milestone || '' })),
          virals: (viralsByClient[row.id] || []).map(v => ({ id: v.id, title: v.title, platform: v.platform, date: v.date, views: v.views, likes: v.likes, comments: v.comments, type: v.type })),
          competitors: (compsByClient[row.id] || []).map(c => ({ id: c.id, name: c.name, handle: c.handle, followers_ig: c.followers_ig, type: c.type, notes: c.notes })),
          content: { works: meta?.content_works || [], fails: meta?.content_fails || [], best_days: meta?.best_days || [], best_time: meta?.best_time || '' },
          ads: meta?.ads || null,
          sentiment: { positive: meta?.sentiment_positive || 0, neutral: meta?.sentiment_neutral || 0, negative: meta?.sentiment_negative || 0 },
          brand: {
            fontSource: meta?.brand_font_source || 'google',
            fontFamily: meta?.brand_font_family || 'Inter',
            fontPath: meta?.brand_font_path || null,
            textColor: meta?.brand_text_color || '#FFFFFF',
            bgColor: meta?.brand_bg_color || '#000000',
          },
        }
      })
      setClients(assembled)
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // ── Clientes ───────────────────────────────────────────────────
  const addClient = useCallback(async (name, industry, avatar) => {
    const color = CLIENT_COLORS[clients.length % CLIENT_COLORS.length]
    const { data, error } = await supabase.from('clients')
      .insert({ name, industry: industry || 'General', avatar: (avatar || name.slice(0, 3)).toUpperCase(), color })
      .select().single()
    if (error) { setLoadError(error.message); return null }
    await reload()
    return data.id
  }, [clients.length, reload])

  const removeClient = useCallback(async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) { setLoadError(error.message); return }
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])

  // ── Plataformas / redes ──────────────────────────────────────────
  const addPlatform = useCallback(async (clientId, platformKey, fields = {}) => {
    const { data, error } = await supabase.from('client_platforms')
      .insert({ client_id: clientId, platform: platformKey, ...fields })
      .select().single()
    if (error) throw error
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, platforms: { ...c.platforms, [platformKey]: platformRowToObj(data) } }
      : c))
  }, [])

  const updatePlatform = useCallback(async (clientId, platformKey, patch) => {
    const rowId = clients.find(c => c.id === clientId)?.platforms?.[platformKey]?.rowId
    if (!rowId) return
    const { data, error } = await supabase.from('client_platforms').update(patch).eq('id', rowId).select().single()
    if (error) throw error
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, platforms: { ...c.platforms, [platformKey]: platformRowToObj(data) } }
      : c))
  }, [clients])

  const removePlatform = useCallback(async (clientId, platformKey) => {
    const rowId = clients.find(c => c.id === clientId)?.platforms?.[platformKey]?.rowId
    if (!rowId) return
    const { error } = await supabase.from('client_platforms').delete().eq('id', rowId)
    if (error) throw error
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      const next = { ...c.platforms }
      delete next[platformKey]
      return { ...c, platforms: next }
    }))
  }, [clients])

  // ── Histórico ──────────────────────────────────────────────────
  const addHistoryPoint = useCallback(async (id, point) => {
    setClients(prev => prev.map(c => c.id === id
      ? { ...c, history: [...c.history, point].sort((a, b) => a.date.localeCompare(b.date)) }
      : c))
    const { error } = await supabase.from('client_history')
      .insert({ client_id: id, date: point.date, followers: point.followers_ig, milestone: point.milestone || null })
    if (error) throw error
  }, [])

  // ── Virales ────────────────────────────────────────────────────
  const addViral = useCallback(async (id, viral) => {
    const { data, error } = await supabase.from('client_virals').insert({
      client_id: id, title: viral.title, platform: viral.platform, date: viral.date || null,
      views: viral.views, likes: viral.likes || 0, comments: viral.comments || 0, type: viral.type,
    }).select().single()
    if (error) throw error
    setClients(prev => prev.map(c => c.id === id ? { ...c, virals: [...c.virals, { ...viral, id: data.id }] } : c))
  }, [])

  const removeViral = useCallback(async (id, idx) => {
    const viral = clients.find(c => c.id === id)?.virals?.[idx]
    setClients(prev => prev.map(c => c.id === id ? { ...c, virals: c.virals.filter((_, i) => i !== idx) } : c))
    if (viral?.id) {
      const { error } = await supabase.from('client_virals').delete().eq('id', viral.id)
      if (error) throw error
    }
  }, [clients])

  // ── Competidores ───────────────────────────────────────────────
  const addCompetitor = useCallback(async (id, comp) => {
    const { data, error } = await supabase.from('client_competitors').insert({
      client_id: id, name: comp.name, handle: comp.handle || null,
      followers_ig: comp.followers_ig || 0, type: comp.type, notes: comp.notes || null,
    }).select().single()
    if (error) throw error
    setClients(prev => prev.map(c => c.id === id ? { ...c, competitors: [...c.competitors, { ...comp, id: data.id }] } : c))
  }, [])

  const removeCompetitor = useCallback(async (id, idx) => {
    const comp = clients.find(c => c.id === id)?.competitors?.[idx]
    setClients(prev => prev.map(c => c.id === id ? { ...c, competitors: c.competitors.filter((_, i) => i !== idx) } : c))
    if (comp?.id) {
      const { error } = await supabase.from('client_competitors').delete().eq('id', comp.id)
      if (error) throw error
    }
  }, [clients])

  // ── Marca (tipografía/colores del overlay) ────────────────────────
  const updateBrand = useCallback(async (clientId, patch) => {
    await updateBrandKit(clientId, patch)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, brand: { ...c.brand, ...toBrandShape(patch) } } : c))
  }, [])

  return {
    clients, loading, loadError, reload,
    addClient, removeClient,
    addPlatform, updatePlatform, removePlatform,
    addHistoryPoint, addViral, removeViral,
    addCompetitor, removeCompetitor,
    updateBrand,
  }
}

function toBrandShape(patch) {
  const out = {}
  if ('brand_font_source' in patch) out.fontSource = patch.brand_font_source
  if ('brand_font_family' in patch) out.fontFamily = patch.brand_font_family
  if ('brand_font_path'   in patch) out.fontPath   = patch.brand_font_path
  if ('brand_text_color'  in patch) out.textColor  = patch.brand_text_color
  if ('brand_bg_color'    in patch) out.bgColor    = patch.brand_bg_color
  return out
}
