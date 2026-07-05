import { useApp, type ScreenId } from './state'
import { BucketChip } from './components/ui'
import { pct } from './lib/format'
import Checkup from './screens/Checkup'
import TriangleScreen from './screens/Triangle'
import ThinFile from './screens/ThinFile'
import Cluster from './screens/Cluster'
import Cockpit from './screens/Cockpit'

const NAV: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'checkup', label: 'Checkup', icon: '🩺' },
  { id: 'triangle', label: 'Verification Triangle', icon: '📐' },
  { id: 'thinfile', label: 'Thin File', icon: '📄' },
  { id: 'cluster', label: 'Cluster View', icon: '📊' },
  { id: 'cockpit', label: 'Underwriter Cockpit', icon: '🧑‍⚖️' },
]

function TopBar() {
  const { score } = useApp()
  return (
    <header className="bg-ink text-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal/90 flex items-center justify-center text-lg font-bold">
            A
          </div>
          <div>
            <div className="font-semibold tracking-tight leading-none">
              AROGYA CARD
            </div>
            <div className="text-[11px] text-white/60 mt-0.5">
              90-second alt-data health checkup for balance-sheet-less MSMEs
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <KpiChip label="Data sources" value="4 live" />
          {score ? (
            <>
              <KpiChip label="Applicant" value={score.name} />
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                <span className="text-[11px] text-white/60">Score</span>
                <span className="font-semibold tabular-nums">
                  {score.unified_score}
                </span>
                <BucketChip bucket={score.bucket} size="sm" />
                <span className="text-[11px] text-white/60 ml-1">
                  conf {pct(score.confidence)}
                </span>
              </div>
            </>
          ) : (
            <KpiChip label="Status" value="Awaiting GSTIN" />
          )}
        </div>
      </div>
    </header>
  )
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-lg px-3 py-1.5 leading-tight">
      <div className="text-[10px] text-white/55 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function Nav() {
  const { screen, setScreen, score } = useApp()
  return (
    <nav className="bg-card border-b border-line sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {NAV.map((n) => {
          const active = screen === n.id
          const locked = n.id !== 'checkup' && !score
          return (
            <button
              key={n.id}
              disabled={locked}
              onClick={() => setScreen(n.id)}
              className={[
                'relative px-4 py-3 text-sm whitespace-nowrap transition-colors',
                active
                  ? 'text-brand font-semibold'
                  : locked
                    ? 'text-muted/40 cursor-not-allowed'
                    : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              <span className="mr-1.5">{n.icon}</span>
              {n.label}
              {active && (
                <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-brand rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function App() {
  const { screen } = useApp()
  return (
    <div className="min-h-full flex flex-col bg-paper">
      <TopBar />
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
        {screen === 'checkup' && <Checkup />}
        {screen === 'triangle' && <TriangleScreen />}
        {screen === 'thinfile' && <ThinFile />}
        {screen === 'cluster' && <Cluster />}
        {screen === 'cockpit' && <Cockpit />}
      </main>
      <footer className="text-center text-xs text-muted py-4">
        AROGYA CARD · IDBI Innovate 2026 · Track 3 — MSME Financial Health Score ·
        synthetic data, mock data-source APIs
      </footer>
    </div>
  )
}
