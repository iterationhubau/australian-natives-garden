/**
 * Re-fetch catalog photos with STRICT name matching + no duplicate file reuse.
 *
 *   node scripts/relocalize-species-images.mjs
 *   node scripts/relocalize-species-images.mjs --genus=Grevillea
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const speciesPath = path.join(root, 'src/data/species.json')
const outDir = path.join(root, 'public/catalog/images')
const species = JSON.parse(fs.readFileSync(speciesPath, 'utf8'))

const genusArg = process.argv.find((a) => a.startsWith('--genus='))?.split('=')[1]
const NEW_GENERA = new Set([
  'Grevillea', 'Correa', 'Westringia', 'Anigozanthos', 'Lomandra',
  'Hardenbergia', 'Kennedia', 'Dianella', 'Patersonia', 'Thomasia', 'Chamelaucium',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = 'AustralianNativesGarden/1.0 (strict catalog photos; educational)'

fs.mkdirSync(outDir, { recursive: true })

/** @type {Set<string>} remote URLs already assigned */
const usedRemoteUrls = new Set()
/** @type {Set<string>} file hashes already assigned */
const usedHashes = new Set()

function parseName(scientificName) {
  const full = String(scientificName).replace(/\s+/g, ' ').trim()
  const noParen = full.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const cultivarMatch = noParen.match(/^(.+?)\s+'([^']+)'\s*$/)
  const cultivar = cultivarMatch?.[2]?.trim() || null
  const base = (cultivarMatch?.[1] || noParen).trim()
  const parts = base.split(/\s+/)
  const genus = parts[0] || ''
  const epithet = parts[1] && !parts[1].startsWith('var.') ? parts[1] : parts[1] || ''
  // keep var. X in binomial-ish form
  let binomial = parts.slice(0, 2).join(' ')
  if (/^var\.|^subsp\./i.test(parts[1] || '')) binomial = parts.slice(0, 3).join(' ')
  if (parts[2] && /^var\.|^subsp\./i.test(parts[2])) binomial = parts.slice(0, 4).join(' ')
  return { full, base, binomial, genus, epithet, cultivar }
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[''"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function titleMatchesPlant(title, parsed) {
  const t = norm(title)
  if (!t) return false
  if (/map|diagram|logo|flag|coat of arms|distribution|range map/.test(t)) return false
  const genus = norm(parsed.genus)
  if (!t.includes(genus)) return false
  if (parsed.cultivar) {
    const cv = norm(parsed.cultivar)
    // cultivar-specific: title should mention cultivar (or most words of it)
    const cvWords = cv.split(' ').filter((w) => w.length > 2)
    const hit = cvWords.filter((w) => t.includes(w)).length
    if (hit >= Math.min(2, cvWords.length) || t.includes(cv.replace(/\s+/g, ''))) return true
    // allow species match only as weak later — reject here for cultivar-strict pass
    return false
  }
  // species: need epithet (or full binomial)
  const epi = norm(parsed.epithet)
  if (epi && t.includes(epi)) return true
  if (t.includes(norm(parsed.binomial))) return true
  return false
}

async function urlOk(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Range: 'bytes=0-64' },
      redirect: 'follow',
    })
    return res.ok || res.status === 206
  } catch {
    return false
  }
}

function cleanUrl(url) {
  try {
    const u = new URL(url)
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return String(url).split('?')[0]
  }
}

async function wikimediaCandidates(query, limit = 12) {
  const api = new URL('https://commons.wikimedia.org/w/api.php')
  api.searchParams.set('action', 'query')
  api.searchParams.set('generator', 'search')
  api.searchParams.set('gsrsearch', query)
  api.searchParams.set('gsrnamespace', '6')
  api.searchParams.set('gsrlimit', String(limit))
  api.searchParams.set('prop', 'imageinfo')
  api.searchParams.set('iiprop', 'url|extmetadata|size|mime')
  api.searchParams.set('iiurlwidth', '1280')
  api.searchParams.set('format', 'json')
  api.searchParams.set('origin', '*')
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(api, { headers: { 'User-Agent': UA } })
    if (res.status === 429 || res.status === 503) {
      await sleep(2500 * (attempt + 1))
      continue
    }
    if (!res.ok) return []
    const data = await res.json()
    const pages = data?.query?.pages ? Object.values(data.query.pages) : []
    return pages
      .map((page) => {
        const info = page.imageinfo?.[0]
        if (!info?.url) return null
        if (info.mime && !/^image\/(jpeg|png|webp)/i.test(info.mime)) return null
        const artist = String(info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim()
        return {
          title: page.title || '',
          url: cleanUrl(info.thumburl || info.url),
          attribution: artist ? `${artist} · Wikimedia Commons` : 'Wikimedia Commons',
          license: info.extmetadata?.LicenseShortName?.value || 'See Commons',
          sourceLabel: 'Wikimedia Commons',
          scoreHint: 0,
        }
      })
      .filter(Boolean)
  }
  return []
}

async function wikipediaExact(binomial) {
  const title = binomial.replace(/\s+/g, '_')
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  // Reject disambiguation / wrong title
  const display = norm(data?.title || data?.titles?.display || '')
  if (display && !display.includes(norm(binomial).split(' ')[1] || '')) return null
  const src = data?.originalimage?.source || data?.thumbnail?.source
  if (!src) return null
  return {
    title: data.title,
    url: cleanUrl(src),
    attribution: `Wikipedia · ${data.titles?.display || data.title}`,
    license: 'Wikipedia / source license',
    sourceLabel: 'Wikipedia',
  }
}

async function inatTaxonExact(binomial) {
  const url = new URL('https://api.inaturalist.org/v1/taxa')
  url.searchParams.set('q', binomial)
  url.searchParams.set('is_active', 'true')
  url.searchParams.set('per_page', '10')
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  const want = norm(binomial)
  const hit = (data.results || []).find((t) => {
    const n = norm(t.name)
    return n === want || n.startsWith(want + ' ')
  })
  return hit || null
}

async function inatObservationPhotos(taxonId, limit = 12) {
  const url = new URL('https://api.inaturalist.org/v1/observations')
  url.searchParams.set('taxon_id', String(taxonId))
  url.searchParams.set('photos', 'true')
  url.searchParams.set('quality_grade', 'research,needs_id')
  url.searchParams.set('order_by', 'votes')
  url.searchParams.set('per_page', String(limit))
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json()
  const out = []
  for (const obs of data.results || []) {
    for (const p of obs.photos || []) {
      const u = (p.url || '').replace(/square\./, 'medium.').replace(/square/, 'medium')
      if (!u) continue
      out.push({
        title: `iNat obs ${obs.id}`,
        url: u,
        attribution: p.attribution || obs.user?.name_autocomplete || 'iNaturalist',
        license: p.license_code || 'See iNaturalist',
        sourceLabel: 'iNaturalist',
      })
    }
  }
  return out
}

async function collectCandidates(parsed) {
  const list = []
  const queries = []
  if (parsed.cultivar) {
    queries.push(`"${parsed.genus}" "${parsed.cultivar}"`)
    queries.push(`${parsed.genus} ${parsed.cultivar}`)
    queries.push(`File:${parsed.genus} ${parsed.cultivar}`)
  }
  queries.push(`"${parsed.binomial}"`)
  queries.push(parsed.binomial)
  if (parsed.epithet) queries.push(`File:${parsed.genus}_${parsed.epithet}`)

  // 1) Wikimedia — strict title match
  for (const q of queries) {
    const found = await wikimediaCandidates(q)
    await sleep(400)
    for (const f of found) {
      if (titleMatchesPlant(f.title, parsed)) {
        list.push({ ...f, tier: parsed.cultivar && norm(f.title).includes(norm(parsed.cultivar)) ? 1 : 2 })
      }
    }
    if (list.some((x) => x.tier === 1)) break
  }

  // 2) Wikipedia exact species page (not for cultivars unless no cultivar hit)
  if (!parsed.cultivar || list.length === 0) {
    const wiki = await wikipediaExact(parsed.binomial)
    await sleep(200)
    if (wiki) list.push({ ...wiki, tier: parsed.cultivar ? 4 : 2 })
  }

  // 3) iNaturalist exact taxon + multiple observation photos (unique picks)
  const taxon = await inatTaxonExact(parsed.binomial)
  await sleep(300)
  if (taxon?.id) {
    const photos = await inatObservationPhotos(taxon.id, 15)
    await sleep(300)
    for (const p of photos) {
      list.push({
        ...p,
        tier: parsed.cultivar ? 3 : 2,
        note: parsed.cultivar ? `${parsed.binomial} (species photo; cultivar-specific image not found)` : undefined,
      })
    }
    // default photo last
    const def = taxon.default_photo
    if (def?.medium_url || def?.url) {
      list.push({
        title: taxon.name,
        url: def.medium_url || def.url,
        attribution: def.attribution || `iNaturalist · ${taxon.name}`,
        license: def.license_code || 'See iNaturalist',
        sourceLabel: 'iNaturalist',
        tier: parsed.cultivar ? 3 : 2,
        note: parsed.cultivar ? `${parsed.binomial} (species photo; cultivar-specific image not found)` : undefined,
      })
    }
  }

  // sort by tier then keep order
  list.sort((a, b) => a.tier - b.tier)
  return list
}

function extFrom(ct, url) {
  if (ct?.includes('png')) return '.png'
  if (ct?.includes('webp')) return '.webp'
  const m = String(url).match(/\.(jpe?g|png|webp)(?:$|\?)/i)
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg'
}

async function downloadUnique(url, destBase) {
  const cleaned = cleanUrl(url)
  if (usedRemoteUrls.has(cleaned)) return null
  const res = await fetch(cleaned, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1200) return null
  const hash = crypto.createHash('sha256').update(buf).digest('hex')
  if (usedHashes.has(hash)) return null
  const ext = extFrom(res.headers.get('content-type'), cleaned)
  const dest = `${destBase}${ext}`
  for (const e of ['.jpg', '.jpeg', '.png', '.webp', '.gif']) {
    const p = `${destBase}${e}`
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }
  fs.writeFileSync(dest, buf)
  usedRemoteUrls.add(cleaned)
  usedHashes.add(hash)
  return {
    localUrl: `/catalog/images/${path.basename(dest)}`,
    hash,
  }
}

const targets = species.filter((s) => (genusArg ? s.genus === genusArg : NEW_GENERA.has(s.genus)))
console.log(`Strict re-localize ${targets.length} plants…`)

let ok = 0
let fail = 0
const report = []

for (const s of targets) {
  const parsed = parseName(s.scientific_name)
  const id = String(s.legacy_id || parsed.full.replace(/\W+/g, '_').slice(0, 40))
  const destBase = path.join(outDir, id)
  process.stdout.write(`• ${s.scientific_name} … `)

  try {
    const candidates = await collectCandidates(parsed)
    let chosen = null
    let saved = null
    for (const c of candidates) {
      if (!c.url || usedRemoteUrls.has(cleanUrl(c.url))) continue
      if (!(await urlOk(c.url))) continue
      saved = await downloadUnique(c.url, destBase)
      if (!saved) continue
      chosen = c
      break
    }

    if (!chosen || !saved) {
      // clear bad local image so UI shows illustration rather than wrong photo
      s.image_url = ''
      s.image_attribution = ''
      s.image_license = ''
      s.image_source = null
      for (const e of ['.jpg', '.jpeg', '.png', '.webp', '.gif']) {
        const p = `${destBase}${e}`
        if (fs.existsSync(p)) fs.unlinkSync(p)
      }
      fail++
      console.log('no unique match (cleared)')
      report.push({ name: s.scientific_name, status: 'cleared' })
      continue
    }

    s.image_url = saved.localUrl
    s.image_attribution = chosen.note
      ? `${chosen.attribution} · ${chosen.note}`
      : chosen.attribution
    s.image_license = chosen.license
    s.image_source = 'library_cc'
    ok++
    console.log(`OK t${chosen.tier} ${chosen.sourceLabel}${chosen.note ? ' [species fallback]' : ''}`)
    report.push({
      name: s.scientific_name,
      status: 'ok',
      tier: chosen.tier,
      source: chosen.sourceLabel,
      title: chosen.title,
      note: chosen.note || null,
      url: saved.localUrl,
    })
  } catch (err) {
    fail++
    console.log('fail', err.message)
    report.push({ name: s.scientific_name, status: 'fail', error: err.message })
  }
  await sleep(200)
}

fs.writeFileSync(speciesPath, JSON.stringify(species, null, 2) + '\n')
fs.writeFileSync(path.join(__dirname, 'image-relocalize-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`\nOK ${ok}, cleared/failed ${fail}. Unique hashes used: ${usedHashes.size}`)
console.log('Report: scripts/image-relocalize-report.json')
