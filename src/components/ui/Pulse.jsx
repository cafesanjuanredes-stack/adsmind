import { T } from '../../tokens'

const STATUS = {
  active: { color: T.active, label: 'Activo',    anim: 'pulse-active 1.4s ease-in-out infinite' },
  warn:   { color: T.warn,   label: 'Irregular', anim: 'pulse-warn 2.8s ease-in-out infinite' },
  dead:   { color: T.dead,   label: 'Dormido',   anim: 'none' },
}

export function Pulse({ status }) {
  const s = STATUS[status] || STATUS.warn
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: s.color,
        animation: s.anim,
        display: 'inline-block',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, color: s.color, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {s.label}
      </span>
    </span>
  )
}
