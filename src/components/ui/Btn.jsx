import { T, RADIUS, SHADOW } from '../../tokens'

const VARIANTS = {
  primary: { background: `linear-gradient(135deg,${T.primary},${T.violet})`, color: '#fff', border: 'none', boxShadow: SHADOW.xs },
  ghost:   { background: T.card, color: T.sub,   border: `1px solid ${T.border2}` },
  success: { background: T.green + '18', color: T.green, border: `1px solid ${T.green}35` },
  danger:  { background: T.red   + '18', color: T.red,   border: `1px solid ${T.red}35`   },
}
const SIZES = {
  sm: { padding: '5px 12px',  fontSize: 11, borderRadius: RADIUS.sm - 2 },
  md: { padding: '8px 16px',  fontSize: 12, borderRadius: RADIUS.sm },
  lg: { padding: '11px 22px', fontSize: 13, borderRadius: RADIUS.sm + 2 },
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, full, style: extra }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...VARIANTS[variant],
        ...SIZES[size],
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : undefined,
        transition: 'opacity .15s, transform .15s, box-shadow .15s',
        ...extra,
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {children}
    </button>
  )
}
