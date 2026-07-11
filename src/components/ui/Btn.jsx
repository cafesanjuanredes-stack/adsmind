import { T } from '../../tokens'

const VARIANTS = {
  primary: { background: `linear-gradient(135deg,${T.blue},${T.violet})`, color: '#fff', border: 'none' },
  ghost:   { background: 'transparent', color: T.sub,   border: `1px solid ${T.border2}` },
  success: { background: T.green + '20', color: T.green, border: `1px solid ${T.green}40` },
  danger:  { background: T.red   + '20', color: T.red,   border: `1px solid ${T.red}40`   },
}
const SIZES = {
  sm: { padding: '4px 10px',  fontSize: 11 },
  md: { padding: '7px 14px',  fontSize: 12 },
  lg: { padding: '10px 20px', fontSize: 13 },
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, full, style: extra }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...VARIANTS[variant],
        ...SIZES[size],
        borderRadius: 7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : undefined,
        transition: 'opacity .15s',
        ...extra,
      }}
    >
      {children}
    </button>
  )
}
