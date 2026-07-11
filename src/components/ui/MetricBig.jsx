import { T } from '../../tokens'

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

export function MetricBig({ label, value, sub, color = T.blue, sparkValues }) {
  return (
    <div style={{ background: T.surf, borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 4 }}>{sub}</div>}
      {sparkValues && <MiniSpark data={sparkValues} color={color} />}
    </div>
  )
}
