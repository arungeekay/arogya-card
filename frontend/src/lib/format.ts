import type { Bucket } from '../types'

// Format rupees in Indian lakh/crore. Input is rupees.
export function inr(rupees: number): string {
  if (!isFinite(rupees)) return '—'
  const abs = Math.abs(rupees)
  if (abs >= 1e7) return `₹${(rupees / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(rupees / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `₹${(rupees / 1e3).toFixed(1)} K`
  return `₹${Math.round(rupees)}`
}

// RAG colour hex per bucket.
export function bucketHex(bucket: Bucket | string): string {
  switch (bucket) {
    case 'GO':
      return '#2E9E5B'
    case 'REFER':
      return '#E8A317'
    case 'NO-GO':
      return '#E5484D'
    default:
      return '#5B6B85'
  }
}

// Tailwind classes for a RAG pill given a bucket.
export function bucketPill(bucket: Bucket | string): string {
  switch (bucket) {
    case 'GO':
      return 'bg-rag-green/12 text-rag-green'
    case 'REFER':
      return 'bg-rag-amber/12 text-rag-amber'
    case 'NO-GO':
      return 'bg-rag-red/12 text-rag-red'
    default:
      return 'bg-muted/12 text-muted'
  }
}

export type Strength = 'weak' | 'moderate' | 'strong'

// Vital strength band mirrors the backend reason-code thresholds.
export function vitalStrength(value: number): Strength {
  if (value < 55) return 'weak'
  if (value < 72) return 'moderate'
  return 'strong'
}

export function strengthHex(s: Strength): string {
  switch (s) {
    case 'weak':
      return '#E5484D'
    case 'moderate':
      return '#E8A317'
    case 'strong':
      return '#2E9E5B'
  }
}

// Confidence band colour.
export function confidenceHex(confidence: number): string {
  if (confidence >= 0.85) return '#2E9E5B'
  if (confidence >= 0.7) return '#E8A317'
  return '#E5484D'
}

// Human-readable sector label.
export function prettySector(sector: string): string {
  return sector
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`
}
