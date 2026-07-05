import { motion } from 'framer-motion'
import {
  confidenceHex,
  pct,
  strengthHex,
  vitalStrength,
} from '../lib/format'
import type { Vital } from '../types'

const VITAL_ICON: Record<string, string> = {
  'Turnover Pulse': '📈',
  'Cash-flow Discipline': '💧',
  'Compliance Hygiene': '🧾',
  'Operational Intensity': '⚙️',
  'Promoter Profile': '👤',
}

export function VitalCard({
  vital,
  index,
  animate = true,
}: {
  vital: Vital
  index: number
  animate?: boolean
}) {
  const strength = vitalStrength(vital.value)
  const color = strengthHex(strength)
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.45, ease: 'easeOut' }}
      className="bg-card border border-line rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg" aria-hidden>
          {VITAL_ICON[vital.name] ?? '•'}
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ background: `${color}1f`, color }}
        >
          {strength}
        </span>
      </div>
      <div className="mt-2 text-sm text-muted leading-tight h-9">{vital.name}</div>
      <div className="flex items-end gap-1 mt-1">
        <span className="text-2xl font-bold text-ink tabular-nums">
          {vital.value.toFixed(0)}
        </span>
        <span className="text-muted text-xs mb-1">/100</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-line overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={animate ? { width: 0 } : { width: `${vital.value}%` }}
          animate={{ width: `${vital.value}%` }}
          transition={{ delay: index * 0.12 + 0.15, duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

export function VitalsGrid({
  vitals,
  animate = true,
}: {
  vitals: Vital[]
  animate?: boolean
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {vitals.map((v, i) => (
        <VitalCard key={v.name} vital={v} index={i} animate={animate} />
      ))}
    </div>
  )
}

export function ConfidenceBar({
  confidence,
  coverageMonths,
  thinFile,
}: {
  confidence: number
  coverageMonths?: number
  thinFile?: boolean
}) {
  const color = confidenceHex(confidence)
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Confidence</span>
        <span className="font-semibold tabular-nums" style={{ color }}>
          {pct(confidence)}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-line overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${confidence * 100}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      {(coverageMonths != null || thinFile) && (
        <div className="mt-1.5 text-xs text-muted">
          {coverageMonths != null && <>{coverageMonths} months of data coverage</>}
          {thinFile && (
            <span className="text-rag-amber font-medium"> · thin file</span>
          )}
        </div>
      )}
    </div>
  )
}
