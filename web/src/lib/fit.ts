import type { GardenSite, Species } from '../types/models'

function scoreTextOverlap(a: string, b: string): number {
  const left = a.toLowerCase()
  const right = b.toLowerCase()
  if (!left || !right) return 0
  if (left.includes(right) || right.includes(left)) return 2
  const tokens = right.split(/[^a-z0-9]+/).filter((t) => t.length > 3)
  return tokens.reduce((score, token) => (left.includes(token) ? score + 1 : score), 0)
}

function frostScore(speciesFrost: string, siteFrost: string): number {
  const s = speciesFrost.toLowerCase()
  const site = siteFrost.toLowerCase()
  if (!site) return 1
  if (site.includes('severe') || site.includes('heavy')) {
    if (s.includes('high') || s.includes('very')) return 3
    if (s.includes('moderate')) return 1
    return 0
  }
  if (site.includes('light') || site.includes('mild')) {
    if (s.includes('low')) return 2
    return 3
  }
  return scoreTextOverlap(s, site) + 1
}

function parseWidthMetres(width: string): number | null {
  const nums = [...width.matchAll(/(\d+(?:\.\d+)?)\s*m/gi)].map((m) => Number(m[1]))
  if (!nums.length) return null
  return Math.max(...nums)
}

export interface FitResult {
  species: Species
  score: number
  reasons: string[]
}

export function rankSpeciesForSite(speciesList: Species[], site: GardenSite, limit = 12): FitResult[] {
  return speciesList
    .map((species) => {
      let score = 0
      const reasons: string[] = []

      const soil = scoreTextOverlap(species.soil_preference, site.soil)
      if (soil > 0) {
        score += soil * 2
        reasons.push('Soil match')
      }

      const frost = frostScore(species.frost_tolerance, site.frost_exposure)
      score += frost
      if (frost >= 2) reasons.push('Frost tolerance suits site')

      if (species.drought_tolerance.toLowerCase().includes('high')) {
        score += 1
        reasons.push('Drought hardy')
      }

      const width = parseWidthMetres(species.mature_width)
      if (width != null && site.approx_size) {
        const siteNums = [...site.approx_size.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
        const siteMax = siteNums.length ? Math.max(...siteNums) : null
        if (siteMax != null) {
          if (width <= siteMax) {
            score += 2
            reasons.push('Fits site size')
          } else {
            score -= 1
            reasons.push('May outgrow site')
          }
        }
      }

      if (site.sun === 'Full sun' && species.drought_tolerance.toLowerCase().includes('high')) {
        score += 1
      }

      if (!reasons.length) reasons.push('General native candidate')
      return { species, score, reasons }
    })
    .sort((a, b) => b.score - a.score || a.species.scientific_name.localeCompare(b.species.scientific_name))
    .slice(0, limit)
}
