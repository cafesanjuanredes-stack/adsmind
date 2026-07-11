import { useState, useCallback } from 'react'
import { SEED_CLIENTS } from '../data/seedClients'
import { CLIENT_COLORS, PLATFORM_KEYS } from '../tokens'

function blankPlatform() {
  return {
    followers: 0, posts: 0, reach_pct: 0, engagement_pct: 0,
    views_avg: 0, views_viral: 0, freq_week: 0,
    video_dur: 0, completion_pct: 0, saves_avg: 0, shares_avg: 0,
    status: 'warn', notes: '',
  }
}

function blankClient(name, industry, avatar, index) {
  return {
    id: Date.now(),
    name,
    industry: industry || 'General',
    avatar: avatar || name.slice(0, 3).toUpperCase(),
    color: CLIENT_COLORS[index % CLIENT_COLORS.length],
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
  const [clients, setClients] = useState(SEED_CLIENTS)

  const addClient = useCallback((name, industry, avatar) => {
    const nc = blankClient(name, industry, avatar, clients.length)
    setClients(prev => [...prev, nc])
    return nc.id
  }, [clients.length])

  const removeClient = useCallback((id) => {
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])

  const updateClient = useCallback((id, updater) => {
    setClients(prev => prev.map(c => c.id === id ? updater(c) : c))
  }, [])

  // Add a history point to a client
  const addHistoryPoint = useCallback((id, point) => {
    updateClient(id, c => ({
      ...c,
      history: [...c.history, point].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }, [updateClient])

  // Add a viral post
  const addViral = useCallback((id, viral) => {
    updateClient(id, c => ({ ...c, virals: [...c.virals, viral] }))
  }, [updateClient])

  // Remove a viral by index
  const removeViral = useCallback((id, idx) => {
    updateClient(id, c => ({ ...c, virals: c.virals.filter((_, i) => i !== idx) }))
  }, [updateClient])

  // Add competitor
  const addCompetitor = useCallback((id, comp) => {
    updateClient(id, c => ({ ...c, competitors: [...c.competitors, comp] }))
  }, [updateClient])

  // Remove competitor by index
  const removeCompetitor = useCallback((id, idx) => {
    updateClient(id, c => ({ ...c, competitors: c.competitors.filter((_, i) => i !== idx) }))
  }, [updateClient])

  return {
    clients,
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
