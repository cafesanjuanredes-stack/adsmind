import { T, RADIUS, SHADOW } from '../../tokens'

export function Card({ children, accent, style: extra }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.md,
      boxShadow: SHADOW.sm,
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow .2s ease',
      ...extra,
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg,${accent},transparent)`,
        }} />
      )}
      {children}
    </div>
  )
}
