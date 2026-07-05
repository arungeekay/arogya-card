// API response shapes for the AROGYA CARD backend (arogya/backend/app.py).

export interface Vital {
  name: string
  value: number // 0..100
}

export type Verdict = 'consistent' | 'anomaly'

export interface TriangleSide {
  pair: string
  corroborant: string
  consistency: number // 0..100
  verdict: Verdict
  gst_growth: number
  corroborant_growth: number
  divergence: number
  hypothesis: string | null
}

export interface Triangle {
  sides: TriangleSide[]
  overall: 'closed' | 'broken'
  n_broken: number
  summary: string
}

export type Bucket = 'GO' | 'REFER' | 'NO-GO'

export interface ScoreResponse {
  gstin: string
  borrower_id: string
  name: string
  sector: string
  city: string
  state: string
  vitals: Vital[]
  unified_score: number // 0..1000
  bucket: Bucket
  confidence: number // 0..1
  thin_file: boolean
  coverage_months: number
  triangle: Triangle
  reason_codes: string[]
  sources_called: string[]
  // Money framing (added backend-side): non-zero only in the relevant case.
  exposure_at_risk: number // ₹ facility the broken triangle is protecting
  exposure_unlocked: number // ₹ lending a thin-file alt-data check makes considerable
}

export interface DemoApplicant {
  demo: 'verma' | 'gupta' | 'nisha' | string
  gstin: string
  name: string
  tag: string
}

export interface DemoApplicantsResponse {
  applicants: DemoApplicant[]
}

export interface Percentile {
  p25: number
  p50: number
  p75: number
}

export interface ClusterResponse {
  sector: string
  city: string
  peer_count: number
  percentiles: Record<string, Percentile>
}

export interface WhatIfResponse {
  base_score: number
  adjusted_score: number
  delta: number
  assumptions: {
    margin_uplift: number
    seasonality_smoothing: number
  }
  explanation: string
}

export interface AppraisalNoteResponse {
  document_type: string
  gstin: string
  text: string
  prescription: string | null
}

// Mock data-source shapes (only the fields the UI surfaces).
export interface MockGst {
  source: string
  legal_name: string
  filing_count: number
  filings: { period: string; turnover: number; filing_delay_days: number; status: string }[]
}
export interface MockAa {
  source: string
  consent_status: string
  months: number
}
export interface MockElectricity {
  source: string
  sanctioned_load_kw: number
  months: number
}
export interface MockEpfo {
  source: string
  months: number
  history: { month: string; employee_count: number; contribution_delay_days: number }[]
}
