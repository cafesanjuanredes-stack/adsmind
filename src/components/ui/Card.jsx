import { T } from '../../tokens'

export function Card({ children, accent, style: extra }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
      ...extra,
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg,${accent},transparent)`,
        }} />
      )}
      {children}
    </div>
  )
}
