import { useRef, useState, useEffect } from 'react'
import { T } from '../../tokens'
import { fmtNum, fmtDate } from '../../utils/format'

export function LineChart({ data, color = T.primary, height = 160 }) {
  const ref = useRef(null)
  const [w, setW] = useState(500)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (!data?.length) return <div ref={ref} style={{ height }} />

  const vals  = data.map(d => d.followers_ig)
  const max   = Math.max(...vals)
  const min   = Math.min(...vals) * 0.95
  const range = max - min || 1
  const pad   = { l: 44, r: 16, t: 24, b: 28 }
  const iw    = w - pad.l - pad.r
  const ih    = height - pad.t - pad.b

  const px = i => pad.l + (i / (data.length - 1)) * iw
  const py = v => pad.t + ih - ((v - min) / range) * ih

  const pts  = data.map((d, i) => `${px(i)},${py(d.followers_ig)}`).join(' ')
  const area = `${px(0)},${py(min)} ${pts} ${px(data.length - 1)},${py(min)}`
  const gid  = `lc${color.replace('#', '')}`

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width={w} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity=".25" />
            <stop offset="100%" stopColor={color} stopOpacity="0"   />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map(t => {
          const y = pad.t + ih * t
          const v = max - (max - min) * t
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fill={T.dim} fontSize="9"
                fontFamily="'JetBrains Mono',monospace">
                {fmtNum(v)}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <polygon points={area} fill={`url(#${gid})`} />

        {/* Line */}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots + milestone labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(d.followers_ig)} r="3.5" fill={color} />
            {d.milestone && (
              <>
                <line x1={px(i)} x2={px(i)} y1={py(d.followers_ig) - 8} y2={pad.t}
                  stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity=".5" />
                <text x={px(i)} y={pad.t - 4} textAnchor="middle" fill={color} fontSize="8"
                  fontFamily="'Space Grotesk',sans-serif">
                  {d.milestone.split(' ').slice(0, 3).join(' ')}
                </text>
              </>
            )}
            <text x={px(i)} y={height - 4} textAnchor="middle" fill={T.dim} fontSize="8"
              fontFamily="'Space Grotesk',sans-serif">
              {fmtDate(d.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
