import { ImagePicker } from './ImagePicker'
import { PlantNeedsBar } from './PlantNeeds'
import { SpeciesImage } from './SpeciesImage'
import { renderLatex } from '../lib/latex'
import type {
  GardenSite,
  GermStatus,
  PlantImage,
  Planting,
  PlantSource,
  Species,
  UserPlant,
} from '../types/models'

const STATUSES: GermStatus[] = ['Unstarted', 'Pre-treating', 'Planted', 'Germinated', 'Failed']
const SOURCES: PlantSource[] = ['seed', 'purchase', 'wishlist']

type Props = {
  plant: UserPlant
  species?: Species
  sites: GardenSite[]
  planting?: Planting
  images: PlantImage[]
  quotaLabel: string
  busy: boolean
  onClose: () => void
  onSave: (patch: Partial<UserPlant>) => void
  onAssignSite: (siteId: string) => void
  onRemoveSite: () => void
  onAddLinkedImage: (input: { url: string; attribution: string; source: 'library_cc' | 'web_link' }) => void
  onUpload: (file: File) => void
  onDeleteImage: (image: PlantImage) => void
  onDeletePlant: () => void
}

export function MyPlantDetailPanel({
  plant,
  species,
  sites,
  planting,
  images,
  quotaLabel,
  busy,
  onClose,
  onSave,
  onAssignSite,
  onRemoveSite,
  onAddLinkedImage,
  onUpload,
  onDeleteImage,
  onDeletePlant,
}: Props) {
  const threatened = Boolean(species?.conservation_status && species.conservation_status !== 'Least Concern')
  const title = species?.scientific_name || plant.custom_name || 'Plant'
  const common = plant.custom_name || species?.common_name || ''

  return (
    <div className="bg-white leading-relaxed">
      <div className="relative bg-slate-100 h-64 sm:h-80 border-b border-slate-200">
        <SpeciesImage
          key={species?.image_url || images[0]?.url || ''}
          imageUrl={species?.image_url || images[0]?.url}
          genus={species?.genus || 'Other'}
          alt={common}
          className="w-full h-full"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 via-slate-900/25 to-transparent px-4 pb-3 pt-10">
          <h3 className="font-bold italic text-white text-lg leading-tight m-0 drop-shadow">{title}</h3>
          <p className="text-emerald-100 text-sm m-0 mt-0.5 drop-shadow">{common}</p>
        </div>
        {species?.genus && (
          <span className="absolute top-3 right-3 bg-white/95 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {species.genus}
          </span>
        )}
      </div>

      <div className="sticky top-0 z-10 px-4 sm:px-5 py-2.5 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500 m-0 truncate">Plant profile</p>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-slate-500 hover:text-emerald-800 px-2 py-1">
          Close ✕
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {species && (
          <PlantNeedsBar
            shade={species.shade_tolerance || 'Full sun'}
            water={species.water_requirement || 4}
            drought={species.drought_tolerance}
            frost={species.frost_tolerance}
          />
        )}

        <label className="block">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Common / display name</span>
          <input
            value={plant.custom_name}
            onChange={(e) => onSave({ custom_name: e.target.value })}
            placeholder={species?.common_name || 'Add a name…'}
            className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </label>

      {/* Species reference — same informative layout as Library */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          {species && (
            <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conservation Status</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                  threatened
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {species.conservation_status || 'Least Concern'}
                </span>
              </div>
              <div className="text-[10px] mt-1.5 leading-normal text-slate-600">
                <p className="font-semibold text-slate-700">Native Range: {species.conservation_locale || 'Australia'}</p>
                <p className="mt-0.5 text-slate-500">{species.conservation_description || 'Secure in endemic habitats.'}</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/50 rounded-xl p-3 shadow-xs grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Sown Date</span>
              <input
                type="date"
                value={plant.sow_date || ''}
                onChange={(e) => onSave({ sow_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] mt-1 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Germinated Date</span>
              <input
                type="date"
                value={plant.germ_date || ''}
                disabled={plant.germ_status !== 'Germinated'}
                onChange={(e) => onSave({ germ_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] mt-1 outline-none disabled:opacity-40"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Field Log Notes</span>
              <textarea
                rows={2}
                value={plant.notes}
                onChange={(e) => onSave({ notes: e.target.value })}
                placeholder="Potting logs, temperatures, results…"
                className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] outline-none"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-xs">
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Growth Rate</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">{species?.growth_rate || '—'}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-xs">
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Max Height</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">{species?.mature_height || '—'}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-xs">
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Max Width</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">{species?.mature_width || '—'}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
            <label className="grid gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Source</span>
              <select
                value={plant.source}
                onChange={(e) => onSave({ source: e.target.value as PlantSource })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
              >
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Sow status</span>
              <select
                value={plant.germ_status}
                onChange={(e) => onSave({ germ_status: e.target.value as GermStatus })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Quantity</span>
              <input
                value={plant.quantity}
                onChange={(e) => onSave({ quantity: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Garden site</span>
              <select
                value={planting?.garden_site_id ?? ''}
                onChange={(e) => {
                  const siteId = e.target.value
                  if (!siteId) onRemoveSite()
                  else onAssignSite(siteId)
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
              >
                <option value="">Not placed</option>
                {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cultivation Metrics</span>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 shrink-0">Soil Preference:</span>
                <span className="font-semibold text-slate-700 text-right">{species?.soil_preference || '—'}</span>
              </div>
            </div>
          </div>

          <div className="text-xs space-y-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foliage Description</span>
              <p className="text-slate-600 leading-relaxed mt-0.5">{species?.foliage || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flowers</span>
              <p className="text-slate-600 leading-relaxed mt-0.5">{species?.flowers || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pretreatment</span>
              <p className="text-slate-600 leading-relaxed mt-0.5">{species?.pretreatment || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sowing Guide</span>
              <p className="text-slate-600 leading-relaxed mt-0.5">
                {species?.germination ? renderLatex(species.germination) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal photos & actions */}
      <div className="border-t border-slate-200 pt-4 grid gap-3">
        <div>
          <h3 className="text-sm font-bold text-emerald-900 m-0">Your photos & links</h3>
          <p className="text-[11px] text-slate-500 m-0 mt-0.5">Progress photo quota: {quotaLabel}. Linked web/CC images do not count.</p>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden bg-white aspect-square border border-slate-200">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <button
                    type="button"
                    onClick={() => onDeleteImage(img)}
                    className="text-white hover:text-rose-300 text-[11px] font-bold"
                  >
                    Remove
                  </button>
                </div>
                <p className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5">{img.source}</p>
              </div>
            ))}
          </div>
        )}

        <ImagePicker
          queryHint={species?.scientific_name || plant.custom_name}
          onPick={(r) => onAddLinkedImage({ url: r.url, attribution: r.attribution, source: 'library_cc' })}
          onLink={(url) => onAddLinkedImage({ url, attribution: 'User-linked image', source: 'web_link' })}
        />

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl">
            {busy ? 'Uploading…' : 'Upload progress photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUpload(file)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            onClick={onDeletePlant}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl"
          >
            Delete plant
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
