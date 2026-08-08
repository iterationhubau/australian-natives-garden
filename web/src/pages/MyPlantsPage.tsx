import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { MyPlantDetailPanel } from '../components/MyPlantDetailPanel'
import { SpeciesImage } from '../components/SpeciesImage'
import { Toast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { GardenSite, GermStatus, PlantImage, Planting, PlantSource, Species, UserPlant } from '../types/models'

const STATUSES: GermStatus[] = ['Unstarted', 'Pre-treating', 'Planted', 'Germinated', 'Failed']
const SOURCES: PlantSource[] = ['seed', 'purchase', 'wishlist']

export function MyPlantsPage() {
  const { effectiveUserId } = useAuth()
  const [plants, setPlants] = useState<UserPlant[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [sites, setSites] = useState<GardenSite[]>([])
  const [plantings, setPlantings] = useState<Planting[]>([])
  const [images, setImages] = useState<PlantImage[]>([])
  const [filter, setFilter] = useState<'all' | PlantSource>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [quotaLabel, setQuotaLabel] = useState('')
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok')
  const [busy, setBusy] = useState(false)
  const dismissToast = useCallback(() => setToast(''), [])

  const refresh = useCallback(async () => {
    if (!effectiveUserId) return
    const [p, s, siteRows, plantingRows, imageRows, quota] = await Promise.all([
      api.listPlants(effectiveUserId),
      api.listSpecies(),
      api.listSites(effectiveUserId),
      api.listPlantings(effectiveUserId),
      api.listImages(effectiveUserId),
      api.getUploadQuota(effectiveUserId),
    ])
    setPlants(p)
    setSpecies(s)
    setSites(siteRows)
    setPlantings(plantingRows)
    setImages(imageRows)
    setQuotaLabel(`${quota.usedCount}/${quota.maxCount} uploads`)
  }, [effectiveUserId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const byId = useMemo(() => new Map(species.map((s) => [s.id, s])), [species])
  const filtered = plants.filter((p) => filter === 'all' || p.source === filter)
  const counts = useMemo(() => ({
    all: plants.length,
    seed: plants.filter((p) => p.source === 'seed').length,
    purchase: plants.filter((p) => p.source === 'purchase').length,
    wishlist: plants.filter((p) => p.source === 'wishlist').length,
  }), [plants])

  const active = useMemo(
    () => (activeId ? plants.find((p) => p.id === activeId) ?? null : null),
    [activeId, plants],
  )
  const activeSpecies = active?.species_id ? byId.get(active.species_id) : undefined
  const activeImages = active ? images.filter((i) => i.user_plant_id === active.id) : []
  const activePlanting = active ? plantings.find((p) => p.user_plant_id === active.id) : undefined

  if (!effectiveUserId) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-sm text-slate-600">
        Sign in with Google to sync your plants across devices.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && <Toast message={toast} onDismiss={dismissToast} tone={toastTone} />}

      <Modal open={Boolean(active)} onClose={() => setActiveId(null)} size="xl">
        {active && (
          <MyPlantDetailPanel
            plant={active}
            species={activeSpecies}
            sites={sites}
            planting={activePlanting}
            images={activeImages}
            quotaLabel={quotaLabel}
            busy={busy}
            onClose={() => setActiveId(null)}
            onSave={(patch) => {
              void api.updatePlant(active.id, patch).then(refresh)
            }}
            onAssignSite={(siteId) => {
              void api.assignPlanting(effectiveUserId, {
                user_plant_id: active.id,
                garden_site_id: siteId,
                is_planned: true,
              }).then(() => {
                setToast('Assigned to site')
                setToastTone('ok')
                return refresh()
              })
            }}
            onRemoveSite={() => {
              if (activePlanting) void api.removePlanting(activePlanting.id).then(refresh)
            }}
            onAddLinkedImage={(input) => {
              void api.addLinkedImage(effectiveUserId, {
                user_plant_id: active.id,
                species_id: active.species_id,
                ...input,
              }).then(refresh)
            }}
            onUpload={(file) => {
              setBusy(true)
              void api.uploadProgressPhoto(effectiveUserId, active.id, file)
                .then(() => {
                  setToast('Photo uploaded')
                  setToastTone('ok')
                  return refresh()
                })
                .catch((err: Error) => {
                  setToast(err.message)
                  setToastTone('error')
                })
                .finally(() => setBusy(false))
            }}
            onDeleteImage={(image) => {
              void api.deleteImage(effectiveUserId, image).then(refresh)
            }}
            onDeletePlant={() => {
              void api.deletePlant(active.id).then(() => {
                setActiveId(null)
                setToast('Plant removed')
                setToastTone('ok')
                return refresh()
              })
            }}
          />
        )}
      </Modal>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 m-0">My plants</h2>
            <p className="text-sm text-slate-500 mt-1 m-0">
              Open a row for a floating profile with species info, sowing log, site, and photos.
            </p>
          </div>
          <Link to="/" className="text-xs font-bold text-emerald-700 hover:underline bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
            + Add from library
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...SOURCES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${filter === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s} <span className="opacity-70">({counts[s]})</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 m-0">
          Progress photos: {quotaLabel || '…'} · Esc or backdrop closes
        </p>
      </div>

      {!filtered.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-sm text-slate-600 space-y-2">
          <p className="m-0">Nothing in this list yet.</p>
          <Link to="/" className="inline-flex font-bold text-emerald-700 hover:underline">Browse the library →</Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <th className="w-10 px-3 py-2.5 text-center">#</th>
                  <th className="w-16 px-2 py-2.5 text-center">Photo</th>
                  <th className="px-3 py-2.5">Plant</th>
                  <th className="px-2 py-2.5 text-center">Source</th>
                  <th className="px-2 py-2.5 text-center">Sow status</th>
                  <th className="w-24 px-2 py-2.5 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((plant, idx) => {
                  const sp = plant.species_id ? byId.get(plant.species_id) : undefined
                  const plantImages = images.filter((i) => i.user_plant_id === plant.id)
                  const selected = activeId === plant.id

                  return (
                    <tr
                      key={plant.id}
                      className={`group cursor-pointer ${selected ? 'bg-emerald-50/60' : 'bg-white hover:bg-slate-50'}`}
                      onClick={() => setActiveId(plant.id)}
                    >
                      <td className="px-3 py-2.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-2 py-2 text-center">
                        <div className="mx-auto w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <SpeciesImage
                            key={`${plant.id}-${sp?.image_url || plantImages[0]?.url || ''}`}
                            imageUrl={sp?.image_url || plantImages[0]?.url}
                            genus={sp?.genus || 'Other'}
                            alt=""
                            className="w-full h-full"
                            contain
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-emerald-800 italic">
                          {sp?.scientific_name || plant.custom_name || 'Unnamed'}
                        </div>
                        <div className="text-slate-600 text-xs">{plant.custom_name || sp?.common_name}</div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold capitalize">{plant.source}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={plant.germ_status}
                          onChange={(e) => void api.updatePlant(plant.id, { germ_status: e.target.value as GermStatus }).then(refresh)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveId(plant.id)}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-800 hover:text-white"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
