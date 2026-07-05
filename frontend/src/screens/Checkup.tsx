import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../state'
import {
  fetchMockAa,
  fetchMockElectricity,
  fetchMockEpfo,
  fetchMockGst,
} from '../api'
import { Card, BucketChip } from '../components/ui'
import { VitalsGrid, ConfidenceBar } from '../components/Vitals'
import ScoreDial from '../components/ScoreDial'
import { prettySector } from '../lib/format'

type Phase = 'idle' | 'scanning' | 'done'
type SrcStatus = 'pending' | 'active' | 'done'

interface Src {
  key: string
  name: string
  icon: string
  status: SrcStatus
  detail: string
}

const SOURCE_DEFS: Omit<Src, 'status' | 'detail'>[] = [
  { key: 'gst', name: 'GSTN', icon: '🧾' },
  { key: 'aa', name: 'Account Aggregator', icon: '🏦' },
  { key: 'elec', name: 'Electricity Board', icon: '⚡' },
  { key: 'epfo', name: 'EPFO', icon: '👥' },
]

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const DEMO_TAG_TONE: Record<string, string> = {
  verma: 'text-rag-green bg-rag-green/12',
  gupta: 'text-rag-red bg-rag-red/12',
  nisha: 'text-rag-amber bg-rag-amber/12',
}

export default function Checkup() {
  const { demoApplicants, score, runScore, setScreen, error } = useApp()
  const [gstin, setGstin] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [sources, setSources] = useState<Src[]>(
    SOURCE_DEFS.map((s) => ({ ...s, status: 'pending', detail: '' })),
  )
  const [localErr, setLocalErr] = useState<string | null>(null)

  async function runCheckup(g: string) {
    const target = g.trim()
    if (!target) return
    setGstin(target)
    setLocalErr(null)
    setPhase('scanning')
    setSources(SOURCE_DEFS.map((s) => ({ ...s, status: 'active', detail: '' })))

    try {
      const [scoreRes, gst, aa, elec, epfo] = await Promise.all([
        runScore(target),
        fetchMockGst(target).catch(() => null),
        fetchMockAa(target).catch(() => null),
        fetchMockElectricity(target).catch(() => null),
        fetchMockEpfo(target).catch(() => null),
      ])
      void scoreRes
      const lastEpfo = epfo?.history?.[epfo.history.length - 1]
      const details = [
        gst ? `${gst.filing_count} monthly GST filings` : 'linked',
        aa ? `${aa.months}-mo statement · consent ${aa.consent_status}` : 'linked',
        elec ? `${elec.months} mo · ${elec.sanctioned_load_kw} kW load` : 'linked',
        lastEpfo ? `${lastEpfo.employee_count} employees on roll` : 'linked',
      ]
      for (let i = 0; i < SOURCE_DEFS.length; i++) {
        await wait(430)
        setSources((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: 'done', detail: details[i] } : s,
          ),
        )
      }
      await wait(350)
      setPhase('done')
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : String(e))
      setPhase('idle')
    }
  }

  function reset() {
    setPhase('idle')
    setSources(SOURCE_DEFS.map((s) => ({ ...s, status: 'pending', detail: '' })))
  }

  return (
    <div className="space-y-6">
      {/* Intro + input */}
      {phase === 'idle' && (
        <Card className="p-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold text-ink">
              Run a 90-second health checkup
            </h1>
            <p className="text-muted mt-1">
              Enter a GSTIN. AROGYA pulls GST, bank (Account Aggregator),
              electricity and EPFO signals, then scores five vitals into a
              unified health card — no balance sheet required.
            </p>
          </div>

          <form
            className="mt-5 flex gap-2 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault()
              runCheckup(gstin)
            }}
          >
            <input
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="Enter GSTIN e.g. 27AAACS0002Q1Z5"
              className="flex-1 border border-line rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            <button
              type="submit"
              className="bg-brand hover:bg-ink text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Run checkup
            </button>
          </form>

          {(localErr || error) && (
            <p className="text-rag-red text-sm mt-2">{localErr || error}</p>
          )}

          {/* Demo applicants */}
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
              Or run a scripted demo applicant
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {demoApplicants.map((a) => (
                <button
                  key={a.gstin}
                  onClick={() => runCheckup(a.gstin)}
                  className="text-left border border-line rounded-xl p-4 hover:border-brand hover:shadow-card transition-all bg-paper/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{a.name}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        DEMO_TAG_TONE[a.demo] ?? 'text-muted bg-muted/10'
                      }`}
                    >
                      {a.tag}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-1 font-mono">
                    {a.gstin}
                  </div>
                  <div className="text-xs text-brand mt-2 font-medium">
                    Run checkup →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Scanning */}
      {phase === 'scanning' && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-ink">
              Pulling alt-data sources…
            </h2>
            <p className="text-muted text-sm mt-1 font-mono">{gstin}</p>
          </div>
          <div className="max-w-xl mx-auto space-y-3">
            {sources.map((s, i) => (
              <SourceRow key={s.key} src={s} index={i} />
            ))}
          </div>
        </Card>
      )}

      {/* Done */}
      <AnimatePresence>
        {phase === 'done' && score && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-stretch">
                <div className="flex flex-col items-center justify-center">
                  <ScoreDial score={score.unified_score} bucket={score.bucket} />
                  <div className="mt-2">
                    <BucketChip bucket={score.bucket} size="lg" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-4 w-full">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-semibold text-ink">
                        {score.name}
                      </h2>
                      <span className="text-xs font-mono text-muted bg-paper border border-line rounded px-2 py-0.5">
                        {score.gstin}
                      </span>
                    </div>
                    <p className="text-muted text-sm mt-0.5">
                      {prettySector(score.sector)} · {score.city}, {score.state}
                    </p>
                  </div>

                  <div className="max-w-md">
                    <ConfidenceBar
                      confidence={score.confidence}
                      coverageMonths={score.coverage_months}
                      thinFile={score.thin_file}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {score.sources_called.map((s) => (
                      <span
                        key={s}
                        className="text-xs text-rag-green bg-rag-green/10 rounded-full px-2.5 py-1 font-medium"
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setScreen('triangle')}
                      className="text-sm font-medium text-white bg-brand hover:bg-ink px-4 py-2 rounded-lg transition-colors"
                    >
                      Verification Triangle →
                    </button>
                    <button
                      onClick={() => setScreen('cockpit')}
                      className="text-sm font-medium text-brand border border-brand/40 hover:bg-brand/5 px-4 py-2 rounded-lg transition-colors"
                    >
                      Underwriter cockpit
                    </button>
                    {score.thin_file && (
                      <button
                        onClick={() => setScreen('thinfile')}
                        className="text-sm font-medium text-rag-amber border border-rag-amber/40 hover:bg-rag-amber/5 px-4 py-2 rounded-lg transition-colors"
                      >
                        Thin-file prescription
                      </button>
                    )}
                    <button
                      onClick={reset}
                      className="text-sm font-medium text-muted hover:text-ink px-4 py-2 rounded-lg transition-colors"
                    >
                      Run another
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-ink font-semibold">
                  Five vitals
                  <span className="text-muted font-normal text-sm ml-2">
                    each 0–100
                  </span>
                </h3>
              </div>
              <VitalsGrid vitals={score.vitals} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SourceRow({ src, index }: { src: Src; index: number }) {
  const done = src.status === 'done'
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-3 border border-line rounded-xl px-4 py-3 bg-card"
    >
      <span className="text-xl w-7 text-center">{src.icon}</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-ink">{src.name}</div>
        <div className="text-xs text-muted h-4">
          {done ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-rag-green"
            >
              {src.detail}
            </motion.span>
          ) : (
            'requesting…'
          )}
        </div>
      </div>
      <div className="w-24">
        {done ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-end gap-1 text-rag-green text-sm font-medium"
          >
            <span className="w-5 h-5 rounded-full bg-rag-green text-white flex items-center justify-center text-xs">
              ✓
            </span>
            returned
          </motion.div>
        ) : (
          <div className="flex items-center justify-end gap-2 text-muted text-xs">
            <span className="inline-block w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            live
          </div>
        )}
      </div>
    </motion.div>
  )
}
