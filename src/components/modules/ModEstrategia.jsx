import { useState, useEffect, useCallback } from 'react'
import { Card, SLabel, Btn, Input } from '../ui'
import { T, RADIUS, PLATFORM_META } from '../../tokens'
import { fmtNum } from '../../utils/format'
import { getStrategy, saveStrategy } from '../../lib/strategy'
import { listPiezas } from '../../lib/piezas'
import { Search, ExternalLink, Play, Save, CircleDot, LayoutGrid, Film, Images } from 'lucide-react'

const InstagramIcon = PLATFORM_META.instagram.icon

const QUOTA_ROWS = [
  { key: 'historias_x_semana', tipo: 'historia', label: 'Historias',  icon: CircleDot },
  { key: 'posts_x_semana',     tipo: 'post',      label: 'Posts',     icon: LayoutGrid },
  { key: 'reels_x_semana',     tipo: 'reel',      label: 'Reels',     icon: Film },
  { key: 'carruseles_x_semana',tipo: 'carrusel',  label: 'Carruseles',icon: Images },
]

function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function ModEstrategia({ client, notify }) {
  const [strategy, setStrategy] = useState(null)
  const [piezas, setPiezas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([getStrategy(client.id), listPiezas(client.id)])
      setStrategy(s)
      setPiezas(p)
    } catch (err) {
      notify('Error cargando estrategia: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [client.id, notify])

  useEffect(() => { load() }, [load])

  const set = (patch) => setStrategy(s => ({ ...s, ...patch }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { client_id, ...patch } = strategy
      await saveStrategy(client.id, patch)
      notify('Estrategia guardada')
    } catch (err) {
      notify('Error guardando: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !strategy) {
    return <div style={{ fontSize: 12, color: T.dim, padding: 20 }}>Cargando estrategia…</div>
  }

  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const weeksThisMonth = daysInMonth(now) / 7

  const youtube = client.platforms?.youtube

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel accent={client.color}>Estrategia — {client.name}</SLabel>
        <Btn size="sm" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={12} /> {saving ? 'Guardando…' : 'Guardar cambios'}
        </Btn>
      </div>

      {/* Cuotas semanales + cumplimiento del mes */}
      <Card>
        <SLabel>Cuotas semanales de contenido</SLabel>
        <div style={{ fontSize: 10, color: T.dim, marginTop: -8, marginBottom: 12 }}>
          Cumplimiento estimado de {monthLabel} — cuenta lo generado este mes contra la cuota semanal × {weeksThisMonth.toFixed(1)} semanas.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
          {QUOTA_ROWS.map(row => {
            const quota = strategy[row.key] || 0
            const target = Math.round(quota * weeksThisMonth)
            const done = piezas.filter(p => p.tipo === row.tipo && p.created_at?.slice(0, 7) === monthStr).length
            const ok = target === 0 || done >= target
            return (
              <div key={row.key} style={{ background: T.surf2, borderRadius: RADIUS.sm - 4, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <row.icon size={13} color={T.sub} />
                  <span style={{ fontSize: 11, color: T.text, fontWeight: 600, flex: 1 }}>{row.label}</span>
                  {target > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: RADIUS.pill,
                      color: ok ? T.active : T.warn, background: (ok ? T.active : T.warn) + '18',
                    }}>{done}/{target}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number" min="0" value={quota}
                    onChange={e => set({ [row.key]: +e.target.value || 0 })}
                    style={{ width: 56, fontSize: 12, background: T.card, border: `1px solid ${T.border2}`, borderRadius: 6, color: T.text, padding: '5px 7px' }}
                  />
                  <span style={{ fontSize: 10, color: T.dim }}>por semana</span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Pauta publicitaria */}
      <Card>
        <SLabel>Pauta publicitaria</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: T.surf2, borderRadius: RADIUS.sm - 4, padding: '10px 12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={strategy.ads_instagram} onChange={e => set({ ads_instagram: e.target.checked })} />
              <InstagramIcon size={13} color={T.ig} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>Pauta en Instagram</span>
            </label>
            {strategy.ads_instagram && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: T.dim }}>Presupuesto mensual $</span>
                <input
                  type="number" min="0" value={strategy.ads_instagram_budget}
                  onChange={e => set({ ads_instagram_budget: +e.target.value || 0 })}
                  style={{ width: 90, fontSize: 12, background: T.card, border: `1px solid ${T.border2}`, borderRadius: 6, color: T.text, padding: '5px 7px' }}
                />
              </div>
            )}
          </div>
          <div style={{ background: T.surf2, borderRadius: RADIUS.sm - 4, padding: '10px 12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={strategy.ads_google} onChange={e => set({ ads_google: e.target.checked })} />
              <Search size={13} color={T.ga} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>Pauta en Google Ads</span>
            </label>
            {strategy.ads_google && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: T.dim }}>Presupuesto mensual $</span>
                <input
                  type="number" min="0" value={strategy.ads_google_budget}
                  onChange={e => set({ ads_google_budget: +e.target.value || 0 })}
                  style={{ width: 90, fontSize: 12, background: T.card, border: `1px solid ${T.border2}`, borderRadius: 6, color: T.text, padding: '5px 7px' }}
                />
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 9, color: T.dim, marginTop: 10 }}>
          El detalle campaña por campaña (gasto real, CPM, clicks) se carga en la pestaña Anuncios.
        </div>
      </Card>

      {/* Landing */}
      <Card>
        <SLabel>Landing page</SLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Input value={strategy.landing_url} onChange={e => set({ landing_url: e.target.value })} placeholder="https://..." mono style={{ flex: 1 }} />
          {strategy.landing_url && (
            <a href={strategy.landing_url} target="_blank" rel="noreferrer">
              <Btn size="sm" variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                <ExternalLink size={12} /> Abrir
              </Btn>
            </a>
          )}
        </div>
        <div style={{ fontSize: 9, color: T.dim, marginBottom: 8 }}>
          No conectamos Google Analytics todavía — cargá visitas/conversiones a mano cuando las tengas.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Visitas (último dato)</div>
            <input
              type="number" min="0" value={strategy.landing_visits}
              onChange={e => set({ landing_visits: +e.target.value || 0 })}
              style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 10px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Conversiones</div>
            <input
              type="number" min="0" value={strategy.landing_conversions}
              onChange={e => set({ landing_conversions: +e.target.value || 0 })}
              style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 10px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <Input value={strategy.landing_notes} onChange={e => set({ landing_notes: e.target.value })} placeholder="Notas sobre la landing…" multiline rows={2} />
      </Card>

      {/* YouTube */}
      <Card>
        <SLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Play size={13} color={T.yt} /> YouTube</span></SLabel>
        {youtube ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 9, color: T.dim }}>Suscriptores</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{fmtNum(youtube.followers)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: T.dim }}>Views promedio</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{fmtNum(youtube.views_avg)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: T.dim }}>Estado</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: youtube.status === 'active' ? T.active : youtube.status === 'dead' ? T.dead : T.warn, textTransform: 'capitalize' }}>{youtube.status}</div>
            </div>
            {youtube.profile_url && (
              <a href={youtube.profile_url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto' }}>
                <Btn size="sm" variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ExternalLink size={12} /> Ver canal</Btn>
              </a>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: T.dim }}>Este cliente no tiene canal de YouTube cargado — agregalo desde la pestaña Plataformas.</div>
        )}
      </Card>

      {/* Notas generales */}
      <Card>
        <SLabel>Notas generales de estrategia</SLabel>
        <Input value={strategy.notes} onChange={e => set({ notes: e.target.value })} placeholder="Lineamientos, objetivos del trimestre, acuerdos con el cliente…" multiline rows={4} />
      </Card>
    </div>
  )
}
