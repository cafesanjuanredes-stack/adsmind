import { useState, useEffect, useCallback } from 'react'
import { Card, SLabel, Btn, Input, Sel, MetricBig } from '../ui'
import { T, PLATFORM_META } from '../../tokens'
import { fmtNum } from '../../utils/format'
import { listAds, createAd, deleteAd } from '../../lib/ads'
import { Plus, X, DollarSign, Eye, MousePointerClick, Target, Search } from 'lucide-react'

// Canales de pauta — no es lo mismo que PLATFORM_META (redes orgánicas):
// acá sumamos Google Ads, que no es una red donde se publica contenido.
const AD_PLATFORMS = {
  ...PLATFORM_META,
  google: { label: 'Google Ads', color: T.ga, icon: Search, short: 'GAds' },
}

const EMPTY_FORM = {
  platform: 'instagram', name: '', objective: '', startDate: '', endDate: '',
  spend: '', reach: '', clicks: '', conversions: '', notes: '',
}

function money(n) {
  return '$' + fmtNum(Math.round(n || 0))
}

export function ModAnuncios({ client, notify }) {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAds(await listAds(client.id))
    } catch (err) {
      notify('Error cargando anuncios: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [client.id, notify])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name || !form.platform) return
    setSaving(true)
    try {
      await createAd({
        clientId: client.id,
        platform: form.platform,
        name: form.name,
        objective: form.objective,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        spend: +form.spend || 0,
        reach: +form.reach || 0,
        clicks: +form.clicks || 0,
        conversions: +form.conversions || 0,
        notes: form.notes,
      })
      setForm(EMPTY_FORM)
      setShowAdd(false)
      notify('Campaña agregada')
      load()
    } catch (err) {
      notify('Error guardando: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const del = async (ad) => {
    try {
      await deleteAd(ad.id)
      notify('Campaña eliminada')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const totalSpend = ads.reduce((s, a) => s + Number(a.spend || 0), 0)
  const totalReach = ads.reduce((s, a) => s + Number(a.reach || 0), 0)
  const totalClicks = ads.reduce((s, a) => s + Number(a.clicks || 0), 0)
  const totalConversions = ads.reduce((s, a) => s + Number(a.conversions || 0), 0)
  const avgCpm = totalReach ? (totalSpend / totalReach) * 1000 : 0
  const avgCtr = totalReach ? (totalClicks / totalReach) * 100 : 0

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel accent={client.color}>Anuncios — {client.name}</SLabel>
        <Btn size="sm" variant="ghost" onClick={() => setShowAdd(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={12} /> Cargar campaña
        </Btn>
      </div>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
        <MetricBig icon={DollarSign} label="Gasto total" value={money(totalSpend)} sub={`${ads.length} campañas`} color={T.dim} />
        <MetricBig icon={Eye} label="Alcance acumulado" value={fmtNum(totalReach)} sub={`CPM prom. ${money(avgCpm)}`} color={T.dim} />
        <MetricBig icon={MousePointerClick} label="Clicks totales" value={fmtNum(totalClicks)} sub={`CTR prom. ${avgCtr.toFixed(2)}%`} color={T.dim} />
        <MetricBig icon={Target} label="Conversiones" value={fmtNum(totalConversions)} sub="resultados cargados" color={T.dim} />
      </div>

      {showAdd && (
        <Card>
          <SLabel>Nueva campaña</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Plataforma</div>
              <Sel value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                options={Object.entries(AD_PLATFORMS).map(([k, m]) => ({ v: k, l: m.label }))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Nombre de la campaña *</div>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Promo finde largo" />
            </div>
            <div>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Objetivo</div>
              <Input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} placeholder="Alcance, Tráfico, Conversiones…" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Desde</div>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, padding: '8px 10px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Hasta</div>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, padding: '8px 10px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Gasto ($)</div><Input value={form.spend} onChange={e => setForm(f => ({ ...f, spend: e.target.value }))} placeholder="50000" mono /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Alcance</div><Input value={form.reach} onChange={e => setForm(f => ({ ...f, reach: e.target.value }))} placeholder="80000" mono /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Clicks</div><Input value={form.clicks} onChange={e => setForm(f => ({ ...f, clicks: e.target.value }))} placeholder="1200" mono /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Conversiones</div><Input value={form.conversions} onChange={e => setForm(f => ({ ...f, conversions: e.target.value }))} placeholder="35" mono /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Notas</div>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones de la campaña…" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={save} disabled={!form.name || saving}>{saving ? 'Guardando…' : 'Guardar'}</Btn>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM) }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Campaña', 'Red', 'Objetivo', 'Gasto', 'Alcance', 'CPM', 'Clicks', 'CTR', 'Conv.', 'CPA', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${T.border}`, fontSize: 9, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.map((a, i) => {
                const meta = AD_PLATFORMS[a.platform]
                const cpm = a.reach ? (a.spend / a.reach) * 1000 : 0
                const ctr = a.reach ? (a.clicks / a.reach) * 100 : 0
                const cpa = a.conversions ? a.spend / a.conversions : 0
                return (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? T.surf + '40' : 'transparent' }}>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.text }}>
                      {a.name}
                      {a.notes && <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{a.notes}</div>}
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}` }}>
                      {meta && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: meta.color, fontWeight: 700 }}><meta.icon size={11} /> {meta.short}</span>}
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.sub, fontSize: 11 }}>{a.objective || '—'}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: T.text }}>{money(a.spend)}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.text }}>{fmtNum(a.reach)}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.dim }}>{money(cpm)}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.text }}>{fmtNum(a.clicks)}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.dim }}>{ctr.toFixed(2)}%</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.text }}>{fmtNum(a.conversions)}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, color: T.dim }}>{a.conversions ? money(cpa) : '—'}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${T.border}` }}>
                      <Btn size="sm" variant="danger" onClick={() => del(a)}><X size={12} /></Btn>
                    </td>
                  </tr>
                )
              })}
              {!loading && !ads.length && (
                <tr><td colSpan={11} style={{ padding: 16, textAlign: 'center', color: T.dim, fontSize: 11 }}>Todavía no cargaste campañas de este cliente.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
