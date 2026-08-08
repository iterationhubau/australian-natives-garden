/**
 * Validate species image URLs and replace broken/weak ones via Wikimedia Commons search.
 *
 * Usage:
 *   node scripts/fetch-wikimedia-images.mjs              # new genera + broken URLs
 *   node scripts/fetch-wikimedia-images.mjs --all         # entire catalog
 *   node scripts/fetch-wikimedia-images.mjs --force-new   # re-fetch for new genera even if URL "works"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const speciesPath = path.join(__dirname, '../src/data/species.json')
const species = JSON.parse(fs.readFileSync(speciesPath, 'utf8'))

const args = new Set(process.argv.slice(2))
const ALL = args.has('--all')
const FORCE_NEW = args.has('--force-new')
const RETRY_FAILED = args.has('--retry-failed')
const DELAY_MS = Number(process.env.WM_DELAY_MS || (RETRY_FAILED ? 900 : 400))

const NEW_GENERA = new Set([
  'Grevillea',
  'Correa',
  'Westringia',
  'Anigozanthos',
  'Lomandra',
  'Hardenbergia',
  'Kennedia',
  'Dianella',
  'Patersonia',
  'Thomasia',
  'Chamelaucium',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').trim()
}

/** Grevillea 'Robyn Gordon' → Grevillea Robyn Gordon / Grevillea */
function queryVariants(scientificName) {
  const full = scientificName.replace(/\s+/g, ' ').trim()
  const noParen = full.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const cultivar = noParen.match(/^(.+?)\s+'([^']+)'/)
  const variants = []
  if (cultivar) {
    const base = cultivar[1].trim()
    const cv = cultivar[2].trim()
    variants.push(`${base} ${cv}`, `"${cv}" ${base.split(' ')[0]}`, base)
  } else {
    variants.push(noParen)
    const binomial = noParen.split(/\s+/).slice(0, 2).join(' ')
    if (binomial !== noParen) variants.push(binomial)
  }
  // File: search hint
  variants.push(`File:${noParen.split(/\s+/).slice(0, 2).join('_')}`)
  return [...new Set(variants)]
}

function scoreResult(item, scientificName) {
  const title = (item.title || '').toLowerCase()
  const name = scientificName.toLowerCase()
  const bits = name
    .replace(/['"()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
  let score = 0
  for (const b of bits) {
    if (title.includes(b.toLowerCase())) score += 3
  }
  if (/\.(svg|pdf|djvu)$/i.test(title)) score -= 50
  if (/map|diagram|logo|coat of arms|flag|icon|distribution/i.test(title)) score -= 30
  if (/flower|bloom|inflorescence|plant|habit/i.test(title)) score += 4
  if (item.byteSize > 40_000) score += 2
  if (item.byteSize > 200_000) score += 2
  return score
}

async function urlOk(url) {
  if (!url) return false
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (res.ok) return true
    // Some CDNs dislike HEAD
    const get = await fetch(url, { method: 'GET', redirect: 'follow', headers: { Range: 'bytes=0-64' } })
    return get.ok || get.status === 206
  } catch {
    return false
  }
}

async function searchWikimedia(query, limit = 10) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrsearch', query)
  url.searchParams.set('gsrnamespace', '6') // File namespace
  url.searchParams.set('gsrlimit', String(limit))
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|extmetadata|size|mime')
  url.searchParams.set('iiurlwidth', '1280')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'AustralianNativesGarden/1.0 (local catalog enrichment; contact: local-dev)' },
    })
    if (res.status === 429 || res.status === 503) {
      const wait = 2000 * (attempt + 1) ** 2
      console.warn(`  rate limited (${res.status}), waiting ${wait}ms…`)
      await sleep(wait)
      continue
    }
    if (!res.ok) throw new Error(`Search failed ${res.status} for ${query}`)
    const data = await res.json()
    const pages = data?.query?.pages ? Object.values(data.query.pages) : []
    return pages
      .map((page) => {
        const info = page.imageinfo?.[0]
        if (!info?.url) return null
        const mime = info.mime || ''
        if (!/^image\/(jpeg|png|webp|gif)/i.test(mime)) return null
        return {
          title: page.title,
          url: info.thumburl || info.url,
          fullUrl: info.url,
          attribution: stripHtml(info.extmetadata?.Artist?.value) || 'Wikimedia Commons',
          license: info.extmetadata?.LicenseShortName?.value || 'See Commons',
          byteSize: info.size ?? 0,
        }
      })
      .filter(Boolean)
  }
  throw new Error(`Search failed after retries for ${query}`)
}

async function findImage(scientificName) {
  let best = null
  let bestScore = -Infinity
  for (const q of queryVariants(scientificName)) {
    try {
      const results = await searchWikimedia(q)
      await sleep(DELAY_MS)
      for (const r of results) {
        const sc = scoreResult(r, scientificName)
        if (sc > bestScore) {
          bestScore = sc
          best = r
        }
      }
      if (bestScore >= 8) break
    } catch (err) {
      console.warn('  search error:', q, err.message)
      await sleep(500)
    }
  }
  if (!best || bestScore < 3) return null
  return best
}

function needsWork(s, okCache) {
  if (RETRY_FAILED) {
    if (!s.image_url) return true
    // Re-fetch only URLs that still 404 (successful Commons hits are kept)
    return okCache.get(s.image_url) === false
  }
  if (ALL) return true
  if (NEW_GENERA.has(s.genus)) {
    if (FORCE_NEW) return true
    if (!s.image_url) return true
    if (okCache.get(s.image_url) === false) return true
    // Many new entries reuse a single genus placeholder URL — refresh those
    return true
  }
  if (!s.image_url) return true
  return okCache.get(s.image_url) === false
}

const targets = []
const urlStatus = new Map()

// Preflight unique URLs for candidates
const toCheck = new Set()
for (const s of species) {
  if (ALL || RETRY_FAILED || NEW_GENERA.has(s.genus) || !s.image_url) {
    if (s.image_url) toCheck.add(s.image_url)
  }
}

console.log(`Checking ${toCheck.size} unique image URLs…`)
let i = 0
for (const url of toCheck) {
  i++
  const ok = await urlOk(url)
  urlStatus.set(url, ok)
  if (i % 10 === 0) console.log(`  checked ${i}/${toCheck.size}`)
  await sleep(80)
}

for (const s of species) {
  if (needsWork(s, urlStatus)) targets.push(s)
}

console.log(`Fetching images for ${targets.length} species…`)
let updated = 0
let failed = 0
const report = []

for (const s of targets) {
  const prev = s.image_url
  const prevOk = prev ? urlStatus.get(prev) : false
  process.stdout.write(`• ${s.scientific_name}${prevOk ? ' (refresh)' : ' (broken/missing)'}… `)
  const found = await findImage(s.scientific_name)
  if (!found) {
    console.log('no match')
    failed++
    report.push({ name: s.scientific_name, status: 'failed', prev })
    continue
  }
  // Prefer full URL for stability; thumb is fine for display
  const nextUrl = found.url
  if (nextUrl === prev && prevOk) {
    console.log('unchanged')
    report.push({ name: s.scientific_name, status: 'unchanged', url: nextUrl })
    continue
  }
  s.image_url = nextUrl
  s.image_attribution = found.attribution
  s.image_license = found.license
  s.image_source = 'library_cc'
  updated++
  console.log('OK', found.title.replace(/^File:/, ''))
  report.push({ name: s.scientific_name, status: 'updated', url: nextUrl, title: found.title })
  await sleep(DELAY_MS)
}

fs.writeFileSync(speciesPath, JSON.stringify(species, null, 2) + '\n')
const reportPath = path.join(__dirname, 'image-fetch-report.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(`\nUpdated ${updated}, failed ${failed}. Wrote species.json + image-fetch-report.json`)
