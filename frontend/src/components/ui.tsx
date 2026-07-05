import type { ReactNode } from 'react'
import { bucketPill } from '../lib/format'
import type { Bucket } from '../types'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-card border border-line rounded-2xl shadow-card ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-ink font-semibold text-lg">{title}</h2>
        {subtitle && <p className="text-muted text-sm mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function BucketChip({
  bucket,
  size = 'md',
}: {
  bucket: Bucket | string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sz =
    size === 'lg'
      ? 'text-base px-4 py-1.5'
      : size === 'sm'
        ? 'text-xs px-2.5 py-0.5'
        : 'text-sm px-3 py-1'
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${bucketPill(
        bucket,
      )} ${sz}`}
    >
      {bucket}
    </span>
  )
}

export function Pill({
  children,
  tone = 'muted',
}: {
  children: ReactNode
  tone?: 'muted' | 'brand' | 'teal' | 'green' | 'amber' | 'red'
}) {
  const tones: Record<string, string> = {
    muted: 'bg-muted/10 text-muted',
    brand: 'bg-brand/10 text-brand',
    teal: 'bg-teal/10 text-teal',
    green: 'bg-rag-green/12 text-rag-green',
    amber: 'bg-rag-amber/12 text-rag-amber',
    red: 'bg-rag-red/12 text-rag-red',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  return (
    <Card className="p-10 text-center">
      <div className="text-4xl mb-3">🩺</div>
      <h3 className="text-ink font-semibold">{title}</h3>
      {hint && <p className="text-muted text-sm mt-1">{hint}</p>}
    </Card>
  )
}
