import { useState } from 'react'
import { Card, SLabel, Btn, Input, Sel, Tag, BarH } from '../ui'
import { T, COMPETITOR_TYPES } from '../../tokens'
import { fmtNum } from '../../utils/format'
import { downloadCSV } from '../../utils/download'

export function ModBenchmark({ client, notify, addCompetitor, removeCompetitor }) {
  const ig = client.platforms.instagram || { followers: 0, engagement_pct: 0 }
  const [comps,   setComps]   = useState(client.competitors)
  const [showAdd, setShowAdd] = useState(false)
  const [form,    setForm]    = useState({ name: '', handle: '', followers_ig: '', type: 'Cadena local', notes: '' })

  const save = () => {
    if (!form.name) return
    const c = { ...form, followers_ig: +form.followers_ig || 0 }
    setComps(prev => [...prev, c])
    addCompetitor(client.id, c).catch(err => notify('Error guardando: ' + err.message))
    setForm({ name: '', handle: '', followers_ig: '', type: 'Cadena local', notes: '' })
    setShowAdd(false)
    notify('Competidor agregado')
  }

  const del = (idx) => {
    setComps(prev => prev.filter((_, i) => i !== idx))
    removeCompetitor(client.id, idx).catch(err => notify('Error borrando: ' + err.message))
    notify('Competidor eliminado')
  }

  const doDownload = () => {
    downloadCSV([
      { Nombre: client.name, Handle: '', Seguidores_IG: ig.followers, Tipo: 'CLIENTE', Notas: '' },
      ...comps.map(c => ({ Nombre: c.name, Handle: c.handle, Seguidores_IG: c.followers_ig, Tipo: c.type, Notas: c.notes })),
    ], `benchmark_${client.name.replace(/\s/g, '_')}.csv`)
    notify('Benchmark descargado')
  }

  const allEntries = [
    { name: client.name, followers_ig: ig.followers, color: client.color, isClient: true },
    ...comps.map(c => ({ ...c, color: T.dim, isClient: false })),
  ]
  const maxFollowers = Math.max(...allEntries.map(e => e.followers_ig))

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel accent={T.orange}>Benchmark competitivo</SLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" variant="ghost" onClick={() => setShowAdd(!showAdd)}>+ Agregar competidor</Btn>
          <Btn size="sm" variant="success" onClick={doDownload}>⬇ CSV</Btn>
        </div>
      </div>

      {showAdd && (
        <Card accent={T.orange}>
          <SLabel accent={T.orange}>Nuevo competidor</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Nombre *</div><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Amazónico" /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Handle</div><Input value={form.handle} onChange={e => setForm(p => ({ ...p, handle: e.target.value }))} placeholder="@amazonico.restaurant" mono /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Seguidores IG</div><Input value={form.followers_ig} onChange={e => setForm(p => ({ ...p, followers_ig: e.target.value }))} placeholder="500000" mono /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 10 }}>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Tipo</div><Sel value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={COMPETITOR_TYPES} style={{ width: '100%' }} /></div>
            <div><div style={{ fontSize: 9, color: T.dim, marginBottom: 3 }}>Notas estratégicas</div><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones…" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={save} disabled={!form.name}>Guardar</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                {['Cuenta', 'Handle', 'Seguidores IG', 'Tipo', 'Notas', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 9, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Client row */}
              <tr style={{ background: client.color + '10' }}>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: client.color }}>★ {client.name}</td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.sub }}>—</td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 800, color: client.color }}>{fmtNum(ig.followers)}</td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}><Tag color={client.color}>CLIENTE</Tag></td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, color: T.dim }}>Engagement {ig.engagement_pct}%</td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}` }} />
              </tr>
              {comps.map((c, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? T.surf + '40' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, color: T.text }}>{c.name}</td>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.sub }}>{c.handle || '—'}</td>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: T.text }}>{fmtNum(c.followers_ig)}</td>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}><Tag color={T.dim}>{c.type}</Tag></td>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, color: T.dim, fontSize: 11 }}>{c.notes || '—'}</td>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>
                    <Btn size="sm" variant="danger" onClick={() => del(i)}>✕</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bar comparison */}
      <Card>
        <SLabel>Comparativa seguidores Instagram</SLabel>
        {allEntries.sort((a, b) => b.followers_ig - a.followers_ig).map((e, i) => (
          <BarH key={i} label={e.isClient ? `★ ${e.name}` : e.name}
            value={e.followers_ig} max={maxFollowers} color={e.color}
            formatted={fmtNum(e.followers_ig)} />
        ))}
      </Card>
    </div>
  )
}
