import { useState, useEffect, useCallback } from 'react'
import { Card, SLabel, Btn, Input } from '../ui'
import { T } from '../../tokens'
import { listPiezas, updatePiezaEstado } from '../../lib/piezas'
import { getSignedUrl } from '../../lib/storage'
import { listVideos, createVideo, updateVideo, deleteVideo } from '../../lib/videosExternos'
import { ChevronLeft, ChevronRight, X, Plus, CircleDot, LayoutGrid, Play } from 'lucide-react'

const DIA_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TIPO_META = {
  historia: { label: 'Historia', color: T.violet, icon: CircleDot },
  post:     { label: 'Post',     color: T.cyan,   icon: LayoutGrid },
  video:    { label: 'Video',    color: T.orange, icon: Play },
}

function dayKey(d) {
  return d.toISOString().slice(0, 10)
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // lunes=0
  const gridStart = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return { date: d, inMonth: d.getMonth() === month }
  })
}

export function ModCalendario({ client, notify }) {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [piezas, setPiezas] = useState([])
  const [videos, setVideos] = useState([])
  const [thumbs, setThumbs] = useState({})
  const [loading, setLoading] = useState(true)

  const [newVideo, setNewVideo] = useState({ titulo: '', videoUrl: '', scheduledFor: '' })
  const [savingVideo, setSavingVideo] = useState(false)
  const [scheduleDates, setScheduleDates] = useState({}) // { [piezaId]: 'YYYY-MM-DD' }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, v] = await Promise.all([listPiezas(client.id), listVideos(client.id)])
      setPiezas(p)
      setVideos(v)
    } catch (err) {
      notify('Error cargando calendario: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [client.id, notify])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let cancelled = false
    const withImage = piezas.filter(p => p.storage_path)
    Promise.all(withImage.map(p => getSignedUrl(p.storage_path, 900).then(url => [p.id, url]).catch(() => [p.id, null])))
      .then(entries => { if (!cancelled) setThumbs(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [piezas])

  const banco = piezas.filter(p => p.estado === 'banco')
  const grid = buildMonthGrid(month)

  const itemsByDay = {}
  for (const p of piezas) {
    if (!p.scheduled_for) continue
    const key = p.scheduled_for.slice(0, 10)
    ;(itemsByDay[key] ||= []).push({ kind: 'pieza', data: p })
  }
  for (const v of videos) {
    if (!v.scheduled_for) continue
    const key = v.scheduled_for.slice(0, 10)
    ;(itemsByDay[key] ||= []).push({ kind: 'video', data: v })
  }

  const monthLabel = month.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const handleProgramarPieza = async (pieza) => {
    const dateStr = scheduleDates[pieza.id]
    if (!dateStr) { notify('Elegí una fecha primero'); return }
    try {
      await updatePiezaEstado(pieza.id, 'programada', { scheduled_for: new Date(`${dateStr}T10:00:00`).toISOString() })
      notify(`${pieza.tipo === 'historia' ? 'Historia' : 'Post'} programado`)
      load()
    } catch (err) {
      notify('Error programando: ' + err.message)
    }
  }

  const handleVolverABanco = async (pieza) => {
    try {
      await updatePiezaEstado(pieza.id, 'banco', { scheduled_for: null })
      notify('Volvió al banco')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const handleCreateVideo = async () => {
    if (!newVideo.titulo || !newVideo.videoUrl) return
    setSavingVideo(true)
    try {
      await createVideo({
        clientId: client.id,
        titulo: newVideo.titulo,
        videoUrl: newVideo.videoUrl,
        scheduledFor: newVideo.scheduledFor ? new Date(`${newVideo.scheduledFor}T10:00:00`).toISOString() : null,
      })
      setNewVideo({ titulo: '', videoUrl: '', scheduledFor: '' })
      notify('Video externo agregado')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    } finally {
      setSavingVideo(false)
    }
  }

  const handleToggleVideoPublicado = async (video) => {
    try {
      await updateVideo(video.id, {
        estado: video.estado === 'publicado' ? 'programado' : 'publicado',
        published_at: video.estado === 'publicado' ? null : new Date().toISOString(),
      })
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const handleDeleteVideo = async (video) => {
    try {
      await deleteVideo(video.id)
      notify('Video eliminado')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SLabel accent={client.color}>Calendario — {client.name}</SLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── Calendario mensual ─────────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Btn size="sm" variant="ghost" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={13} /> Mes</Btn>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, textTransform: 'capitalize' }}>{monthLabel}</div>
            <Btn size="sm" variant="ghost" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Mes <ChevronRight size={13} /></Btn>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
            {DIA_LABELS.map(l => (
              <div key={l} style={{ fontSize: 9, color: T.dim, textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {grid.map(({ date, inMonth }) => {
              const key = dayKey(date)
              const items = itemsByDay[key] || []
              const isToday = key === dayKey(new Date())
              return (
                <div key={key} style={{
                  minHeight: 78, borderRadius: 6, padding: 5,
                  background: inMonth ? T.surf : 'transparent',
                  border: `1px solid ${isToday ? T.primary : T.border}`,
                  opacity: inMonth ? 1 : 0.35,
                }}>
                  <div style={{ fontSize: 10, color: isToday ? T.primary : T.dim, fontWeight: isToday ? 800 : 600, marginBottom: 4 }}>
                    {date.getDate()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {items.slice(0, 3).map((item, i) => {
                      const tipo = item.kind === 'video' ? 'video' : item.data.tipo
                      const meta = TIPO_META[tipo]
                      const label = item.kind === 'video' ? item.data.titulo : (item.data.overlay_text || meta.label)
                      return (
                        <div
                          key={i}
                          title={label}
                          onClick={() => item.kind === 'pieza' ? handleVolverABanco(item.data) : handleToggleVideoPublicado(item.data)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: 9, padding: '2px 4px', borderRadius: 3, cursor: 'pointer',
                            background: meta.color + '20', color: meta.color,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          <meta.icon size={9} style={{ flexShrink: 0 }} /> {label}
                        </div>
                      )
                    })}
                    {items.length > 3 && (
                      <div style={{ fontSize: 8, color: T.dim }}>+{items.length - 3} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: T.dim }}>
            Click en una pieza programada = vuelve al banco. Click en un video = marca publicado/programado.
          </div>
        </Card>

        {/* ── Sidebar: banco pendiente + video externo ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SLabel>Banco sin programar</SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {banco.map(p => {
                const meta = TIPO_META[p.tipo]
                return (
                  <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: T.surf2, borderRadius: 6, padding: 6 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: T.surf }}>
                      {thumbs[p.id] && <img src={thumbs[p.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ fontSize: 10, color: meta.color, flexShrink: 0, width: 44, display: 'flex', alignItems: 'center', gap: 3 }}><meta.icon size={11} /> {meta.label}</div>
                    <input
                      type="date"
                      value={scheduleDates[p.id] || ''}
                      onChange={e => setScheduleDates(s => ({ ...s, [p.id]: e.target.value }))}
                      style={{ flex: 1, fontSize: 10, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 4, color: T.text, padding: '3px 4px' }}
                    />
                    <Btn size="sm" onClick={() => handleProgramarPieza(p)}>OK</Btn>
                  </div>
                )
              })}
              {!loading && !banco.length && (
                <div style={{ fontSize: 11, color: T.dim }}>Nada pendiente — todo lo del banco ya está programado.</div>
              )}
            </div>
          </Card>

          <Card accent={T.orange}>
            <SLabel accent={T.orange}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={12} /> Video externo</span></SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input value={newVideo.titulo} onChange={e => setNewVideo(v => ({ ...v, titulo: e.target.value }))} placeholder="Título del video" />
              <Input value={newVideo.videoUrl} onChange={e => setNewVideo(v => ({ ...v, videoUrl: e.target.value }))} placeholder="Link o path del archivo" mono />
              <input
                type="date"
                value={newVideo.scheduledFor}
                onChange={e => setNewVideo(v => ({ ...v, scheduledFor: e.target.value }))}
                style={{ fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 7, color: T.text, padding: '8px 12px' }}
              />
              <Btn onClick={handleCreateVideo} disabled={!newVideo.titulo || !newVideo.videoUrl || savingVideo}>
                {savingVideo ? 'Guardando…' : 'Agregar al calendario'}
              </Btn>
            </div>
          </Card>

          {videos.length > 0 && (
            <Card>
              <SLabel>Videos externos — {client.name}</SLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {videos.map(v => (
                  <div key={v.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: T.surf2, borderRadius: 6, padding: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.titulo}</div>
                      <div style={{ fontSize: 9, color: T.dim }}>{v.scheduled_for ? v.scheduled_for.slice(0, 10) : 'sin fecha'} · {v.estado}</div>
                    </div>
                    <span onClick={() => handleDeleteVideo(v)} style={{ cursor: 'pointer', color: T.dim, display: 'flex' }}><X size={13} /></span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
