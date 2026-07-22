import { useState, useEffect } from 'react'
import { Card, SLabel, MetricBig, Pulse, Btn, Input, Sel } from '../ui'
import { T, PLATFORM_META } from '../../tokens'
import { fmtNum, fmtPct, fmtDate } from '../../utils/format'
import { downloadCSV } from '../../utils/download'
import { Download, Plus, Calendar, Clock, ExternalLink } from 'lucide-react'

const STATUS_OPTIONS = [{ v: 'active', l: 'Activo' }, { v: 'warn', l: 'Atención' }, { v: 'dead', l: 'Inactivo' }]

function blankNewPlatform() {
  return { platform: '', handle: '', profile_url: '' }
}

function editFormFrom(p) {
  return {
    handle: p.handle || '',
    profile_url: p.profile_url || '',
    followers: p.followers || 0,
    posts: p.posts || 0,
    reach_pct: p.reach_pct || 0,
    engagement_pct: p.engagement_pct || 0,
    views_avg: p.views_avg || 0,
    views_viral: p.views_viral || 0,
    freq_week: p.freq_week || 0,
    completion_pct: p.completion_pct || 0,
    status: p.status || 'warn',
    notes: p.notes || '',
  }
}

export function ModPlataformas({ client, notify, addPlatform, updatePlatform, removePlatform }) {
  const platformKeys = Object.keys(client.platforms)
  const [active,  setActive]  = useState(platformKeys[0] || null)
  const [showAdd, setShowAdd] = useState(false)
  const [newP,    setNewP]    = useState(blankNewPlatform())
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState(null)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!active && platformKeys.length) setActive(platformKeys[0])
    if (active && !client.platforms[active]) setActive(platformKeys[0] || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.platforms])

  const p    = active ? client.platforms[active] : null
  const meta = active ? PLATFORM_META[active] : null

  const availableToAdd = Object.keys(PLATFORM_META).filter(k => !platformKeys.includes(k))

  const doDownload = () => {
    const rows = Object.entries(client.platforms).map(([k, v]) => ({
      Plataforma:      PLATFORM_META[k].label,
      Link:            v.profile_url || v.handle || '',
      Seguidores:      v.followers,
      Posts:           v.posts,
      'Reach %':       v.reach_pct,
      'Engagement %':  v.engagement_pct,
      'Views promedio': v.views_avg,
      'Viral pico':    v.views_viral,
      'Posts semana':  v.freq_week,
      'Completado %':  v.completion_pct,
      Estado:          v.status,
      Notas:           v.notes,
    }))
    downloadCSV(rows, `plataformas_${client.name.replace(/\s/g, '_')}.csv`)
    notify('Métricas de plataformas descargadas')
  }

  const saveNewPlatform = async () => {
    if (!newP.platform) return
    try {
      await addPlatform(client.id, newP.platform, { handle: newP.handle || null, profile_url: newP.profile_url || null })
      setActive(newP.platform)
      setNewP(blankNewPlatform())
      setShowAdd(false)
      notify('Red agregada')
    } catch (err) {
      notify('Error agregando red: ' + err.message)
    }
  }

  const startEdit = () => { setForm(editFormFrom(p)); setEditing(true) }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await updatePlatform(client.id, active, {
        handle: form.handle || null,
        profile_url: form.profile_url || null,
        followers: +form.followers || 0,
        posts: +form.posts || 0,
        reach_pct: +form.reach_pct || 0,
        engagement_pct: +form.engagement_pct || 0,
        views_avg: +form.views_avg || 0,
        views_viral: +form.views_viral || 0,
        freq_week: +form.freq_week || 0,
        completion_pct: +form.completion_pct || 0,
        status: form.status,
        notes: form.notes,
      })
      setEditing(false)
      notify('Red actualizada')
    } catch (err) {
      notify('Error guardando: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const doRemove = async () => {
    if (!window.confirm(`¿Quitar ${meta.label} de ${client.name}?`)) return
    try {
      await removePlatform(client.id, active)
      notify('Red eliminada')
    } catch (err) {
      notify('Error borrando: ' + err.message)
    }
  }

  const clientVirals = active ? client.virals.filter(v => v.platform === active) : []

  const platformMetrics = p ? [
    ['Seguidores',    fmtNum(p.followers),           meta.color],
    ['Posts totales', p.posts,                        T.sub],
    ['Reach %',       fmtPct(p.reach_pct),           p.reach_pct > 15 ? T.green : p.reach_pct > 8 ? T.warn : T.red],
    ['Engagement %',  fmtPct(p.engagement_pct),      p.engagement_pct > 5 ? T.green : p.engagement_pct > 2 ? T.warn : T.red],
    ['Views prom.',   fmtNum(p.views_avg),            T.dim],
    ['Viral pico',    fmtNum(p.views_viral),          T.dim],
    ['Posts / sem',   p.freq_week,                    T.dim],
    ['Completado %',  fmtPct(p.completion_pct),       p.completion_pct > 60 ? T.green : T.warn],
  ] : []

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel accent={meta?.color}>Diagnóstico por plataforma</SLabel>
        {platformKeys.length > 0 && (
          <Btn size="sm" variant="success" onClick={doDownload} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Download size={12} /> Todas las plataformas CSV</Btn>
        )}
      </div>

      {/* Platform tabs + add */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {platformKeys.map(key => {
          const m   = PLATFORM_META[key]
          const pl  = client.platforms[key]
          const sel = active === key
          return (
            <button key={key} onClick={() => { setActive(key); setEditing(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${sel ? m.color + '80' : T.border}`,
              background: sel ? m.color + '15' : T.surf,
              cursor: 'pointer', color: sel ? m.color : T.sub,
              fontWeight: sel ? 700 : 400, fontSize: 12, fontFamily: 'inherit',
            }}>
              <m.icon size={13} /> {m.label}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: pl.status === 'active' ? T.active : pl.status === 'warn' ? T.warn : T.dead }} />
            </button>
          )
        })}
        {availableToAdd.length > 0 && (
          <Btn size="sm" variant="ghost" onClick={() => setShowAdd(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} /> Red</Btn>
        )}
      </div>

      {/* Add platform form */}
      {showAdd && (
        <Card accent={T.primary}>
          <SLabel accent={T.primary}>Agregar red social</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Plataforma *</div>
              <Sel value={newP.platform} onChange={e => setNewP(p => ({ ...p, platform: e.target.value }))}
                options={[{ v: '', l: 'Elegir…' }, ...availableToAdd.map(k => ({ v: k, l: PLATFORM_META[k].label }))]} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Handle</div>
              <Input value={newP.handle} onChange={e => setNewP(p => ({ ...p, handle: e.target.value }))} placeholder="@cafesanjuan" mono />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Link del perfil</div>
              <Input value={newP.profile_url} onChange={e => setNewP(p => ({ ...p, profile_url: e.target.value }))} placeholder="https://instagram.com/…" mono />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={saveNewPlatform} disabled={!newP.platform}>Guardar</Btn>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setNewP(blankNewPlatform()) }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {!platformKeys.length && !showAdd && (
        <Card>
          <div style={{ fontSize: 12, color: T.dim, textAlign: 'center', padding: '20px 0' }}>
            {client.name} todavía no tiene redes cargadas. Usá "+ Red" para agregar la primera.
          </div>
        </Card>
      )}

      {p && (
        <>
          {/* Link + editar/quitar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, color: T.sub }}>
              {p.profile_url
                ? <a href={p.profile_url} target="_blank" rel="noreferrer" style={{ color: meta.color }}>{p.handle || p.profile_url} ↗</a>
                : (p.handle || <span style={{ color: T.dim }}>Sin link cargado</span>)}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="sm" variant="ghost" onClick={() => editing ? setEditing(false) : startEdit()}>{editing ? 'Cancelar' : 'Editar'}</Btn>
              <Btn size="sm" variant="danger" onClick={doRemove}>Quitar red</Btn>
            </div>
          </div>

          {/* Edit form */}
          {editing && form && (
            <Card accent={meta.color}>
              <SLabel accent={meta.color}>Editar {meta.label}</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Handle</div><Input value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} mono /></div>
                <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Link perfil</div><Input value={form.profile_url} onChange={e => setForm(f => ({ ...f, profile_url: e.target.value }))} mono /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
                {[
                  ['Seguidores', 'followers'], ['Posts', 'posts'], ['Reach %', 'reach_pct'], ['Engagement %', 'engagement_pct'],
                  ['Views prom.', 'views_avg'], ['Viral pico', 'views_viral'], ['Posts/sem', 'freq_week'], ['Completado %', 'completion_pct'],
                ].map(([l, k]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>{l}</div>
                    <Input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} mono />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Estado</div>
                  <Sel value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={STATUS_OPTIONS} style={{ width: '100%' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Notas</div>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Diagnóstico del canal…" />
                </div>
              </div>
              <Btn onClick={saveEdit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Btn>
            </Card>
          )}

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
            {platformMetrics.map(([l, v, c]) => (
              <MetricBig key={l} label={l} value={v} color={c} />
            ))}
          </div>

          {/* Status + notes */}
          <Card accent={meta.color}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <SLabel accent={meta.color}>Estado del canal — {meta.label}</SLabel>
              <Pulse status={p.status} />
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.7 }}>
              {p.notes || 'Sin notas. Agregar diagnóstico manual.'}
            </div>
            {p.freq_week > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.surf, borderRadius: 6, padding: '6px 12px', fontSize: 11, color: T.sub }}>
                  <Calendar size={12} /> {p.freq_week} post{p.freq_week !== 1 ? 's' : ''} por semana
                </div>
                {p.video_dur > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.surf, borderRadius: 6, padding: '6px 12px', fontSize: 11, color: T.sub }}>
                    <Clock size={12} /> {p.video_dur >= 60 ? Math.round(p.video_dur / 60) + ' min' : p.video_dur + ' seg'} duración prom.
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Virals for this platform */}
          {clientVirals.length > 0 && (
            <Card>
              <SLabel accent={meta.color}>Virales históricos — {meta.label}</SLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clientVirals.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: T.surf, borderRadius: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 5, background: meta.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: meta.color }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: T.text, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {v.title}
                        {v.url && (
                          <a href={v.url} target="_blank" rel="noreferrer" title="Abrir post" style={{ color: T.dim, display: 'flex', alignItems: 'center' }}>
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{fmtDate(v.date)} · {v.type}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: meta.color, fontFamily: 'inherit' }}>{fmtNum(v.views)}</div>
                      <div style={{ fontSize: 9, color: T.dim }}>views</div>
                    </div>
                    {v.likes > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.pink, fontFamily: 'inherit' }}>{fmtNum(v.likes)}</div>
                        <div style={{ fontSize: 9, color: T.dim }}>likes</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
