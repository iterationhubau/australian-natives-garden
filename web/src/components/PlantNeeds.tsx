import type { ShadeTolerance } from '../types/models'

export function SunSymbol({ level, className = 'h-5 w-5' }: { level: ShadeTolerance; className?: string }) {
  if (level === 'Shade') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 14h16a4 4 0 0 0-7.5-2.2A5 5 0 0 0 4 14z" className="fill-slate-300/80 stroke-slate-500" />
        <path d="M8 14a3.5 3.5 0 0 1 6.2-2.2" className="stroke-slate-400" />
      </svg>
    )
  }
  if (level === 'Part shade') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="9" cy="10" r="3.2" className="fill-amber-300/90 stroke-amber-500" />
        <path d="M9 4v1.2M9 14.8V16M4 10h1.2M12.8 10H14M5.6 6.6l.8.8M11.6 12.6l.8.8M5.6 13.4l.8-.8M11.6 7.4l.8-.8" className="stroke-amber-500" />
        <path d="M13 15h7a3.2 3.2 0 0 0-5.8-1.8A3.8 3.8 0 0 0 13 15z" className="fill-slate-300/90 stroke-slate-500" />
      </svg>
    )
  }
  // Full sun
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="4" className="fill-amber-300 stroke-amber-500" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M5.4 18.6l1.6-1.6M17 7l1.6-1.6" className="stroke-amber-500" />
    </svg>
  )
}

export function WaterDroplets({ level, max = 8 }: { level: number; max?: number }) {
  const n = Math.min(max, Math.max(1, Math.round(level) || 1))
  return (
    <div className="flex items-end gap-0.5" aria-label={`${n} of ${max} water droplets`}>
      {Array.from({ length: max }, (_, i) => {
        const on = i < n
        return (
          <svg key={i} viewBox="0 0 12 16" className="h-4 w-3" aria-hidden>
            <path
              d="M6 1C6 1 1.5 7 1.5 10.2a4.5 4.5 0 0 0 9 0C10.5 7 6 1 6 1z"
              className={on ? 'fill-sky-500 stroke-sky-600' : 'fill-slate-100 stroke-slate-300'}
              strokeWidth="0.8"
            />
          </svg>
        )
      })}
    </div>
  )
}

export type FrostLevel = 'Low' | 'Moderate' | 'High'

export function frostLevel(frost: string): FrostLevel {
  const t = String(frost || '').toLowerCase()
  if (t.startsWith('high') || t.includes('high')) return 'High'
  if (t.startsWith('low') || t.includes('low')) return 'Low'
  return 'Moderate'
}

/** Snowflake intensity reflects Low / Moderate / High frost hardiness. */
export function FrostSymbol({ frost, className = 'h-5 w-5' }: { frost: string; className?: string }) {
  const level = frostLevel(frost)
  const tone =
    level === 'High'
      ? 'text-sky-600'
      : level === 'Low'
        ? 'text-slate-400'
        : 'text-sky-500'

  return (
    <svg viewBox="0 0 24 24" className={`${className} ${tone}`} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2v20M4.5 7l15 10M19.5 7l-15 10" strokeLinecap="round" />
      {level !== 'Low' && (
        <>
          <path d="M12 5l2-1.5M12 5l-2-1.5M12 19l2 1.5M12 19l-2 1.5" strokeLinecap="round" />
          <path d="M6.2 8.2l-1.8.3M6.2 8.2l.2-1.8M17.8 15.8l1.8-.3M17.8 15.8l-.2 1.8" strokeLinecap="round" />
          <path d="M17.8 8.2l1.8.3M17.8 8.2l-.2-1.8M6.2 15.8l-1.8-.3M6.2 15.8l.2 1.8" strokeLinecap="round" />
        </>
      )}
      {level === 'High' && (
        <circle cx="12" cy="12" r="1.6" className="fill-sky-400 stroke-sky-600" />
      )}
    </svg>
  )
}

export function PlantNeedsBar({
  shade,
  water,
  drought,
  frost,
}: {
  shade: ShadeTolerance
  water: number
  drought: string
  frost: string
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-2.5">
        <SunSymbol level={shade} className="h-6 w-6 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Light</p>
          <p className="text-xs font-semibold text-slate-800 m-0 truncate">{shade}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-2.5">
        <WaterDroplets level={water} />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Water need</p>
          <p className="text-xs font-semibold text-slate-800 m-0">{water}/8 · {waterLabel(water)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-2.5">
        <FrostSymbol frost={frost} className="h-6 w-6 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Frost</p>
          <p className="text-xs font-semibold text-slate-800 m-0 truncate" title={frost}>{frost || '—'}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-2.5">
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-amber-700" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3c2.5 3.5 5 6.2 5 9.2A5 5 0 0 1 7 12.2C7 9.2 9.5 6.5 12 3z" className="fill-amber-200/80" />
          <path d="M8 20c1.2-2 2.4-3 4-3s2.8 1 4 3" />
        </svg>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Drought</p>
          <p className="text-xs font-semibold text-slate-800 m-0 truncate">{drought || '—'}</p>
        </div>
      </div>
    </div>
  )
}

export function waterLabel(level: number): string {
  if (level <= 2) return 'Very little'
  if (level <= 4) return 'Low'
  if (level <= 6) return 'Moderate'
  return 'Very thirsty'
}

export const SHADE_OPTIONS: ShadeTolerance[] = ['Full sun', 'Part shade', 'Shade']
