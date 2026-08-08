import { UPLOAD_QUOTA, type UploadQuota } from '../types/models'

export async function searchWikimedia(query: string, limit = 8) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrsearch', query)
  url.searchParams.set('gsrlimit', String(limit))
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|extmetadata|size')
  url.searchParams.set('iiurlwidth', '800')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Image search failed')
  const data = await res.json()
  const pages = data?.query?.pages ? Object.values(data.query.pages) as Array<{
    title: string
    imageinfo?: Array<{
      url: string
      thumburl?: string
      size?: number
      extmetadata?: {
        Artist?: { value?: string }
        LicenseShortName?: { value?: string }
      }
    }>
  }> : []

  return pages
    .map((page) => {
      const info = page.imageinfo?.[0]
      if (!info?.url) return null
      const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? 'Wikimedia Commons'
      const license = info.extmetadata?.LicenseShortName?.value ?? 'See Commons'
      return {
        title: page.title,
        url: info.thumburl || info.url,
        fullUrl: info.url,
        attribution: artist,
        license,
        byteSize: info.size ?? 0,
      }
    })
    .filter(Boolean) as Array<{
      title: string
      url: string
      fullUrl: string
      attribution: string
      license: string
      byteSize: number
    }>
}

export function compressImage(file: File, maxDim = 1280, quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) reject(new Error('Compression failed'))
          else resolve(blob)
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read image'))
    }
    img.src = objectUrl
  })
}

export function computeQuota(usedCount: number, usedBytes: number): UploadQuota {
  return {
    maxCount: UPLOAD_QUOTA.maxCount,
    maxBytesTotal: UPLOAD_QUOTA.maxBytesTotal,
    maxBytesPerFile: UPLOAD_QUOTA.maxBytesPerFile,
    usedCount,
    usedBytes,
  }
}

export function canUpload(quota: UploadQuota, nextBytes: number): string | null {
  if (quota.usedCount >= quota.maxCount) {
    return `Upload limit reached (${quota.maxCount} progress photos). Remove an old photo to upload another.`
  }
  if (nextBytes > quota.maxBytesPerFile) {
    return `Each progress photo must be under ${Math.round(quota.maxBytesPerFile / (1024 * 1024))} MB after compression.`
  }
  if (quota.usedBytes + nextBytes > quota.maxBytesTotal) {
    return `Storage limit reached (${Math.round(quota.maxBytesTotal / (1024 * 1024))} MB). Remove older progress photos.`
  }
  return null
}

export function stripLatex(text: string): string {
  return text
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\circ/g, '°')
    .replace(/\\--/g, '–')
    .replace(/\\,/g, '')
}
