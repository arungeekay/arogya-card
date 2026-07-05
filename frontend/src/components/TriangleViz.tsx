import { motion } from 'framer-motion'
import type { Triangle, TriangleSide } from '../types'

// The Verification Triangle: GST declarations at the hub, corroborated by three
// independent sources at the corners. A side turns red + animates when the pair
// is inconsistent (the fraud signal).

const W = 480
const H = 420
const HUB = { x: 240, y: 235 }
const CORNERS = {
  top: { x: 240, y: 46 }, // Electricity
  left: { x: 58, y: 356 }, // EPFO
  right: { x: 422, y: 356 }, // Bank / AA
}

function cornerFor(pair: string): { x: number; y: number } {
  if (pair.toLowerCase().includes('electric')) return CORNERS.top
  if (pair.toLowerCase().includes('epfo')) return CORNERS.left
  return CORNERS.right
}

function cornerLabel(pair: string): string {
  if (pair.toLowerCase().includes('electric')) return 'Electricity Board'
  if (pair.toLowerCase().includes('epfo')) return 'EPFO headcount'
  return 'Bank / AA inflows'
}

function Node({
  x,
  y,
  label,
  emoji,
  strong,
}: {
  x: number
  y: number
  label: string
  emoji: string
  strong?: boolean
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={strong ? 34 : 30}
        fill={strong ? '#0B3D91' : '#FFFFFF'}
        stroke={strong ? '#0B3D91' : '#E3E8F0'}
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 6px 14px rgba(10,31,68,0.12))' }}
      />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={22}>
        {emoji}
      </text>
      <text
        x={x}
        y={y + (strong ? 52 : 48)}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="#0A1F44"
      >
        {label}
      </text>
    </g>
  )
}

function Side({ side, delay }: { side: TriangleSide; delay: number }) {
  const c = cornerFor(side.pair)
  const broken = side.verdict !== 'consistent'
  const color = broken ? '#E5484D' : '#2E9E5B'
  const mid = { x: (HUB.x + c.x) / 2, y: (HUB.y + c.y) / 2 }

  return (
    <g>
      {/* base line */}
      <motion.line
        x1={HUB.x}
        y1={HUB.y}
        x2={c.x}
        y2={c.y}
        stroke={color}
        strokeWidth={broken ? 5 : 4}
        strokeLinecap="round"
        strokeDasharray={broken ? '10 8' : undefined}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          broken
            ? { pathLength: 1, opacity: [1, 0.35, 1] }
            : { pathLength: 1, opacity: 1 }
        }
        transition={
          broken
            ? {
                pathLength: { duration: 0.6, delay },
                opacity: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
              }
            : { duration: 0.7, delay, ease: 'easeOut' }
        }
      />
      {/* break marker */}
      {broken && (
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.18, 1], opacity: 1 }}
          transition={{
            scale: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
            opacity: { duration: 0.4, delay: delay + 0.5 },
          }}
        >
          <circle cx={mid.x} cy={mid.y} r={15} fill="#E5484D" />
          <text
            x={mid.x}
            y={mid.y + 5}
            textAnchor="middle"
            fontSize={15}
            fill="#fff"
          >
            ⚡
          </text>
        </motion.g>
      )}
      {/* consistency label */}
      <g transform={`translate(${mid.x}, ${broken ? mid.y + 28 : mid.y})`}>
        <rect
          x={-24}
          y={-11}
          width={48}
          height={22}
          rx={11}
          fill="#fff"
          stroke={color}
          strokeOpacity={0.4}
        />
        <text
          textAnchor="middle"
          y={5}
          fontSize={12}
          fontWeight={700}
          fill={color}
        >
          {Math.round(side.consistency)}
        </text>
      </g>
    </g>
  )
}

export default function TriangleViz({ triangle }: { triangle: Triangle }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-[480px] mx-auto block"
      role="img"
      aria-label="Verification triangle"
    >
      {/* faint outer frame connecting the three corroborant corners */}
      <polygon
        points={`${CORNERS.top.x},${CORNERS.top.y} ${CORNERS.right.x},${CORNERS.right.y} ${CORNERS.left.x},${CORNERS.left.y}`}
        fill="#0B3D91"
        fillOpacity={0.03}
        stroke="#E3E8F0"
        strokeWidth={1.5}
        strokeDasharray="4 6"
      />
      {triangle.sides.map((s, i) => (
        <Side key={s.pair} side={s} delay={i * 0.25} />
      ))}
      <Node {...CORNERS.top} label={cornerLabel('electricity')} emoji="⚡" />
      <Node {...CORNERS.left} label={cornerLabel('epfo')} emoji="👥" />
      <Node {...CORNERS.right} label={cornerLabel('bank')} emoji="🏦" />
      <Node {...HUB} label="GST declared" emoji="🧾" strong />
    </svg>
  )
}
