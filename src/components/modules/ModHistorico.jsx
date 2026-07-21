import { useState } from 'react'
import { Card, SLabel, MetricBig, Btn, Input, Sel } from '../ui'
import { T } from '../../tokens'
import { fmtNum, fmtDate, calcGrowth } from '../../utils/format'
import { downloadCSV } from '../../utils/download'
import { LineChart } from '../charts/LineChart'
import { Plus, Download } from 'lucide-react'

export function ModHistorico({ client, notify, addHistoryPoint }) {
  const [history, setHistory]   = useState(client.history)
  const [fromIdx, setFromIdx]   = useState(0)
  const [toIdx,   setToIdx]     = useState(client.history.length - 1)
  const [showAdd, setShowAdd]   = useState(false)
  const [form,    setForm]      = useState({ date: '', followers_ig: '', milestone: '' })

  const slice      = history.slice(fromIdx, toIdx + 1)
  const first      = slice[0]
  const last       = slice[slice.length - 1]
  const growth     = slice.length > 1 ? last.followers_ig - first.followers_ig : 0
  const growthPct  = slice.length > 1 ? calcGrowth(first.followers_ig, last.followers_ig) : '—'
  const weeks      = Math.max(1, (toIdx - fromIdx) * 4)
  const weeklySpd  = slice.length > 1 ? Math.round(growth / weeks) : 0
  const bestMonth  = slice.reduce((best, h) => h.followers_ig > (best?.followers_ig ?? 0) ? h : best, null)

  const savePoint = () => {
    if (!form.date || !form.followers_ig) return
    const pt = { date: form.date, followers_ig: +form.followers_ig, milestone: form.milestone }
    const updated = [...history, pt].sort((a, b) => a.date.localeCompare(b.date))
    setHistory(updated)
    setToIdx(updated.length - 1)
    addHistoryPoint(client.id, pt).catch(err => notify('Error guardando: ' + err.message))
    setForm({ date: '', followers_ig: '', milestone: '' })
    setShowAdd(false)
    notify('Punto histórico agregado')
  }

  const doDownload = () => {
    downloadCSV(
      history.map(h => ({ Fecha: h.date, Seguidores_IG: h.followers_ig, Hito: h.milestone || '' })),
      `historico_${client.name.replace(/\s/g, '_')}.csv`
    )
    notify('Histórico descargado como CSV')
  }

  const dateOptions = history.map((h, i) => ({ v: i, l: fmtDate(h.date) }))

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel accent={T.orange}>Crecimiento histórico — Instagram</SLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" variant="ghost" onClick={() => setShowAdd(!showAdd)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} /> Agregar punto</Btn>
          <Btn size="sm" variant="success" onClick={doDownload} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Download size={12} /> CSV</Btn>
        </div>
      </div>

      {/* Add point form */}
      {showAdd && (
        <Card accent={T.primary}>
          <SLabel accent={T.primary}>Nuevo punto histórico</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Fecha (AAAA-MM) *</div>
              <Input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="2024-06" mono />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Seguidores IG *</div>
              <Input value={form.followers_ig} onChange={e => setForm(p => ({ ...p, followers_ig: e.target.value }))} placeholder="250000" mono />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Hito / nota (opcional)</div>
              <Input value={form.milestone} onChange={e => setForm(p => ({ ...p, milestone: e.target.value }))} placeholder="Ej: Viral del reel de pastas" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={savePoint} disabled={!form.date || !form.followers_ig}>Guardar</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {/* Range selector + chart */}
      <Card>
        <SLabel accent={T.orange}>Rango de análisis</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Desde</div>
            <Sel value={fromIdx} onChange={e => setFromIdx(+e.target.value)} options={dateOptions} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Hasta</div>
            <Sel value={toIdx} onChange={e => setToIdx(+e.target.value)} options={dateOptions} style={{ width: '100%' }} />
          </div>
        </div>
        <LineChart data={slice} color={client.color} height={160} />
      </Card>

      {/* Range KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 10 }}>
        <MetricBig label="Seguidores ganados" value={fmtNum(growth)}       sub="en el período seleccionado" color={growth >= 0 ? T.green : T.red} />
        <MetricBig label="Crecimiento %"      value={growthPct + '%'}      sub={`${fmtDate(first?.date)} → ${fmtDate(last?.date)}`} color={T.orange} />
        <MetricBig label="Velocidad"          value={fmtNum(weeklySpd) + '/sem'} sub="seguidores por semana prom." color={T.cyan} />
        <MetricBig label="Mejor momento"      value={fmtDate(bestMonth?.date)} sub={fmtNum(bestMonth?.followers_ig) + ' seg'} color={T.violet} />
      </div>

      {/* Full timeline */}
      <Card>
        <SLabel accent={T.violet}>Línea de tiempo completa</SLabel>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {history.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, fontFamily: 'inherit', minWidth: 70 }}>
                {fmtDate(h.date)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: 'inherit', minWidth: 65 }}>
                {fmtNum(h.followers_ig)}
              </div>
              <div style={{ fontSize: 11, color: T.dim, flex: 1 }}>{h.milestone || '—'}</div>
              {i > 0 && (
                <div style={{ fontSize: 11, color: T.green, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  +{fmtNum(h.followers_ig - history[i - 1].followers_ig)}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
