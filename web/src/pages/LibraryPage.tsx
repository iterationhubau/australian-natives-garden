import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { FrostSymbol, SunSymbol, WaterDroplets } from '../components/PlantNeeds'
import { SpeciesDetailPanel } from '../components/SpeciesDetailPanel'
import { SpeciesImage } from '../components/SpeciesImage'
import { Toast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { PlantSource, Species } from '../types/models'

const GENERA = [
  'All',
  'Acacia',
  'Anigozanthos',
  'Banksia',
  'Callistemon',
  'Chamelaucium',
  'Correa',
  'Dianella',
  'Eucalyptus',
  'Grevillea',
  'Hakea',
  'Hardenbergia',
  'Lomandra',
  'Melaleuca',
  'Westringia',
] as const

function conservationClass(status: string) {
  if (!status || status === 'Least Concern') return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  return 'bg-rose-50 text-rose-700 border border-rose-200'
}

function loadViewMode(): 'list' | 'grid' {
  const saved = localStorage.getItem('au_natives_library_view')
  return saved === 'list' ? 'list' : 'grid'
}

export function LibraryPage() {
  const { effectiveUserId } = useAuth()
  const [species, setSpecies] = useState<Species[]>([])
  const [q, setQ] = useState('')
  const [genus, setGenus] = useState<(typeof GENERA)[number]>('All')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(loadViewMode)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const dismissToast = useCallback(() => setToast(''), [])

  async function reloadSpecies() {
    const rows = await api.listSpecies()
    setSpecies(rows)
    setLoading(false)
  }

  useEffect(() => {
    void reloadSpecies()
  }, [])

  useEffect(() => {
    localStorage.setItem('au_natives_library_view', viewMode)
  }, [viewMode])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return species.filter((s) => {
      if (genus !== 'All' && s.genus !== genus) return false
      if (!query) return true
      return [s.scientific_name, s.common_name, s.flowering_time, s.soil_preference, s.genus]
        .some((v) => v.toLowerCase().includes(query))
    })
  }, [species, q, genus])

  const active = useMemo(
    () => (activeId ? species.find((s) => s.id === activeId) ?? null : null),
    [activeId, species],
  )

  function openDetails(id: string) {
    setActiveId(id)
  }

  function closeDetails() {
    setActiveId(null)
  }

  async function saveSpecies(id: string, patch: Partial<Omit<Species, 'id' | 'legacy_id'>>) {
    await api.updateSpecies(id, patch)
    await reloadSpecies()
    setToast('Library entry saved')
  }

  async function addToGarden(s: Species, source: PlantSource) {
    if (!effectiveUserId) {
      setToast('Sign in (or use local mode) to add plants')
      return
    }
    await api.addPlant(effectiveUserId, {
      species_id: s.id,
      custom_name: s.common_name,
      source,
      quantity: source === 'seed' ? '1 packet' : '1',
    })
    setToast(`Added to My plants · ${source}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && <Toast message={toast} onDismiss={dismissToast} />}

      <Modal open={Boolean(active)} onClose={closeDetails} size="xl">
        {active && (
          <SpeciesDetailPanel
            species={active}
            onClose={closeDetails}
            onAdd={(source) => void addToGarden(active, source)}
            onSave={(patch) => saveSpecies(active.id, patch)}
          />
        )}
      </Modal>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Icon name="search" />
            </div>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search species, common name, flowering…"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" aria-label="Clear search">
                <Icon name="x" className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/50' : 'text-slate-400'}`}
                title="Large cards"
                aria-pressed={viewMode === 'grid'}
              >
                <Icon name="grid" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/50' : 'text-slate-400'}`}
                title="List"
                aria-pressed={viewMode === 'list'}
              >
                <Icon name="list" />
              </button>
            </div>
            <p className="text-xs text-slate-500 tabular-nums">
              {filtered.length} of {species.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {GENERA.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenus(g)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                genus === g ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 m-0">
          Open <strong className="font-semibold text-slate-500">Details</strong> for a floating profile card. Esc or backdrop closes.
          {' '}Added plants go to <Link className="text-emerald-700 font-semibold hover:underline" to="/my-plants">My plants</Link>.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading library…</p>
      ) : !filtered.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
          No matches. Try another search or genus filter.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const selected = activeId === s.id
            return (
              <article
                key={s.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
                  selected ? 'ring-2 ring-emerald-600 border-emerald-600' : 'border-slate-200'
                }`}
              >
                <div
                  className="relative bg-slate-100 h-52 flex items-center justify-center border-b border-slate-100 cursor-pointer"
                  onClick={() => openDetails(s.id)}
                >
                  <SpeciesImage
                    key={`${s.id}-${s.image_url}`}
                    imageUrl={s.image_url}
                    genus={s.genus}
                    alt={s.common_name}
                    className="w-full h-full"
                    contain
                  />
                  <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                    {s.genus}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold italic text-slate-900 leading-tight">{s.scientific_name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{s.common_name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block shrink-0 ${conservationClass(s.conservation_status)}`}>
                      {s.conservation_status || 'Least Concern'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1.5 mt-3 text-xs divide-x divide-slate-200">
                    <span className="inline-flex items-center gap-1.5 text-slate-700 pr-3" title={s.shade_tolerance || 'Full sun'}>
                      <SunSymbol level={s.shade_tolerance || 'Full sun'} className="h-4 w-4" />
                      <span className="font-medium truncate">{s.shade_tolerance || 'Full sun'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-700 px-3" title={`Water ${s.water_requirement || 4}/8`}>
                      <WaterDroplets level={s.water_requirement || 4} />
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-700 pl-3" title={s.frost_tolerance || 'Frost n/a'}>
                      <FrostSymbol frost={s.frost_tolerance || ''} className="h-4 w-4" />
                      <span className="font-medium truncate">{s.frost_tolerance || '—'}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Flowering Time</span>
                      <span className="font-semibold text-slate-700 mt-0.5 block">{s.flowering_time || '—'}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Height / Width</span>
                      <span className="font-semibold text-slate-700 mt-0.5 block text-[11px] truncate" title={`${s.mature_height} × ${s.mature_width}`}>
                        {s.mature_height || 'N/A'}
                        {s.mature_width ? ` · ${s.mature_width}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  <p className="text-[11px] text-slate-400 truncate">
                    {s.soil_preference || 'Soil n/a'}
                  </p>
                  <button
                    type="button"
                    onClick={() => openDetails(s.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors shrink-0 bg-slate-200 text-slate-800 hover:bg-emerald-800 hover:text-white"
                  >
                    Details
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <th className="w-10 px-3 py-2.5 text-center">#</th>
                  <th className="w-16 px-2 py-2.5 text-center">Photo</th>
                  <th className="px-3 py-2.5">Scientific name</th>
                  <th className="px-3 py-2.5">Common name</th>
                  <th className="px-2 py-2.5 text-center">Genus</th>
                  <th className="px-3 py-2.5 text-center">Flowering</th>
                  <th className="px-2 py-2.5 text-center">Status</th>
                  <th className="w-24 px-2 py-2.5 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`group cursor-pointer transition-colors ${activeId === s.id ? 'bg-emerald-50/60' : 'bg-white hover:bg-slate-50'}`}
                    onClick={() => openDetails(s.id)}
                  >
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-2 py-2 text-center">
                      <div className="mx-auto w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <SpeciesImage key={`${s.id}-${s.image_url}`} imageUrl={s.image_url} genus={s.genus} alt={s.common_name} className="w-full h-full" contain />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-emerald-800 italic">{s.scientific_name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{s.common_name}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold">{s.genus}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-600">{s.flowering_time}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${conservationClass(s.conservation_status)}`}>
                        {s.conservation_status || 'Least Concern'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openDetails(s.id)}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-800 hover:text-white"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
