/** Resolve app-relative paths against Vite/GitHub Pages base (e.g. /australian-natives-garden/). */
export function assetUrl(url?: string | null): string {
  const src = (url || '').trim()
  if (!src) return ''
  if (/^(https?:|data:|blob:)/i.test(src)) return src
  const base = import.meta.env.BASE_URL || '/'
  if (src.startsWith('/')) {
    return `${base.replace(/\/$/, '')}${src}`
  }
  return `${base}${src.replace(/^\.\//, '')}`
}
