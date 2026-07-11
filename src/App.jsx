import { useState, useCallback } from 'react'
import { T, PLATFORM_META } from './tokens'
import { useClients } from './hooks/useClients'
import { Toast } from './components/ui/Toast'
import { Tag }   from './components/ui/Tag'
import { Pulse } from './components/ui/Pulse'
import { AddClientModal } from './components/AddClientModal'
import {
  ModResumen,
  ModHistorico,
  ModPlataformas,
  ModContenido,
  ModBenchmark,
  ModIA,
} from './components/modules'

const MODULES = [
  { id: 'resumen',     label: 'Resumen' },
  { id: 'historico',   label: 'Histórico' },
  { id: 'plataformas', label: 'Plataformas' },
  { id: 'contenido',   label: 'Contenido' },
  { id: 'benchmark',   label: 'Benchmark' },
  { id: 'ia',          label: '✦ IA Análisis' },
]

function clientStatus(client) {
  const active = Object.values(client.platforms).filter(p => p.status === 'active').length
  return active >= 2 ? 'active' : active === 1 ? 'warn' : 'dead'
}

export default function App() {
  const {
    clients, addClient, removeClient,
    addHistoryPoint, addViral, removeViral,
    addCompetitor, removeCompetitor,
  } = useClients()

  const [activeId,  setActiveId]  = useState(clients[0]?.id)
  const [activeMod, setActiveMod] = useState('resumen')
  const [toast,     setToast]     = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)

  const notify = useCallback((msg) => setToast(msg), [])

  const client = clients.find(c => c.id === activeId) || clients[0]

  const handleAddClient = (name, industry, avatar) => {
    const id = addClient(name, industry, avatar)
    setActiveId(id)
    setActiveMod('resumen')
    notify(`Cliente "${name}" creado`)
  }

  const handleRemoveClient = (id) => {
    if (clients.length <= 1) return
    const next = clients.find(c => c.id !== id)
    removeClient(id)
    setActiveId(next?.id)
    notify('Cliente eliminado')
  }

  const renderModule = () => {
    if (!client) return null
    const shared = { client, allClients: clients, notify }
    switch (activeMod) {
      case 'resumen':     return <ModResumen     {...shared} />
      case 'historico':   return <ModHistorico   {...shared} addHistoryPoint={addHistoryPoint} />
      case 'plataformas': return <ModPlataformas {...shared} />
      case 'contenido':   return <ModContenido   {...shared} addViral={addViral} removeViral={removeViral} />
      case 'benchmark':   return <ModBenchmark   {...shared} addCompetitor={addCompetitor} removeCompetitor={removeCompetitor} />
      case 'ia':          return <ModIA          {...shared} />
      default:            return <ModResumen     {...shared} />
    }
  }

  return (
    <>
      {/* ── TOP BAR ───────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.card, position: 'sticky', top: 0, zIndex: 100 }}>

        {/* Logo + client tabs */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${T.border}`, height: 46 }}>
          {/* Logo */}
          <div style={{ padding: '0 20px', borderRight: `1px solid ${T.border}`, height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: T.text }}>
              Ad<span style={{ color: T.blue }}>Mind</span>
            </span>
            <span style={{ fontSize: 8, color: T.dim, letterSpacing: '0.12em', marginLeft: 6, fontWeight: 500 }}>
              ANALYTICS
            </span>
          </div>

          {/* Client tabs */}
          <div style={{ display: 'flex', flex: 1, overflowX: 'auto', height: '100%' }}>
            {clients.map(c => {
              const isActive = c.id === activeId
              return (
                <button
                  key={c.id}
                  onClick={() => { setActiveId(c.id); setActiveMod('resumen') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '0 16px', height: '100%',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? c.color : 'transparent'}`,
                    background: 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: isActive ? 700 : 400,
                    fontSize: 12,
                    color: isActive ? c.color : T.dim,
                    whiteSpace: 'nowrap',
                    transition: 'color .15s, border-color .15s',
                  }}
                >
                  {/* Avatar */}
                  <span style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: c.color + '25',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 800, color: c.color,
                  }}>
                    {c.avatar}
                  </span>
                  {c.name}
                  {/* Status dot */}
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: clientStatus(c) === 'active' ? T.active : clientStatus(c) === 'warn' ? T.warn : T.dead,
                  }} />
                  {/* Remove button (only when active) */}
                  {isActive && clients.length > 1 && (
                    <span
                      onClick={e => { e.stopPropagation(); handleRemoveClient(c.id) }}
                      style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: T.border2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: T.dim, cursor: 'pointer', marginLeft: 2,
                      }}
                    >✕</span>
                  )}
                </button>
              )
            })}

            {/* Add client button */}
            <button
              onClick={() => setShowAdd(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '0 14px', height: '100%',
                border: 'none', background: 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11, color: T.dim,
              }}
            >
              + Cliente
            </button>
          </div>
        </div>

        {/* Module nav */}
        {client && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 38, gap: 2 }}>
            {MODULES.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMod(m.id)}
                style={{
                  padding: '0 14px', height: 38,
                  border: 'none',
                  borderBottom: `2px solid ${activeMod === m.id ? T.blue : 'transparent'}`,
                  background: 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: activeMod === m.id ? 600 : 400,
                  fontSize: 11,
                  color: activeMod === m.id ? T.blue : T.dim,
                  transition: 'color .15s, border-color .15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.label}
              </button>
            ))}

            {/* Right side: industry + status */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag color={client.color}>{client.industry}</Tag>
              <Pulse status={clientStatus(client)} />
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {renderModule()}
      </main>

      {/* ── MODALS & OVERLAYS ─────────────────────────────────── */}
      {showAdd && (
        <AddClientModal onAdd={handleAddClient} onClose={() => setShowAdd(false)} />
      )}
      {toast && (
        <Toast msg={toast} onClose={() => setToast(null)} />
      )}
    </>
  )
}
