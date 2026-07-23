import { T, RADIUS } from '../../tokens'

function MiniSpark({ data, color, h = 28 }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const w = 80
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block', marginTop: 6, overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
    </svg>
  )
}

export function MetricBig({ label, value, sub, color = T.primary, sparkValues, icon: Icon }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: RADIUS.md, padding: '16px 18px', transition: 'border-color .15s' }}>
      {Icon && (
        <div style={{
          width: 32, height: 32, borderRadius: RADIUS.sm, background: T.surf2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        }}>
          <Icon size={15} color={T.sub} strokeWidth={2} />
        </div>
      )}
      <div style={{ fontSize: 25, fontWeight: 800, color: T.text, fontFamily: 'inherit', lineHeight: 1, letterSpacing: '-0.01em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: T.dim, marginTop: 6, fontWeight: 500 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
      {sparkValues && <MiniSpark data={sparkValues} color={color} />}
    </div>
  )
}
