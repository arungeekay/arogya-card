import { motion } from 'framer-motion'
import { useApp } from '../state'
import { Card, EmptyState, Pill } from '../components/ui'
import TriangleViz from '../components/TriangleViz'
import { inr } from '../lib/format'
import type { TriangleSide } from '../types'

function growth(x: number): string {
  const p = Math.round(x * 100)
  return `${p >= 0 ? '+' : ''}${p}%`
}

function SideCard({ side }: { side: TriangleSide }) {
  const broken = side.verdict !== 'consistent'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${
        broken
          ? 'border-rag-red/40 bg-rag-red/5'
          : 'border-line bg-card'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-ink text-sm">{side.pair}</span>
        {broken ? (
          <Pill tone="red">⚡ anomaly</Pill>
        ) : (
          <Pill tone="green">✓ consistent</Pill>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="GST growth" value={growth(side.gst_growth)} />
        <Stat label={side.corroborant} value={growth(side.corroborant_growth)} />
        <Stat
          label="Consistency"
          value={`${Math.round(side.consistency)}`}
          tone={broken ? 'red' : 'green'}
        />
      </div>
      {broken && side.hypothesis && (
        <div className="mt-3 text-sm text-rag-red bg-white border border-rag-red/30 rounded-lg p-3 leading-relaxed">
          <span className="font-semibold">Hypothesis: </span>
          {side.hypothesis}
        </div>
      )}
    </motion.div>
  )
}

function Stat({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: string
  tone?: 'ink' | 'red' | 'green'
}) {
  const color =
    tone === 'red' ? 'text-rag-red' : tone === 'green' ? 'text-rag-green' : 'text-ink'
  return (
    <div className="bg-paper rounded-lg py-2">
      <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-muted mt-0.5 leading-tight px-1">
        {label}
      </div>
    </div>
  )
}

export default function TriangleScreen() {
  const { score } = useApp()
  if (!score)
    return (
      <EmptyState
        title="No applicant loaded"
        hint="Run a checkup first to see the Verification Triangle."
      />
    )

  const tri = score.triangle
  const broken = tri.overall === 'broken'

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              Verification Triangle
            </h1>
            <p className="text-muted text-sm mt-1 max-w-xl">
              GST declarations are cross-checked against three independent,
              hard-to-fake sources. When declared turnover moves but the physical
              corroborants don't, a side breaks.
            </p>
          </div>
          <div
            className={`rounded-xl px-4 py-3 text-center ${
              broken ? 'bg-rag-red/10' : 'bg-rag-green/10'
            }`}
          >
            <div
              className={`text-sm font-semibold ${
                broken ? 'text-rag-red' : 'text-rag-green'
              }`}
            >
              {broken ? '⚠ Triangle broken' : '✓ Triangle closed'}
            </div>
            <div className="text-xs text-muted mt-0.5">{tri.summary}</div>
          </div>
        </div>
      </Card>

      {score.exposure_at_risk > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-2xl border border-rag-red/40 bg-rag-red/10 px-5 py-4"
        >
          <span className="text-2xl" aria-hidden>
            🚩
          </span>
          <div className="flex-1">
            <div className="text-lg font-semibold text-rag-red">
              {inr(score.exposure_at_risk)} facility at risk — invoice-inflation
              pattern detected.
            </div>
            <div className="text-sm text-slate-700 mt-0.5">
              Verify before sanction. This is exposure the Verification Triangle
              is protecting.
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            {score.name} · {score.gstin}
          </div>
          <TriangleViz triangle={tri} />
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded bg-rag-green inline-block" />
              consistent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded bg-rag-red inline-block" />
              anomaly
            </span>
          </div>
        </Card>

        <div className="space-y-3">
          {tri.sides.map((s) => (
            <SideCard key={s.pair} side={s} />
          ))}
        </div>
      </div>
    </div>
  )
}
