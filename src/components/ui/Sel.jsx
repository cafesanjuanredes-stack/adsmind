import { T, RADIUS } from '../../tokens'

export function Sel({ value, onChange, options, style: extra }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        background: T.surf,
        border: `1px solid ${T.border2}`,
        borderRadius: RADIUS.sm - 2,
        padding: '8px 12px',
        fontSize: 12,
        color: T.text,
        outline: 'none',
        fontFamily: 'inherit',
        ...extra,
      }}
    >
      {options.map(o => (
        <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>
      ))}
    </select>
  )
}
