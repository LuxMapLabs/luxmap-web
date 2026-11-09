import React, { useEffect, useState } from 'react'

type RingTone = 'primary' | 'muted' | 'warning' | 'danger'

interface GlassRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  tone?: RingTone
  children?: React.ReactNode
}

const RADIUS = 38
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const GlassRing: React.FC<GlassRingProps> = ({
  percent,
  size = 92,
  strokeWidth = 8,
  tone = 'primary',
  children,
}) => {
  // Vẽ vòng sau khi gắn vào DOM để có chuyển động mượt
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const safePercent = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0))
  const offset = ready ? CIRCUMFERENCE * (1 - safePercent / 100) : CIRCUMFERENCE

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth={strokeWidth} className="glass-ring-bg" />
        {safePercent > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={`glass-ring-fg glass-ring-${tone}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
