import { Card, SLabel, MetricBig, Pulse } from '../ui'
import { T, PLATFORM_META } from '../../tokens'
import { fmtNum, fmtPct } from '../../utils/format'
import { downloadTXT, buildClientReport } from '../../utils/download'
import { Btn } from '../ui/Btn'
import { Download } from 'lucide-react'

function spark(base) {
  return Array.from({ length: 10 }, (_, i) => base * (0.85 + Math.random() * 0.3) * (1 + i * 0.02))
}

export function ModResumen({ client, notify }) {
  const platformList    = Object.values(client.platforms)
  const totalPlatforms  = platformList.length
  const totalFollowers  = platformList.reduce((s, p) => s + p.followers, 0)
  const avgEngagement   = (platformList.reduce((s, p) => s + p.engagement_pct, 0) / Math.max(1, totalPlatforms)).toFixed(1)
  const activeCount     = platformList.filter(p => p.status === 'active').length

  const doDownload = () => {
    const txt = buildClientReport(client, { fmtNum, fmtPct, fmtDate: s => s, PLATFORM_META })
    downloadTXT(txt, `resumen_${client.name.replace(/\s/g, '_')}.txt`)
    notify('Resumen descargado')
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SLabel accent={client.color}>Resumen ejecutivo</SLabel>
        <Btn size="sm" variant="success" onClick={doDownload} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={12} /> Descargar TXT</Btn>
      </div>

      {/* Global KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 10 }}>
        <MetricBig label="Total seguidores"   value={fmtNum(totalFollowers)}  sub="todas las plataformas"    color={client.color}                          sparkValues={spark(totalFollowers)} />
        <MetricBig label="Engagement prom."   value={avgEngagement + '%'}     sub={avgEngagement > 5 ? '↑ Excelente' : '↗ Bueno'} color={avgEngagement > 5 ? T.green : T.dim} sparkValues={spark(+avgEngagement)} />
        <MetricBig label="Canales activos"    value={`${activeCount} / ${totalPlatforms}`} sub="con publicación regular"  color={totalPlatforms && activeCount >= totalPlatforms - 1 ? T.green : T.warn} />
        <MetricBig label="Sentimiento +"      value={client.sentiment.positive + '%'} sub="comentarios positivos" color={T.green}                         sparkValues={spark(client.sentiment.positive)} />
        <MetricBig label="Posts virales"      value={client.virals.length}    sub="registrados en la cuenta" color={T.dim}                              />
        <MetricBig label="Competidores"       value={client.competitors.length} sub="cargados en benchmark"  color={T.dim}                                 />
      </div>

      {/* Platform cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))', gap: 12 }}>
        {Object.entries(client.platforms).map(([key, p]) => {
          const meta = PLATFORM_META[key]
          return (
            <Card key={key} accent={meta.color}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: meta.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                    <meta.icon size={12} strokeWidth={2.25} /> {meta.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: 'inherit', lineHeight: 1 }}>
                    {fmtNum(p.followers)}
                  </div>
                </div>
                <Pulse status={p.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                {[
                  ['Reach',      fmtPct(p.reach_pct)],
                  ['Engagement', fmtPct(p.engagement_pct)],
                  ['Views prom.', fmtNum(p.views_avg)],
                  ['Viral pico', fmtNum(p.views_viral)],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: T.surf2, borderRadius: 5, padding: '6px 8px' }}>
                    <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'inherit' }}>{v}</div>
                  </div>
                ))}
              </div>

              {p.notes && (
                <div style={{ fontSize: 10, color: T.dim, lineHeight: 1.5, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                  {p.notes}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Sentiment */}
      <Card>
        <SLabel>Sentimiento de audiencia</SLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Positivo 😊', client.sentiment.positive, T.green],
            ['Neutral 😐',  client.sentiment.neutral,  T.primary],
            ['Negativo 😞', client.sentiment.negative, T.red],
          ].map(([l, v, c]) => (
            <div key={l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: T.sub }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c, fontFamily: 'inherit' }}>{v}%</span>
              </div>
              <div style={{ height: 5, background: T.surf2, borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${v}%`, background: c, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
