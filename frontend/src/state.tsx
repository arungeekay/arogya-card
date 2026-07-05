import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchDemoApplicants, fetchScore } from './api'
import type { DemoApplicant, ScoreResponse } from './types'

export type ScreenId = 'checkup' | 'triangle' | 'thinfile' | 'cluster' | 'cockpit'

interface AppState {
  demoApplicants: DemoApplicant[]
  score: ScoreResponse | null
  loading: boolean
  error: string | null
  screen: ScreenId
  setScreen: (s: ScreenId) => void
  // runScore returns the payload so callers (Checkup) can orchestrate reveal timing.
  runScore: (gstin: string) => Promise<ScoreResponse>
  clearScore: () => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [demoApplicants, setDemoApplicants] = useState<DemoApplicant[]>([])
  const [score, setScore] = useState<ScoreResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<ScreenId>('checkup')

  useEffect(() => {
    fetchDemoApplicants()
      .then((r) => setDemoApplicants(r.applicants))
      .catch((e) => console.warn('demo applicants failed', e))
  }, [])

  const runScore = useCallback(async (gstin: string) => {
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchScore(gstin)
      setScore(payload)
      return payload
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const clearScore = useCallback(() => setScore(null), [])

  const value = useMemo<AppState>(
    () => ({
      demoApplicants,
      score,
      loading,
      error,
      screen,
      setScreen,
      runScore,
      clearScore,
    }),
    [demoApplicants, score, loading, error, screen, runScore, clearScore],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
