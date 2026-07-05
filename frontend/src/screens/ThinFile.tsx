import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../state'
import { fetchAppraisalNote } from '../api'
import { Card, BucketChip, EmptyState } from '../components/ui'
import { ConfidenceBar } from '../components/Vitals'
import { confidenceHex, inr, pct } from '../lib/format'

function parsePrescription(text: string) {
  const steps: string[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*-\s+(.*)$/)
    if (m) steps.push(m[1].trim())
  }
  const proj = text.match(/Projected confidence[^0-9]*([0-9.]+)\s*%/i)
  const projected = proj ? parseFloat(proj[1]) / 100 : null
  return { steps, projected }
}

export default function ThinFile() {
  const { score, demoApplicants, runScore } = useApp()
  const [prescription, setPrescription] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!score || !score.thin_file) {
      setPrescription(null)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchAppraisalNote(score.gstin)
      .then((r) => !cancelled && setPrescription(r.prescription))
      .catch((e) => console.warn('appraisal note failed', e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [score])

  const parsed = useMemo(
    () => (prescription ? parsePrescription(prescription) : null),
    [prescription],
  )

  if (!score)
    return (
      <EmptyState
        title="No applicant loaded"
        hint="Run a checkup first."
      />
    )

  const nisha = demoApplicants.find((a) => a.demo === 'nisha')

  if (!score.thin_file)
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <h1 className="text-xl font-semibold text-ink">Thin-file handling</h1>
          <p className="text-muted mt-1">
            <span className="font-medium text-ink">{score.name}</span> has{' '}
            {score.coverage_months} months of coverage and{' '}
            {pct(score.confidence)} confidence - this is not a thin file.
          </p>
          <p className="text-muted text-sm mt-3">
            AROGYA never issues an automatic NO-GO purely for missing data. Thin
            files are routed to REFER with a data-completeness prescription
            instead.
          </p>
          {nisha && (
            <button
              onClick={() => runScore(nisha.gstin)}
              className="mt-4 text-sm font-medium text-white bg-brand hover:bg-ink px-4 py-2 rounded-lg transition-colors"
            >
              Load thin-file demo: {nisha.name} →
            </button>
          )}
        </Card>
      </div>
    )

  const projColor = parsed?.projected ? confidenceHex(parsed.projected) : '#2E9E5B'

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              Thin file - refer, don't reject
            </h1>
            <p className="text-muted text-sm mt-1 max-w-xl">
              {score.name} filed only {score.coverage_months} months of history.
              The low score is driven by <span className="font-medium">data
              availability</span>, not adverse signals - so AROGYA returns REFER
              with a prescription, never an automatic NO-GO.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold text-ink tabular-nums">
                {score.unified_score}
              </div>
              <div className="text-xs text-muted">/ 1000</div>
            </div>
            <BucketChip bucket={score.bucket} size="lg" />
          </div>
        </div>
      </Card>

      {score.exposure_unlocked > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-2xl border border-teal/40 bg-teal/10 px-5 py-4"
        >
          <span className="text-2xl" aria-hidden>
            🔓
          </span>
          <div className="flex-1">
            <div className="text-lg font-semibold text-teal">
              {inr(score.exposure_unlocked)} in lending this alt-data checkup
              makes considerable.
            </div>
            <div className="text-sm text-slate-700 mt-0.5">
              A balance-sheet-only process would have rejected it outright.
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Confidence lift */}
        <Card className="p-6">
          <h3 className="text-ink font-semibold mb-4">Confidence lift</h3>
          <div className="space-y-5">
            <div>
              <div className="text-xs text-muted mb-1">Today</div>
              <ConfidenceBar
                confidence={score.confidence}
                coverageMonths={score.coverage_months}
                thinFile
              />
            </div>
            {parsed?.projected != null && (
              <div>
                <div className="text-xs text-muted mb-1">
                  Projected after prescription
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Confidence</span>
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: projColor }}
                  >
                    {pct(parsed.projected)}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 rounded-full bg-line overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: projColor }}
                    initial={{ width: `${score.confidence * 100}%` }}
                    animate={{ width: `${parsed.projected * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <div className="mt-2 text-sm font-medium" style={{ color: projColor }}>
                  {pct(score.confidence)} → {pct(parsed.projected)} confidence
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Prescription card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">💊</span>
            <h3 className="text-ink font-semibold">Data-completeness prescription</h3>
          </div>
          {loading && (
            <div className="flex items-center gap-3 text-muted py-6">
              <span className="inline-block w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              Generating prescription…
            </div>
          )}
          {!loading && parsed && (
            <>
              <ul className="space-y-2.5">
                {parsed.steps.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3 items-start bg-paper rounded-lg p-3"
                  >
                    <span className="w-6 h-6 shrink-0 rounded-full bg-teal/12 text-teal flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700">{s}</span>
                  </motion.li>
                ))}
              </ul>
              {prescription && (
                <p className="text-xs text-muted mt-4 pt-3 border-t border-line whitespace-pre-wrap">
                  {prescription.split('\n').slice(-1)[0]}
                </p>
              )}
            </>
          )}
          {!loading && !parsed && (
            <p className="text-muted text-sm">No prescription returned.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
