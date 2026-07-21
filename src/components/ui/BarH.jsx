import { T } from '../../tokens'

export function BarH({ label, value, max, color, formatted }) {
  const pct = Math.min(((value || 0) / (max || 1)) * 100, 100)
  const display = formatted ?? (typeof value === 'number'
    ? value >= 1000 ? (value / 1000).toFixed(0) + 'K' : String(value)
    : value)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'inherit' }}>{display}</span>
      </div>
      <div style={{ height: 5, background: T.surf2, borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .6s ease' }} />
      </div>
    </div>
  )
}
