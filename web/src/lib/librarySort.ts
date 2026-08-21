import type { Species } from '../types/models'

export type SortKey =
  | 'scientific_name'
  | 'common_name'
  | 'genus'
  | 'flowering_time'
  | 'frost_tolerance'
  | 'drought_tolerance'
  | 'conservation_status'
  | 'water_requirement'
  | 'mature_height'

export type SortDirection = 'ascending' | 'descending'

export type SortConfig = { key: SortKey; direction: SortDirection }

const SEASON_ORDER: Record<string, number> = {
  Summer: 1,
  Autumn: 2,
  Winter: 3,
  Spring: 4,
}

const DROUGHT_ORDER: Record<string, number> = {
  'extremely high': 1,
  high: 2,
  moderate: 3,
  low: 4,
  'low to moderate': 3.5,
}

const CONSERVATION_ORDER: Record<string, number> = {
  'least concern': 1,
  cultivar: 2,
  near: 3,
  vulnerable: 4,
  endangered: 5,
  critically: 6,
}

export function frostTempC(frost: string): number {
  const m = String(frost || '').match(/(-?\d+)\s*°?\s*C/i)
  if (m) return Number(m[1])
  const t = String(frost || '').toLowerCase()
  if (t.includes('high')) return -8
  if (t.includes('low')) return 0
  if (t.includes('moderate')) return -4
  return 99
}

function droughtRank(drought: string): number {
  const t = String(drought || '').toLowerCase()
  for (const [k, v] of Object.entries(DROUGHT_ORDER)) {
    if (t.includes(k)) return v
  }
  return 50
}

function conservationRank(status: string): number {
  const t = String(status || 'least concern').toLowerCase()
  for (const [k, v] of Object.entries(CONSERVATION_ORDER)) {
    if (t.includes(k)) return v
  }
  return 10
}

function floweringRank(flowering: string): number {
  const first = String(flowering || '').trim().split(/\s+/)[0] || ''
  return SEASON_ORDER[first] ?? 99
}

function heightMeters(height: string): number {
  const m = String(height || '').match(/(\d+(?:\.\d+)?)\s*m/i)
  return m ? Number(m[1]) : 999
}

function sortValue(s: Species, key: SortKey): string | number {
  switch (key) {
    case 'scientific_name':
      return s.scientific_name || ''
    case 'common_name':
      return s.common_name || ''
    case 'genus':
      return s.genus || ''
    case 'flowering_time':
      return floweringRank(s.flowering_time)
    case 'frost_tolerance':
      return frostTempC(s.frost_tolerance)
    case 'drought_tolerance':
      return droughtRank(s.drought_tolerance)
    case 'conservation_status':
      return conservationRank(s.conservation_status)
    case 'water_requirement':
      return s.water_requirement || 4
    case 'mature_height':
      return heightMeters(s.mature_height)
    default:
      return ''
  }
}

export function compareSpecies(a: Species, b: Species, config: SortConfig): number {
  const av = sortValue(a, config.key)
  const bv = sortValue(b, config.key)
  let cmp = 0
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv
  } else {
    cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
  }
  if (cmp === 0) {
    return (a.scientific_name || '').localeCompare(b.scientific_name || '')
  }
  return config.direction === 'ascending' ? cmp : -cmp
}

export function nextSortConfig(current: SortConfig, key: SortKey): SortConfig {
  if (current.key === key && current.direction === 'ascending') {
    return { key, direction: 'descending' }
  }
  return { key, direction: 'ascending' }
}

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'scientific_name', label: 'Scientific name' },
  { key: 'common_name', label: 'Common name' },
  { key: 'genus', label: 'Genus' },
  { key: 'flowering_time', label: 'Flowering time' },
  { key: 'frost_tolerance', label: 'Frost hardiness' },
  { key: 'drought_tolerance', label: 'Drought tolerance' },
  { key: 'water_requirement', label: 'Water need' },
  { key: 'conservation_status', label: 'Conservation' },
  { key: 'mature_height', label: 'Height' },
]
