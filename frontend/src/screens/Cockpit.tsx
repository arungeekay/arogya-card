import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../state'
import { fetchAppraisalNote, fetchWhatIf } from '../api'
import { Card, EmptyState, BucketChip } from '../components/ui'
import DocumentModal from '../components/DocumentModal'
import {
  strengthHex,
  vitalStrength,
  bucketHex,
  prettySector,
} from '../lib/format'
import type { AppraisalNoteResponse, WhatIfResponse } from '../types'

function reasonTone(reason: string): { color: string; label: string } {
  if (/\(weak\)/i.test(reason)) return { color: '#E5484D', label: 'weak' }
  if (/\(moderate\)/i.test(reason)) return { color: '#E8A317', label: 'moderate' }
  if (/\(strong\)/i.test(reason)) return { color: '#2E9E5B', label: 'strong' }
  return { color: '#E5484D', label: 'alert' } // triangle hypothesis etc.
}

function bucketFor(score: number): string {
  if (score >= 700) return 'GO'
  if (score >= 450) return 'REFER'
  return 'NO-GO'
}

export default function Cockpit() {
  const { score } = useApp()

  // what-if
  const [margin, setMargin] = useState(0)
  const [smoothing, setSmoothing] = useState(0)
  const [whatif, setWhatif] = useState<WhatIfResponse | null>(null)
  const debounce = useRef<number>()

  // appraisal note modal
  const [modalOpen, setModalOpen] = useState(false)
  const [note, setNote] = useState<AppraisalNoteResponse | null>(null)
  const [noteLoading, setNoteLoading] = useState(false)

  useEffect(() => {
    // reset assumptions when applicant changes
    setMargin(0)
    setSmoothing(0)
    setWhatif(null)
    setNote(null)
  }, [score?.gstin])

  useEffect(() => {
    if (!score) return
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => {
      fetchWhatIf(score.gstin, margin, smoothing)
        .then(setWhatif)
        .catch((e) => console.warn('whatif failed', e))
    }, 220)
    return () => window.clearTimeout(debounce.current)
  }, [score, margin, smoothing])

  function openNote() {
    if (!score) return
    setModalOpen(true)
    if (note) return
    setNoteLoading(true)
    fetchAppraisalNote(score.gstin)
      .then(setNote)
      .catch((e) => console.warn('note failed', e))
      .finally(() => setNoteLoading(false))
  }

  const adjusted = whatif?.adjusted_score ?? score?.unified_score ?? 0
  const base = whatif?.base_score ?? score?.unified_score ?? 0
  const delta = whatif?.delta ?? 0
  const adjBucket = useMemo(() => bucketFor(adjusted), [adjusted])

  if (!score)
    return <EmptyState title="No applicant loaded" hint="Run a checkup first." />

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              Underwriter cockpit
            </h1>
            <p className="text-muted text-sm mt-1">
              {score.name} · {prettySector(score.sector)} · {score.city} -
              reason codes, auditable factors, scenario testing and a drafted
              appraisal note.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-ink tabular-nums">
                {score.unified_score}
              </div>
              <div className="text-xs text-muted">/ 1000</div>
            </div>
            <BucketChip bucket={score.bucket} size="lg" />
            <button
              onClick={openNote}
              className="bg-brand hover:bg-ink text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              📝 Draft appraisal note
            </button>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Reason codes */}
        <Card className="p-6">
          <h3 className="text-ink font-semibold mb-3">Reason codes</h3>
          <ul className="space-y-2">
            {score.reason_codes.map((r, i) => {
              const t = reasonTone(r)
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm bg-paper rounded-lg px-3 py-2"
                >
                  <span
                    className="mt-1 w-2 h-2 rounded-full shrink-0"
                    style={{ background: t.color }}
                  />
                  <span className="text-slate-700 leading-snug">{r}</span>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Auditor factor table */}
        <Card className="p-6">
          <h3 className="text-ink font-semibold mb-3">Auditor factor table</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                <th className="text-left font-medium py-2">Vital</th>
                <th className="text-right font-medium py-2">Score</th>
                <th className="text-left font-medium py-2 pl-4 w-[45%]">Band</th>
              </tr>
            </thead>
            <tbody>
              {score.vitals.map((v) => {
                const s = vitalStrength(v.value)
                const color = strengthHex(s)
                return (
                  <tr key={v.name} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 text-slate-700">{v.name}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-ink">
                      {v.value.toFixed(1)}
                    </td>
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${v.value}%`, background: color }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-medium w-16"
                          style={{ color }}
                        >
                          {s}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-3">
            Confidence {Math.round(score.confidence * 100)}% ·{' '}
            {score.coverage_months} months coverage · triangle{' '}
            {score.triangle.overall}
          </p>
        </Card>
      </div>

      {/* What-if */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-ink font-semibold">What-if scenario</h3>
            <p className="text-muted text-sm mt-0.5 max-w-xl">
              Apply the officer's own assumptions and recompute the unified score
              live. Sensitivity, not a promise.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <Slider
              label="Margin uplift"
              hint="Assume better realised margins on turnover"
              value={margin}
              min={0}
              max={0.3}
              step={0.01}
              format={(v) => `+${Math.round(v * 100)}%`}
              onChange={setMargin}
            />
            <Slider
              label="Seasonality smoothing"
              hint="Dampen seasonal cash-flow dips"
              value={smoothing}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={setSmoothing}
            />
          </div>

          <div className="flex items-center justify-center gap-6">
            <ScorePlate label="Base" value={base} bucket={score.bucket} muted />
            <motion.div
              className="text-2xl"
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              →
            </motion.div>
            <ScorePlate
              label="Adjusted"
              value={adjusted}
              bucket={adjBucket}
              delta={delta}
            />
          </div>
        </div>
        {whatif && (
          <p className="text-xs text-muted mt-4 pt-3 border-t border-line">
            {whatif.explanation}
          </p>
        )}
      </Card>

      <DocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={note?.document_type ?? 'Credit appraisal note'}
        subtitle={`${score.name} · ${score.gstin}`}
        text={note?.text ?? ''}
        prescription={note?.prescription}
        loading={noteLoading || !note}
      />
    </div>
  )
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="text-sm font-semibold text-brand tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full mt-2 accent-brand"
      />
      <p className="text-xs text-muted mt-1">{hint}</p>
    </div>
  )
}

function ScorePlate({
  label,
  value,
  bucket,
  delta,
  muted,
}: {
  label: string
  value: number
  bucket: string
  delta?: number
  muted?: boolean
}) {
  const color = muted ? '#5B6B85' : bucketHex(bucket)
  return (
    <div className="text-center">
      <div className="text-xs text-muted uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className="text-4xl font-bold tabular-nums"
        style={{ color: muted ? '#0A1F44' : color }}
      >
        {value}
      </div>
      <div className="mt-1">
        <BucketChip bucket={bucket} size="sm" />
      </div>
      {delta != null && delta !== 0 && (
        <div
          className="text-xs font-semibold mt-1"
          style={{ color: delta > 0 ? '#2E9E5B' : '#E5484D' }}
        >
          {delta > 0 ? '+' : ''}
          {delta} pts
        </div>
      )}
    </div>
  )
}
