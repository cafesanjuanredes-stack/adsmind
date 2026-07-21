import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CLIENT_COLORS, PLATFORM_KEYS } from '../tokens'

// ── Clientes reales (tabla `clients` en Supabase) ──────────────────
// La identidad del cliente (nombre, industria, avatar, color) vive en
// Supabase — es la misma tabla que usan piezas/banco/calendario/Meta.
// Las métricas de análisis (platforms, history, virals, competitors,
// content, ads, sentiment) siguen siendo locales/en memoria por ahora:
// se cargan en 0 para clientes nuevos y se completan a mano desde la
// UI existente (Histórico, Contenido, Benchmark). Se pierden al
// refrescar la página — igual que en la versión demo anterior. Si en
// algún momento se quiere persistir esto también, es una tabla aparte.

function blankPlatform() {
  return {
    followers: 0, posts: 0, reach_pct: 0, engagement_pct: 0,
    views_avg: 0, views_viral: 0, freq_week: 0,
    video_dur: 0, completion_pct: 0, saves_avg: 0, shares_avg: 0,
    status: 'warn', notes: '',
  }
}

function withAnalyticsDefaults(row) {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry || 'General',
    avatar: row.avatar || row.name.slice(0, 3).toUpperCase(),
    color: row.color || CLIENT_COLORS[0],
    platforms: Object.fromEntries(PLATFORM_KEYS.map(k => [k, blankPlatform()])),
    history: [],
    virals: [],
    competitors: [],
    content: { works: [], fails: [], best_days: [], best_time: '' },
    ads: null,
    sentiment: { positive: 0, neutral: 0, negative: 0 },
  }
}

export function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: true })
    if (error) {
      setLoadError(error.message)
    } else {
      setLoadError('')
      setClients(prev =>
        data.map(row => {
          // conserva el análisis ya cargado en memoria para clientes existentes
          const existing = prev.find(c => c.id === row.id)
          const base = withAnalyticsDefaults(row)
          return existing
            ? { ...base, platforms: existing.platforms, history: existing.history, virals: existing.virals, competitors: existing.competitors, content: existing.content, ads: existing.ads, sentiment: existing.sentiment }
            : base
        })
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const addClient = useCallback(async (name, industry, avatar) => {
    const color = CLIENT_COLORS[clients.length % CLIENT_COLORS.length]
    const { data, error } = await supabase
      .from('clients')
      .insert({ name, industry: industry || 'General', avatar: (avatar || name.slice(0, 3)).toUpperCase(), color })
      .select()
      .single()
    if (error) { setLoadError(error.message); return null }
    setClients(prev => [...prev, withAnalyticsDefaults(data)])
    return data.id
  }, [clients.length])

  const removeClient = useCallback(async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) { setLoadError(error.message); return }
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])

  const updateClient = useCallback((id, updater) => {
    setClients(prev => prev.map(c => c.id === id ? updater(c) : c))
  }, [])

  const addHistoryPoint = useCallback((id, point) => {
    updateClient(id, c => ({
      ...c,
      history: [...c.history, point].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }, [updateClient])

  const addViral = useCallback((id, viral) => {
    updateClient(id, c => ({ ...c, virals: [...c.virals, viral] }))
  }, [updateClient])

  const removeViral = useCallback((id, idx) => {
    updateClient(id, c => ({ ...c, virals: c.virals.filter((_, i) => i !== idx) }))
  }, [updateClient])

  const addCompetitor = useCallback((id, comp) => {
    updateClient(id, c => ({ ...c, competitors: [...c.competitors, comp] }))
  }, [updateClient])

  const removeCompetitor = useCallback((id, idx) => {
    updateClient(id, c => ({ ...c, competitors: c.competitors.filter((_, i) => i !== idx) }))
  }, [updateClient])

  return {
    clients,
    loading,
    loadError,
    addClient,
    removeClient,
    updateClient,
    addHistoryPoint,
    addViral,
    removeViral,
    addCompetitor,
    removeCompetitor,
  }
}
