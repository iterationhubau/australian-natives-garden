import { useEffect, useState } from 'react'
import { GenusIllustration } from './GenusIllustration'
import { assetUrl } from '../lib/assetUrl'

type Props = {
  imageUrl?: string
  genus: string
  alt?: string
  className?: string
  contain?: boolean
}

/** Prefer local catalog paths; strip tracking query junk from remote URLs. */
function normalizeSrc(url: string): string {
  const src = url.trim()
  if (!src) return ''
  // App-relative (e.g. /catalog/images/114.jpg) — honor Vite base for GitHub Pages
  if (src.startsWith('/') && !src.startsWith('//')) {
    return assetUrl(src)
  }
  try {
    const u = new URL(src)
    // Wikimedia thumb URLs work more reliably without campaign query params
    if (u.hostname.includes('wikimedia.org') || u.hostname.includes('wikipedia.org')) {
      u.search = ''
      u.hash = ''
      return u.toString()
    }
  } catch {
    /* keep raw */
  }
  return assetUrl(src)
}

export function SpeciesImage({ imageUrl, genus, alt = '', className = '', contain = false }: Props) {
  const [failed, setFailed] = useState(false)
  const src = normalizeSrc(imageUrl || '')

  // Reset error state whenever the URL changes (e.g. after editing library photo)
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 ${className}`}>
        <GenusIllustration genus={genus} className="w-12 h-12" />
      </div>
    )
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className={`${contain ? 'object-contain' : 'object-cover'} ${className}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
