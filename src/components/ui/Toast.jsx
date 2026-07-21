import { useEffect } from 'react'
import { T } from '../../tokens'
import { Check } from 'lucide-react'

export function Toast({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', alignItems: 'center', gap: 7,
      background: T.green, color: '#fff',
      borderRadius: 8, padding: '10px 16px',
      fontSize: 12, fontWeight: 600,
      zIndex: 9999,
      boxShadow: `0 4px 20px ${T.green}40`,
      animation: 'slide-up .25s ease',
    }}>
      <Check size={14} /> {msg}
    </div>
  )
}
