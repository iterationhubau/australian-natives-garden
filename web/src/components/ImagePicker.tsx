import { useState } from 'react'
import { searchWikimedia } from '../lib/images'

type Props = {
  queryHint: string
  onPick: (result: { url: string; attribution: string; license: string }) => void
  onLink: (url: string) => void
}

export function ImagePicker({ queryHint, onPick, onLink }: Props) {
  const [query, setQuery] = useState(queryHint)
  const [url, setUrl] = useState('')
  const [results, setResults] = useState<Array<{ title: string; url: string; attribution: string; license: string }>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function runSearch() {
    setBusy(true)
    setError('')
    try {
      const found = await searchWikimedia(query.trim() || queryHint)
      setResults(found)
      if (!found.length) setError('No Wikimedia Commons results. Try another name or paste a URL.')
    } catch {
      setError('Search failed. Check your connection or paste a URL instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 grid gap-3">
      <div className="grid gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Creative Commons (Wikimedia)</label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scientific name"
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
          />
          <button type="button" disabled={busy} onClick={() => void runSearch()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 rounded-xl">
            {busy ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-slate-500 m-0">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {results.map((r) => (
          <button
            key={r.url}
            type="button"
            className="bg-white border border-slate-200 rounded-xl p-2 text-left hover:border-emerald-500"
            onClick={() => onPick({ url: r.url, attribution: `${r.attribution} · ${r.license}`, license: r.license })}
          >
            <img className="w-full h-24 object-contain" src={r.url} alt={r.title} loading="lazy" />
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{r.attribution} · {r.license}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or paste image URL</label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!url.trim()}
            className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-sm font-semibold px-3 py-2 rounded-xl"
            onClick={() => onLink(url.trim())}
          >
            Link
          </button>
        </div>
      </div>
    </div>
  )
}
