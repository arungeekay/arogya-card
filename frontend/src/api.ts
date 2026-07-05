// Typed fetch wrappers over the AROGYA backend. Dev proxy sends /api and /mock to :8002.
import type {
  ScoreResponse,
  DemoApplicantsResponse,
  ClusterResponse,
  WhatIfResponse,
  AppraisalNoteResponse,
  MockGst,
  MockAa,
  MockElectricity,
  MockEpfo,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`)
  }
  return (await res.json()) as T
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })

// --- Endpoints ---------------------------------------------------------------
export const fetchDemoApplicants = () =>
  get<DemoApplicantsResponse>('/api/demo-applicants')

export const fetchScore = (gstin: string) =>
  post<ScoreResponse>('/api/score', { gstin })

export const fetchCluster = (sector: string, city: string) =>
  get<ClusterResponse>(`/api/cluster/${encodeURIComponent(sector)}/${encodeURIComponent(city)}`)

export const fetchWhatIf = (
  gstin: string,
  margin_uplift: number,
  seasonality_smoothing: number,
) => post<WhatIfResponse>('/api/whatif', { gstin, margin_uplift, seasonality_smoothing })

export const fetchAppraisalNote = (gstin: string) =>
  post<AppraisalNoteResponse>(`/api/appraisal-note/${encodeURIComponent(gstin)}`, {})

// Mock data-source calls (used to show real data "landing" during the checkup).
export const fetchMockGst = (gstin: string) => get<MockGst>(`/mock/gst/${gstin}`)
export const fetchMockAa = (gstin: string) => get<MockAa>(`/mock/aa/${gstin}`)
export const fetchMockElectricity = (gstin: string) =>
  get<MockElectricity>(`/mock/electricity/${gstin}`)
export const fetchMockEpfo = (gstin: string) => get<MockEpfo>(`/mock/epfo/${gstin}`)
