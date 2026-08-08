import { useEffect, useMemo, useState } from 'react'
import { SpeciesImage } from '../components/SpeciesImage'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { rankSpeciesForSite, type FitResult } from '../lib/fit'
import type { GardenSite, Species } from '../types/models'

export function FitPage() {
  const { effectiveUserId } = useAuth()
  const [sites, setSites] = useState<GardenSite[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [siteId, setSiteId] = useState('')
  const [results, setResults] = useState<FitResult[]>([])

  useEffect(() => {
    void (async () => {
      const speciesRows = await api.listSpecies()
      setSpecies(speciesRows)
      if (effectiveUserId) {
        const siteRows = await api.listSites(effectiveUserId)
        setSites(siteRows)
        if (siteRows[0]) setSiteId(siteRows[0].id)
      }
    })()
  }, [effectiveUserId])

  const site = useMemo(() => sites.find((s) => s.id === siteId) ?? null, [sites, siteId])

  useEffect(() => {
    if (!site) {
      setResults([])
      return
    }
    setResults(rankSpeciesForSite(species, site))
  }, [site, species])

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 grid gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Site fit helper</h2>
          <p className="text-sm text-slate-500 mt-1">
            Rank Australian natives for a garden site using soil, frost, drought hardiness, and mature size — useful before buying or sowing.
          </p>
        </div>

        {!sites.length ? (
          <p className="text-sm text-slate-600">Create a garden site first, then return here for suggestions.</p>
        ) : (
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider grid gap-1 max-w-md">
            Garden site
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal normal-case text-slate-800" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}

        {site && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold">{site.sun}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold">{site.soil || 'Soil unset'}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold">{site.frost_exposure || 'Frost unset'}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold">{site.approx_size || 'Size unset'}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map(({ species: s, score, reasons }) => (
          <article key={s.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="h-40 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-3">
              <SpeciesImage imageUrl={s.image_url} genus={s.genus} alt={s.common_name} className="max-w-full max-h-full" contain />
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-emerald-900 italic text-sm">{s.scientific_name}</h3>
                  <p className="text-slate-600 text-sm">{s.common_name}</p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Score {score}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{reasons.join(' · ')}</p>
              <p className="text-[11px] text-slate-400 mt-1">{s.soil_preference} · Frost {s.frost_tolerance}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
