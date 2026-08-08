import type { ReactNode } from 'react'

/** Renders simple $...$ germination snippets like the original tracker. */
export function renderLatex(text: string): ReactNode[] {
  if (!text) return []
  const parts = text.split(/(\$[^$]+\$)/g)
  return parts.map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const formatted = part
        .slice(1, -1)
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\circ/g, '°')
        .replace(/\\times/g, '×')
        .replace(/--/g, '–')
      return (
        <span
          key={index}
          className="font-serif italic bg-emerald-50 text-emerald-800 px-1 rounded border border-emerald-100 font-semibold text-xs whitespace-nowrap"
        >
          {formatted}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}
