import { T, RADIUS, SHADOW } from '../../tokens'

export function Card({ children, accent, style: extra }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.md,
      boxShadow: SHADOW.xs,
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow .2s ease',
      ...extra,
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 14, left: 0, width: 3, height: 18,
          borderRadius: '0 3px 3px 0', background: accent,
        }} />
      )}
      {children}
    </div>
  )
}
