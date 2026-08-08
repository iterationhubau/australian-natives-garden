import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvPath = process.argv[2] || 'C:/Users/andre/Downloads/Australian_Native_Seed_Tracker_Export (2).csv'
const speciesPath = path.join(__dirname, '../src/data/species.json')

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c === '\r') {
      // skip
    } else {
      field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const csvText = fs.readFileSync(csvPath, 'utf8')
const rows = parseCsv(csvText)
const header = rows[0].map((h) => h.trim())
const nameIdx = header.indexOf('Scientific Name')
const imageIdx = header.indexOf('Image Link')
if (nameIdx < 0 || imageIdx < 0) {
  throw new Error(`Missing columns. Found: ${header.join(' | ')}`)
}

const byName = new Map()
for (const row of rows.slice(1)) {
  if (!row[nameIdx]) continue
  const name = row[nameIdx].trim()
  const image = (row[imageIdx] || '').trim()
  if (image && image !== 'N/A') byName.set(name.toLowerCase(), image)
}

const species = JSON.parse(fs.readFileSync(speciesPath, 'utf8'))
let updated = 0
let missingInCsv = []
let emptyAfter = []

for (const s of species) {
  const key = s.scientific_name.trim().toLowerCase()
  const fromCsv = byName.get(key)
  if (fromCsv) {
    if (s.image_url !== fromCsv) {
      s.image_url = fromCsv
      s.image_source = fromCsv.includes('wikimedia.org') || fromCsv.includes('commons')
        ? 'library_cc'
        : 'web_link'
      if (fromCsv.includes('wikimedia.org')) {
        s.image_attribution = s.image_attribution || 'Wikimedia Commons'
        s.image_license = s.image_license || 'See source page'
      }
      updated++
    }
  } else {
    missingInCsv.push(s.scientific_name)
  }
  if (!s.image_url) emptyAfter.push(s.scientific_name)
}

fs.writeFileSync(speciesPath, JSON.stringify(species, null, 2) + '\n')

// Keep a project copy of the CSV for future merges
const destCsv = path.join(__dirname, '../src/data/Australian_Native_Seed_Tracker_Export.csv')
fs.copyFileSync(csvPath, destCsv)

console.log(`CSV image links: ${byName.size}`)
console.log(`Species updated: ${updated}`)
console.log(`Species still without image: ${emptyAfter.length}`)
if (missingInCsv.length) console.log('Not found in CSV:', missingInCsv.join(', '))
if (emptyAfter.length) console.log('Empty images:', emptyAfter.join(', '))
