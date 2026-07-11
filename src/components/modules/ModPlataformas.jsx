import { useState } from 'react'
import { Card, SLabel, MetricBig, Pulse, Btn } from '../ui'
import { T, PLATFORM_META } from '../../tokens'
import { fmtNum, fmtPct, fmtDate } from '../../utils/format'
import { downloadCSV } from '../../utils/download'

export function ModPlataformas({ client, notify }) {
  const [active, setActive] = useState('instagram')
  const p    = client.platforms[active]
  const meta = PLATFORM_META[active]

  const doDownload = () => {
    const rows = Object.entries(client.platforms).map(([k, v]) => ({
      Plataforma:      PLATFORM_META[k].label,
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

  const platformMetrics = [
    ['Seguidores',    fmtNum(p.followers),           meta.color],
    ['Posts totales', p.posts,                        T.sub],
    ['Reach %',       fmtPct(p.reach_pct),           p.reach_pct > 15 ? T.green : p.reach_pct > 8 ? T.orange : T.red],
    ['Engagement %',  fmtPct(p.engagement_pct),      p.engagement_pct > 5 ? T.green : p.engagement_pct > 2 ? T.orange : T.red],
    ['Views prom.',   fmtNum(p.views_avg),            T.cyan],
    ['Viral pico',    fmtNum(p.views_viral),          T.violet],
    ['Posts / sem',   p.freq_week,                    T.orange],
    ['Completado %',  fmtPct(p.completion_pct),       p.completion_pct > 60 ? T.green : T.orange],
  ]

  const clientVirals = client.virals.filter(v => v.platform === active)

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel accent={meta.color}>Diagnóstico por plataforma</SLabel>
        <Btn size="sm" variant="success" onClick={doDownload}>⬇ Todas las plataformas CSV</Btn>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(client.platforms).map(([key, pl]) => {
          const m   = PLATFORM_META[key]
          const sel = active === key
          return (
            <button key={key} onClick={() => setActive(key)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${sel ? m.color + '80' : T.border}`,
              background: sel ? m.color + '15' : T.surf,
              cursor: 'pointer', color: sel ? m.color : T.sub,
              fontWeight: sel ? 700 : 400, fontSize: 12, fontFamily: 'inherit',
            }}>
              {m.icon} {m.label}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: pl.status === 'active' ? T.active : pl.status === 'warn' ? T.warn : T.dead }} />
            </button>
          )
        })}
      </div>

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
            <div style={{ background: T.surf, borderRadius: 6, padding: '6px 12px', fontSize: 11, color: T.sub }}>
              📅 {p.freq_week} post{p.freq_week !== 1 ? 's' : ''} por semana
            </div>
            {p.video_dur > 0 && (
              <div style={{ background: T.surf, borderRadius: 6, padding: '6px 12px', fontSize: 11, color: T.sub }}>
                ⏱ {p.video_dur >= 60 ? Math.round(p.video_dur / 60) + ' min' : p.video_dur + ' seg'} duración prom.
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
                  <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{v.title}</div>
                  <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{fmtDate(v.date)} · {v.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: meta.color, fontFamily: "'JetBrains Mono',monospace" }}>{fmtNum(v.views)}</div>
                  <div style={{ fontSize: 9, color: T.dim }}>views</div>
                </div>
                {v.likes > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.pink, fontFamily: "'JetBrains Mono',monospace" }}>{fmtNum(v.likes)}</div>
                    <div style={{ fontSize: 9, color: T.dim }}>likes</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
