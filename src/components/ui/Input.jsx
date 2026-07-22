import { T, RADIUS } from '../../tokens'

const BASE = {
  background: T.surf,
  border: `1px solid ${T.border2}`,
  borderRadius: RADIUS.sm - 2,
  padding: '9px 13px',
  fontSize: 12,
  color: T.text,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
}

export function Input({ value, onChange, placeholder, mono, multiline, rows = 3, style: extra }) {
  const style = { ...BASE, fontFamily: 'inherit', ...extra }
  return multiline
    ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{ ...style, color: T.sub }} />
    : <input    value={value} onChange={onChange} placeholder={placeholder} style={style} />
}
