import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const speciesPath = path.join(__dirname, '../src/data/species.json')
const species = JSON.parse(fs.readFileSync(speciesPath, 'utf8'))

function waterFromDrought(drought) {
  const d = String(drought || '').toLowerCase()
  if (d.includes('extremely')) return 1
  if (d.includes('high')) return 2
  if (d.includes('moderate')) return 4
  if (d.includes('low')) return 7
  return 4
}

function shadeFor(s) {
  const g = String(s.genus || '').toLowerCase()
  const soil = String(s.soil_preference || '').toLowerCase()
  const name = `${s.scientific_name} ${s.common_name}`.toLowerCase()
  if (g === 'scleranthus' || name.includes('fern') || soil.includes('shade')) return 'Shade'
  if (
    g === 'scaevola' ||
    g === 'pimelea' ||
    g === 'thryptomene' ||
    g === 'leptospermum' ||
    soil.includes('part') ||
    name.includes('understorey') ||
    name.includes('understory')
  ) {
    return 'Part shade'
  }
  if (g === 'callistemon' || g === 'melaleuca') return 'Part shade'
  // Most arid / banksia / acacia / hakea / eremophila / eucalyptus
  return 'Full sun'
}

for (const s of species) {
  if (!s.shade_tolerance) s.shade_tolerance = shadeFor(s)
  if (!s.water_requirement) s.water_requirement = waterFromDrought(s.drought_tolerance)
  // clamp
  s.water_requirement = Math.min(8, Math.max(1, Number(s.water_requirement) || 4))
}

fs.writeFileSync(speciesPath, JSON.stringify(species, null, 2) + '\n')
const counts = { sun: 0, part: 0, shade: 0 }
for (const s of species) {
  if (s.shade_tolerance === 'Full sun') counts.sun++
  else if (s.shade_tolerance === 'Part shade') counts.part++
  else counts.shade++
}
console.log(`Enriched ${species.length} species`)
console.log('Shade:', counts)
console.log('Water avg:', (species.reduce((a, s) => a + s.water_requirement, 0) / species.length).toFixed(1))
