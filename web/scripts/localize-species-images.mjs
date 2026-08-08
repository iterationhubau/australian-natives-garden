/**
 * Source plant photos from iNaturalist / Wikipedia / Wikimedia, download into
 * public/catalog/images/, and update species.json with local paths + attribution.
 *
 *   node scripts/localize-species-images.mjs              # new genera + broken remotes
 *   node scripts/localize-species-images.mjs --all
 *   node scripts/localize-species-images.mjs --genus=Grevillea
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const speciesPath = path.join(root, 'src/data/species.json')
const outDir = path.join(root, 'public/catalog/images')
const species = JSON.parse(fs.readFileSync(speciesPath, 'utf8'))

const args = process.argv.slice(2)
const ALL = args.includes('--all')
const genusArg = args.find((a) => a.startsWith('--genus='))?.split('=')[1]
const NEW_GENERA = new Set([
  'Grevillea', 'Correa', 'Westringia', 'Anigozanthos', 'Lomandra',
  'Hardenbergia', 'Kennedia', 'Dianella', 'Patersonia', 'Thomasia', 'Chamelaucium',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = 'AustralianNativesGarden/1.0 (catalog image localization; educational/non-commercial)'

fs.mkdirSync(outDir, { recursive: true })

function binomial(name) {
  const clean = String(name).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/'[^']+'/g, '').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).join(' ')
}

function searchName(name) {
  return binomial(name) || String(name).split(/\s+/)[0]
}

function isLocal(url) {
  return Boolean(url && (url.startsWith('/catalog/') || url.startsWith('/')))
}

async function urlOk(url) {
  if (!url || isLocal(url)) return Boolean(url)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA, Range: 'bytes=0-128', Referer: '' },
      redirect: 'follow',
    })
    return res.ok || res.status === 206
  } catch {
    return false
  }
}

async function fromINaturalist(query) {
  const url = new URL('https://api.inaturalist.org/v1/taxa')
  url.searchParams.set('q', query)
  url.searchParams.set('per_page', '5')
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  const hits = data?.results || []
  for (const t of hits) {
    const photo = t.default_photo
    if (!photo?.medium_url && !photo?.url) continue
    const name = (t.name || '').toLowerCase()
    const q = query.toLowerCase()
    if (!name.includes(q.split(' ')[0]) && !q.includes(name.split(' ')[0])) continue
    return {
      url: photo.medium_url || photo.url,
      attribution: photo.attribution || `iNaturalist · ${t.name}`,
      license: photo.license_code || 'See iNaturalist',
      sourceLabel: 'iNaturalist',
    }
  }
  // fallback first with photo
  for (const t of hits) {
    const photo = t.default_photo
    if (!photo?.medium_url && !photo?.url) continue
    return {
      url: photo.medium_url || photo.url,
      attribution: photo.attribution || `iNaturalist · ${t.name}`,
      license: photo.license_code || 'See iNaturalist',
      sourceLabel: 'iNaturalist',
    }
  }
  return null
}

async function fromWikipedia(query) {
  const title = query.replace(/\s+/g, '_')
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  const src = data?.originalimage?.source || data?.thumbnail?.source
  if (!src) return null
  return {
    url: src,
    attribution: data?.titles?.display ? `Wikipedia · ${data.titles.display}` : 'Wikipedia',
    license: 'Wikipedia / source license',
    sourceLabel: 'Wikipedia',
  }
}

function cleanWikimediaUrl(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return url.split('?')[0]
  }
}

async function fromWikimediaSearch(query) {
  const api = new URL('https://commons.wikimedia.org/w/api.php')
  api.searchParams.set('action', 'query')
  api.searchParams.set('generator', 'search')
  api.searchParams.set('gsrsearch', query)
  api.searchParams.set('gsrnamespace', '6')
  api.searchParams.set('gsrlimit', '8')
  api.searchParams.set('prop', 'imageinfo')
  api.searchParams.set('iiprop', 'url|extmetadata|size|mime')
  api.searchParams.set('iiurlwidth', '1280')
  api.searchParams.set('format', 'json')
  api.searchParams.set('origin', '*')
  const res = await fetch(api, { headers: { 'User-Agent': UA } })
  if (res.status === 429) {
    await sleep(4000)
    return null
  }
  if (!res.ok) return null
  const data = await res.json()
  const pages = data?.query?.pages ? Object.values(data.query.pages) : []
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info?.url) continue
    if (info.mime && !/^image\/(jpeg|png|webp)/i.test(info.mime)) continue
    const title = (page.title || '').toLowerCase()
    if (/map|diagram|logo|flag|coat of arms|svg/i.test(title)) continue
    const artist = String(info.extmetadata?.Artist?.value || '')
      .replace(/<[^>]+>/g, '')
      .trim()
    return {
      url: cleanWikimediaUrl(info.thumburl || info.url),
      attribution: artist ? `${artist} · Wikimedia Commons` : 'Wikimedia Commons',
      license: info.extmetadata?.LicenseShortName?.value || 'See Commons',
      sourceLabel: 'Wikimedia Commons',
    }
  }
  return null
}

async function resolveRemote(scientificName, existingUrl) {
  const q = searchName(scientificName)
  const attempts = [
    () => fromINaturalist(q),
    () => fromWikipedia(q),
    () => fromWikimediaSearch(q),
    () => fromWikimediaSearch(scientificName.replace(/'/g, '')),
  ]
  for (const fn of attempts) {
    try {
      const hit = await fn()
      await sleep(350)
      if (hit?.url && (await urlOk(hit.url))) return hit
    } catch {
      await sleep(500)
    }
  }
  if (existingUrl && !isLocal(existingUrl)) {
    const cleaned = cleanWikimediaUrl(existingUrl)
    if (await urlOk(cleaned)) {
      return {
        url: cleaned,
        attribution: 'Wikimedia Commons',
        license: 'See source page',
        sourceLabel: 'Wikimedia Commons',
      }
    }
  }
  return null
}

function extFromContentType(ct, url) {
  if (ct?.includes('png')) return '.png'
  if (ct?.includes('webp')) return '.webp'
  if (ct?.includes('gif')) return '.gif'
  const m = String(url).match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i)
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg'
}

async function download(url, destBase) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 800) throw new Error('file too small')
  const ext = extFromContentType(res.headers.get('content-type'), url)
  const dest = `${destBase}${ext}`
  // remove prior extensions for this id
  for (const e of ['.jpg', '.jpeg', '.png', '.webp', '.gif']) {
    const p = `${destBase}${e}`
    if (p !== dest && fs.existsSync(p)) fs.unlinkSync(p)
  }
  fs.writeFileSync(dest, buf)
  return `/catalog/images/${path.basename(dest)}`
}

function shouldProcess(s) {
  if (genusArg) return s.genus === genusArg
  if (ALL) return true
  if (NEW_GENERA.has(s.genus)) return true
  if (!s.image_url) return true
  if (isLocal(s.image_url)) return false
  return false
}

const targets = species.filter(shouldProcess)
console.log(`Localizing images for ${targets.length} species → ${outDir}`)

let ok = 0
let fail = 0

for (const s of targets) {
  const id = s.legacy_id || s.scientific_name.replace(/\W+/g, '_').slice(0, 40)
  const destBase = path.join(outDir, String(id))
  process.stdout.write(`• ${s.scientific_name} … `)

  // Skip re-download if local file already exists and species already points to it
  if (isLocal(s.image_url)) {
    const localPath = path.join(root, 'public', s.image_url.replace(/^\//, ''))
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 800) {
      console.log('already local')
      ok++
      continue
    }
  }

  try {
    const remote = await resolveRemote(s.scientific_name, s.image_url)
    if (!remote) {
      console.log('no source')
      fail++
      continue
    }
    const localUrl = await download(remote.url, destBase)
    s.image_url = localUrl
    s.image_attribution = remote.attribution
    s.image_license = remote.license
    // Bundled catalog photos (CC / open sources) — treat as library assets
    s.image_source = 'library_cc'
    ok++
    console.log(`OK (${remote.sourceLabel})`)
  } catch (err) {
    fail++
    console.log('fail', err.message)
  }
  await sleep(250)
}

fs.writeFileSync(speciesPath, JSON.stringify(species, null, 2) + '\n')
console.log(`\nDone. Localized ${ok}, failed ${fail}. Updated species.json`)
