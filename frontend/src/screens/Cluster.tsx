import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useApp } from '../state'
import { fetchCluster } from '../api'
import { Card, EmptyState, Pill } from '../components/ui'
import { prettySector, strengthHex, vitalStrength } from '../lib/format'
import type { ClusterResponse } from '../types'

const SHORT: Record<string, string> = {
  'Turnover Pulse': 'Turnover',
  'Cash-flow Discipline': 'Cash-flow',
  'Compliance Hygiene': 'Compliance',
  'Operational Intensity': 'Operations',
  'Promoter Profile': 'Promoter',
}

interface Row {
  key: string
  full: string
  you: number
  p25: number
  p50: number
  p75: number
  spread: [number, number]
}

function percentileLabel(you: number, r: Row): string {
  if (you >= r.p75) return 'top quartile'
  if (you >= r.p50) return 'above median'
  if (you >= r.p25) return 'below median'
  return 'bottom quartile'
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const r: Row = payload[0].payload
  return (
    <div className="bg-card border border-line rounded-lg shadow-card px-3 py-2 text-xs">
      <div className="font-semibold text-ink mb-1">{r.full}</div>
      <div className="text-brand font-medium">You: {r.you.toFixed(0)}</div>
      <div className="text-muted">Peer median (p50): {r.p50.toFixed(0)}</div>
      <div className="text-muted">
        Peer range (p25–p75): {r.p25.toFixed(0)}–{r.p75.toFixed(0)}
      </div>
      <div className="text-ink mt-1">{percentileLabel(r.you, r)}</div>
    </div>
  )
}

export default function Cluster() {
  const { score } = useApp()
  const [data, setData] = useState<ClusterResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!score) return
    let cancelled = false
    setLoading(true)
    setErr(null)
    fetchCluster(score.sector, score.city)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [score])

  if (!score)
    return (
      <EmptyState title="No applicant loaded" hint="Run a checkup first." />
    )

  const rows: Row[] = data
    ? score.vitals.map((v) => {
        const p = data.percentiles[v.name] ?? { p25: 0, p50: 0, p75: 0 }
        return {
          key: SHORT[v.name] ?? v.name,
          full: v.name,
          you: v.value,
          p25: p.p25,
          p50: p.p50,
          p75: p.p75,
          spread: [Math.max(0, p.p50 - p.p25), Math.max(0, p.p75 - p.p50)],
        }
      })
    : []

  const aboveMedian = rows.filter((r) => r.you >= r.p50).length

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-ink">Cluster view</h1>
            <p className="text-muted text-sm mt-1 max-w-xl">
              {score.name} benchmarked against{' '}
              <span className="font-medium text-ink">
                {prettySector(score.sector)}
              </span>{' '}
              peers in <span className="font-medium text-ink">{score.city}</span>.
              A vital is only weak if it lags the local cluster - not the whole
              country.
            </p>
          </div>
          {data && (
            <div className="flex flex-col items-end gap-2">
              <Pill tone="brand">{data.peer_count} peers in cluster</Pill>
              <Pill tone={aboveMedian >= 3 ? 'green' : 'amber'}>
                {aboveMedian}/{rows.length} vitals ≥ peer median
              </Pill>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        {loading && (
          <div className="flex items-center gap-3 text-muted py-16 justify-center">
            <span className="inline-block w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            Loading peer distribution…
          </div>
        )}
        {err && <p className="text-rag-red text-sm py-8 text-center">{err}</p>}
        {data && !loading && (
          <>
            <div className="flex items-center gap-4 mb-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-brand inline-block" />
                {score.name}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#B9C4D8] inline-block" />
                Peer median (p50)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-muted inline-block" />
                p25–p75 range
              </span>
            </div>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <BarChart
                  data={rows}
                  margin={{ top: 10, right: 12, bottom: 4, left: -12 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" vertical={false} />
                  <XAxis
                    dataKey="key"
                    tick={{ fill: '#5B6B85', fontSize: 12 }}
                    axisLine={{ stroke: '#E3E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#5B6B85', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0B3D9108' }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    payload={
                      [
                        { value: score.name, type: 'square', id: 'you', color: '#0B3D91' },
                        {
                          value: 'Peer median',
                          type: 'square',
                          id: 'p50',
                          color: '#B9C4D8',
                        },
                      ] as any
                    }
                  />
                  <Bar dataKey="you" name={score.name} radius={[4, 4, 0, 0]}>
                    {rows.map((r) => (
                      <Cell
                        key={r.key}
                        fill={strengthHex(vitalStrength(r.you))}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="p50"
                    name="Peer median"
                    fill="#B9C4D8"
                    radius={[4, 4, 0, 0]}
                  >
                    <ErrorBar
                      dataKey="spread"
                      width={5}
                      strokeWidth={1.5}
                      stroke="#5B6B85"
                      direction="y"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* per-vital detail */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
              {rows.map((r) => {
                const color = strengthHex(vitalStrength(r.you))
                return (
                  <div
                    key={r.key}
                    className="border border-line rounded-xl p-3"
                  >
                    <div className="text-xs text-muted leading-tight h-8">
                      {r.full}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span
                        className="text-xl font-bold tabular-nums"
                        style={{ color }}
                      >
                        {r.you.toFixed(0)}
                      </span>
                      <span className="text-xs text-muted">
                        vs {r.p50.toFixed(0)} med
                      </span>
                    </div>
                    <div className="text-[11px] font-medium mt-0.5" style={{ color }}>
                      {percentileLabel(r.you, r)}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
