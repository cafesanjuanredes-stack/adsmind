import { T } from '../../tokens'

export function SLabel({ children, accent = T.primary, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 2, height: 14, background: accent, borderRadius: 1 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {children}
        </span>
      </div>
      {sub && <p style={{ margin: '3px 0 0 10px', fontSize: 11, color: T.dim }}>{sub}</p>}
    </div>
  )
}
