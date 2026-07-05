import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useState } from 'react'
import { bucketHex } from '../lib/format'
import type { Bucket } from '../types'

interface Props {
  score: number // 0..1000
  bucket: Bucket | string
  size?: number
  animateIn?: boolean
}

// A 270deg gauge dial for the unified 0-1000 score.
export default function ScoreDial({
  score,
  bucket,
  size = 220,
  animateIn = true,
}: Props) {
  const stroke = 14
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const START = 135 // degrees
  const SWEEP = 270
  const circumference = 2 * Math.PI * r
  const arcLen = (SWEEP / 360) * circumference

  const color = bucketHex(bucket)
  const target = Math.max(0, Math.min(1000, score)) / 1000

  const progress = useMotionValue(animateIn ? 0 : target)
  const [display, setDisplay] = useState(animateIn ? 0 : score)
  const dashOffset = useTransform(progress, (p) => arcLen * (1 - p))

  useEffect(() => {
    const controls = animate(progress, target, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v * 1000)),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  // gauge band ticks: NO-GO < 450, REFER 450-699, GO >= 700
  const bandColor = (v: number) => bucketHex(v < 450 ? 'NO-GO' : v < 700 ? 'REFER' : 'GO')

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={1000}
      aria-valuenow={score}
    >
      <svg width={size} height={size} className="-rotate-0">
        <g transform={`rotate(${START} ${cx} ${cy})`}>
          {/* track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#E9EEF6"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${circumference}`}
          />
          {/* band segments (subtle) */}
          {[0, 450, 700].map((from, i) => {
            const to = [450, 700, 1000][i]
            const segStart = (from / 1000) * arcLen
            const segLen = ((to - from) / 1000) * arcLen
            return (
              <circle
                key={from}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={bandColor(from)}
                strokeOpacity={0.18}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(0, segLen - 3)} ${circumference}`}
                strokeDashoffset={-segStart}
              />
            )
          })}
          {/* value arc */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${circumference}`}
            style={{ strokeDashoffset: dashOffset }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-ink tabular-nums leading-none">
          {display}
        </div>
        <div className="text-muted text-xs mt-1 tracking-wide">/ 1000</div>
        <div className="text-[11px] mt-2 font-semibold" style={{ color }}>
          {bucket}
        </div>
      </div>
    </div>
  )
}
