import { T, RADIUS } from '../../tokens'

export function Tag({ children, color = T.primary }) {
  return (
    <span style={{
      background: color + '18',
      border: `1px solid ${color}35`,
      color,
      borderRadius: RADIUS.pill,
      padding: '3px 10px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
