import { useMemo, useState } from 'react'
import { Card, SLabel, Btn, Input, Sel } from '../ui'
import { T, PLATFORM_META, POST_TYPES } from '../../tokens'
import { fmtNum, fmtDate, fmtPct } from '../../utils/format'
import { downloadCSV } from '../../utils/download'
import { Check, X, Calendar, Download, Plus, ExternalLink, Image, Film, Layers, Circle, Heart, MessageCircle, Bookmark, PlayCircle } from 'lucide-react'

const TIPO_META = {
  historia: { label: 'Historia', icon: Circle },
  post:     { label: 'Post',     icon: Image },
  carrusel: { label: 'Carrusel', icon: Layers },
  reel:     { label: 'Reel',     icon: Film },
}

function fmtDateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

export function ModContenido({ client, allClients, notify, addViral, removeViral }) {
  const [virals,      setVirals]      = useState(client.virals)
  const [showAdd,     setShowAdd]     = useState(false)
  const [newViral,    setNewViral]    = useState({ title: '', platform: 'instagram', date: '', views: '', likes: '', comments: '', type: 'Reel', url: '' })

  const saveViral = () => {
    if (!newViral.title || !newViral.views) return
    const v = { ...newViral, views: +newViral.views, likes: +newViral.likes || 0, comments: +newViral.comments || 0 }
    setVirals(prev => [...prev, v])
    addViral(client.id, v).catch(err => notify('Error guardando: ' + err.message))
    setNewViral({ title: '', platform: 'instagram', date: '', views: '', likes: '', comments: '', type: 'Reel', url: '' })
    setShowAdd(false)
    notify('Post viral agregado')
  }

  const doDownload = () => {
    downloadCSV(
      virals.map(v => ({ Titulo: v.title, Plataforma: v.platform, Fecha: v.date, Tipo: v.type, Views: v.views, Likes: v.likes, Comentarios: v.comments })),
      `virales_${client.name.replace(/\s/g, '_')}.csv`
    )
    notify('Virales descargados')
  }

  const platformOptions = Object.keys(PLATFORM_META).map(k => ({ v: k, l: PLATFORM_META[k].label }))

  // ── Rendimiento real por publicación (metricas_piezas) ────────────
  const [tipoFilter, setTipoFilter] = useState('todos')
  const pieces = client.pieces || []

  const filteredPieces = useMemo(() => {
    const list = tipoFilter === 'todos' ? pieces : pieces.filter(p => p.tipo === tipoFilter)
    const hasReach = list.some(p => p.reach != null)
    return [...list].sort((a, b) => {
      if (hasReach) return (b.reach ?? -1) - (a.reach ?? -1)
      return (b.likes ?? -1) - (a.likes ?? -1)
    })
  }, [pieces, tipoFilter])

  const stats = useMemo(() => {
    const withLikes = pieces.filter(p => p.likes != null)
    const withReach = pieces.filter(p => p.reach != null)
    const avg = (arr, key) => arr.length ? Math.round(arr.reduce((s, p) => s + (p[key] || 0), 0) / arr.length) : null
    const byTipo = {}
    for (const p of pieces) {
      if (p.likes == null) continue
      const t = p.tipo || 'post'
      byTipo[t] ||= []
      byTipo[t].push(p.likes)
    }
    let bestTipo = null, bestAvg = -1
    for (const [t, arr] of Object.entries(byTipo)) {
      const a = arr.reduce((s, v) => s + v, 0) / arr.length
      if (a > bestAvg) { bestAvg = a; bestTipo = t }
    }
    return {
      total: pieces.length,
      avgReach: avg(withReach, 'reach'),
      avgLikes: avg(withLikes, 'likes'),
      avgComments: avg(pieces.filter(p => p.comments != null), 'comments'),
      bestTipo,
      pendingMetrics: pieces.filter(p => p.likes == null && p.reach == null).length,
    }
  }, [pieces])

  const tipoOptions = [{ v: 'todos', l: 'Todos los tipos' }, ...Object.entries(TIPO_META).map(([v, m]) => ({ v, l: m.label }))]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Rendimiento real por publicación — de metricas_piezas (sync automático) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SLabel>Rendimiento por publicación</SLabel>
          <Sel value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} options={tipoOptions} style={{ minWidth: 150 }} />
        </div>

        {pieces.length === 0 ? (
          <Card>
            <div style={{ fontSize: 12, color: T.dim }}>Todavía no hay publicaciones sincronizadas para este cliente.</div>
          </Card>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
              <Card style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: T.dim, marginBottom: 4 }}>Publicaciones</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{stats.total}</div>
              </Card>
              <Card style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: T.dim, marginBottom: 4 }}>Alcance promedio</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{stats.avgReach != null ? fmtNum(stats.avgReach) : '—'}</div>
              </Card>
              <Card style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: T.dim, marginBottom: 4 }}>Likes promedio</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.pink }}>{stats.avgLikes != null ? fmtNum(stats.avgLikes) : '—'}</div>
              </Card>
              <Card style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: T.dim, marginBottom: 4 }}>Mejor tipo (por likes)</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.primary }}>{stats.bestTipo ? TIPO_META[stats.bestTipo]?.label || stats.bestTipo : '—'}</div>
              </Card>
            </div>

            {stats.avgReach == null && (
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 10, padding: '8px 10px', background: T.surf, borderRadius: 6 }}>
                El alcance (reach) todavía no está disponible por un permiso pendiente de Meta — likes y comentarios sí son datos reales.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
              {filteredPieces.map(p => {
                const meta = TIPO_META[p.tipo] || TIPO_META.post
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 5, background: T.ig + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ig, flexShrink: 0 }}>
                      <meta.icon size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {p.caption ? p.caption.slice(0, 60) : `${meta.label} sin descripción`}
                        {p.permalink && (
                          <a href={p.permalink} target="_blank" rel="noreferrer" style={{ color: T.dim, display: 'flex', flexShrink: 0 }}>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div style={{ fontSize: 9, color: T.dim }}>{meta.label} · {fmtDateShort(p.published_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ textAlign: 'right', minWidth: 40 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{p.reach != null ? fmtNum(p.reach) : '—'}</div>
                        <div style={{ fontSize: 8, color: T.dim, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>alcance</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 36 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.pink }}>{p.likes != null ? fmtNum(p.likes) : '—'}</div>
                        <div style={{ fontSize: 8, color: T.dim, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}><Heart size={8} /></div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 36 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.blue }}>{p.comments != null ? fmtNum(p.comments) : '—'}</div>
                        <div style={{ fontSize: 8, color: T.dim, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}><MessageCircle size={8} /></div>
                      </div>
                      {p.tipo === 'reel' && (
                        <div style={{ textAlign: 'right', minWidth: 36 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.violet }}>{p.plays != null ? fmtNum(p.plays) : '—'}</div>
                          <div style={{ fontSize: 8, color: T.dim, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}><PlayCircle size={8} /></div>
                        </div>
                      )}
                      <div style={{ textAlign: 'right', minWidth: 36 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.green }}>{p.saves != null ? fmtNum(p.saves) : '—'}</div>
                        <div style={{ fontSize: 8, color: T.dim, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}><Bookmark size={8} /></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Works / Fails */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card accent={T.green}>
          <SLabel accent={T.green}>Qué funciona</SLabel>
          {client.content.works.length
            ? client.content.works.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: T.sub }}>
                  <Check size={14} style={{ color: T.green, flexShrink: 0 }} />{w}
                </div>
              ))
            : <div style={{ fontSize: 12, color: T.dim }}>Sin datos cargados aún.</div>
          }
          {(client.content.best_days?.length > 0 || client.content.best_time) && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: T.surf, borderRadius: 6, fontSize: 10, color: T.dim }}>
              <Calendar size={12} /> Mejor horario: {client.content.best_days?.join(', ')} · {client.content.best_time}
            </div>
          )}
        </Card>
        <Card accent={T.red}>
          <SLabel accent={T.red}>Qué no funciona</SLabel>
          {client.content.fails.length
            ? client.content.fails.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: T.sub }}>
                  <X size={14} style={{ color: T.red, flexShrink: 0 }} />{f}
                </div>
              ))
            : <div style={{ fontSize: 12, color: T.dim }}>Sin datos cargados aún.</div>
          }
        </Card>
      </div>

      {/* Virals list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel>Posts virales históricos</SLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" variant="ghost" onClick={() => setShowAdd(!showAdd)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} /> Agregar</Btn>
          <Btn size="sm" variant="success" onClick={doDownload} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Download size={12} /> CSV</Btn>
        </div>
      </div>

      {showAdd && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Título *</div><Input value={newViral.title} onChange={e => setNewViral(p => ({ ...p, title: e.target.value }))} placeholder="Reel de lasagna…" /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Plataforma</div><Sel value={newViral.platform} onChange={e => setNewViral(p => ({ ...p, platform: e.target.value }))} options={platformOptions} style={{ width: '100%' }} /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Fecha (AAAA-MM)</div><Input value={newViral.date} onChange={e => setNewViral(p => ({ ...p, date: e.target.value }))} placeholder="2024-03" mono /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Tipo</div><Sel value={newViral.type} onChange={e => setNewViral(p => ({ ...p, type: e.target.value }))} options={POST_TYPES} style={{ width: '100%' }} /></div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Link al post/video (opcional)</div>
            <Input value={newViral.url} onChange={e => setNewViral(p => ({ ...p, url: e.target.value }))} placeholder="https://www.instagram.com/reel/…" mono />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[['Views *', 'views'], ['Likes', 'likes'], ['Comentarios', 'comments']].map(([l, k]) => (
              <div key={k}><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>{l}</div><Input value={newViral[k]} onChange={e => setNewViral(p => ({ ...p, [k]: e.target.value }))} placeholder="0" mono /></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={saveViral} disabled={!newViral.title || !newViral.views}>Guardar</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...virals].sort((a, b) => b.views - a.views).map((v, i) => {
          const m = PLATFORM_META[v.platform]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? T.primary : T.dim, minWidth: 22 }}>#{i + 1}</div>
              <div style={{ width: 26, height: 26, borderRadius: 5, background: m.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}><m.icon size={13} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: T.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {v.title}
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noreferrer" title="Abrir post" style={{ color: T.dim, display: 'flex', alignItems: 'center' }}>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 10, color: T.dim }}>{m.label} · {v.type}{v.date ? ` · ${fmtDate(v.date)}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: m.color, fontFamily: 'inherit' }}>{fmtNum(v.views)}</div>
                <div style={{ fontSize: 9, color: T.dim }}>views</div>
              </div>
              {v.likes > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.pink, fontFamily: 'inherit' }}>{fmtNum(v.likes)}</div>
                  <div style={{ fontSize: 9, color: T.dim }}>likes</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
