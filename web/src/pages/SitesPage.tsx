import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { GardenSite, Planting, Species, SunExposure, UserPlant } from '../types/models'

const SUN: SunExposure[] = ['Full sun', 'Part shade', 'Shade', 'Mixed']

export function SitesPage() {
  const { effectiveUserId } = useAuth()
  const [sites, setSites] = useState<GardenSite[]>([])
  const [plants, setPlants] = useState<UserPlant[]>([])
  const [plantings, setPlantings] = useState<Planting[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [form, setForm] = useState({
    name: '',
    approx_size: '',
    sun: 'Full sun' as SunExposure,
    soil: '',
    frost_exposure: '',
    notes: '',
  })

  const refresh = useCallback(async () => {
    if (!effectiveUserId) return
    const [siteRows, plantRows, plantingRows, speciesRows] = await Promise.all([
      api.listSites(effectiveUserId),
      api.listPlants(effectiveUserId),
      api.listPlantings(effectiveUserId),
      api.listSpecies(),
    ])
    setSites(siteRows)
    setPlants(plantRows)
    setPlantings(plantingRows)
    setSpecies(speciesRows)
  }, [effectiveUserId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const speciesById = useMemo(() => new Map(species.map((s) => [s.id, s])), [species])
  const plantById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants])

  if (!effectiveUserId) {
    return <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-sm text-slate-600">Sign in to manage garden sites.</div>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 grid gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Garden sites</h2>
          <p className="text-sm text-slate-500 mt-1">Define beds and areas, then assign plants from My plants.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider grid gap-1">Name
            <input className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal normal-case text-slate-800" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Front verge bed" />
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider grid gap-1">Approx size
            <input className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal normal-case text-slate-800" value={form.approx_size} onChange={(e) => setForm({ ...form, approx_size: e.target.value })} placeholder="3m x 2m" />
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider grid gap-1">Sun
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal normal-case text-slate-800" value={form.sun} onChange={(e) => setForm({ ...form, sun: e.target.value as SunExposure })}>
              {SUN.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider grid gap-1">Soil
            <input className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal normal-case text-slate-800" value={form.soil} onChange={(e) => setForm({ ...form, soil: e.target.value })} placeholder="Sandy loam, well drained" />
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider grid gap-1">Frost exposure
            <input className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal normal-case text-slate-800" value={form.frost_exposure} onChange={(e) => setForm({ ...form, frost_exposure: e.target.value })} placeholder="Light frost / none" />
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider grid gap-1">Notes
            <input className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal normal-case text-slate-800" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <button
          type="button"
          disabled={!form.name.trim()}
          className="w-fit bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-3.5 py-2 rounded-xl"
          onClick={() => {
            void api.addSite(effectiveUserId, form).then(() => {
              setForm({ name: '', approx_size: '', sun: 'Full sun', soil: '', frost_exposure: '', notes: '' })
              return refresh()
            })
          }}
        >
          Add site
        </button>
      </div>

      <div className="grid gap-3">
        {sites.map((site) => {
          const assigned = plantings.filter((p) => p.garden_site_id === site.id)
          return (
            <article key={site.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-emerald-900">{site.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{site.sun} · {site.approx_size || 'Size n/a'} · {site.soil || 'Soil n/a'}</p>
                  {site.frost_exposure && <p className="text-xs text-slate-500">Frost: {site.frost_exposure}</p>}
                  {site.notes && <p className="text-sm text-slate-600 mt-1">{site.notes}</p>}
                </div>
                <button type="button" className="text-xs font-bold text-rose-700 hover:underline" onClick={() => void api.deleteSite(site.id).then(refresh)}>Delete</button>
              </div>
              <div className="mt-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Plants here</h4>
                {!assigned.length ? (
                  <p className="text-sm text-slate-400 italic">Nothing assigned yet. Open a plant and choose this site.</p>
                ) : (
                  <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
                    {assigned.map((planting) => {
                      const plant = plantById.get(planting.user_plant_id)
                      const sp = plant?.species_id ? speciesById.get(plant.species_id) : undefined
                      return (
                        <li key={planting.id}>
                          {plant?.custom_name || sp?.common_name || 'Plant'}
                          {sp ? ` (${sp.scientific_name})` : ''}
                          {planting.is_planned ? ' — planned' : ' — planted'}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
