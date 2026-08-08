import { useCallback, useEffect, useState } from 'react'

/** Toggle an expanded row/card id, close on Escape, and scroll it into view. */
export function useExpand() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const toggle = useCallback((id: string) => {
    setActiveId((current) => {
      const next = current === id ? null : id
      if (next) {
        window.requestAnimationFrame(() => {
          document.getElementById(`expand-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }
      return next
    })
  }, [])

  const close = useCallback(() => setActiveId(null), [])

  useEffect(() => {
    if (!activeId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId])

  return { activeId, setActiveId, toggle, close }
}
