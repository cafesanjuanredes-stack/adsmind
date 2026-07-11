import { T } from '../../tokens'

export function Tag({ children, color = T.blue }) {
  return (
    <span style={{
      background: color + '20',
      border: `1px solid ${color}40`,
      color,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
