import { useEffect, useState } from 'react'
import { ImagePicker } from './ImagePicker'
import { FrostSymbol, PlantNeedsBar, SHADE_OPTIONS, WaterDroplets, SunSymbol } from './PlantNeeds'
import { SpeciesImage } from './SpeciesImage'
import { renderLatex } from '../lib/latex'
import type { PlantSource, ShadeTolerance, Species, WaterRequirement } from '../types/models'

type Editable = Omit<Species, 'id' | 'legacy_id'>

type Props = {
  species: Species
  onClose: () => void
  onAdd: (source: PlantSource) => void
  onSave: (patch: Partial<Editable>) => Promise<void> | void
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      )}
    </label>
  )
}

function normalizeSpecies(s: Species): Editable {
  return {
    ...s,
    shade_tolerance: s.shade_tolerance || 'Full sun',
    water_requirement: (s.water_requirement || 4) as WaterRequirement,
  }
}

export function SpeciesDetailPanel({ species, onClose, onAdd, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Editable>(() => normalizeSpecies(species))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setDraft(normalizeSpecies(species))
    setEditing(false)
    setMessage('')
  }, [species])

  const threatened = draft.conservation_status && draft.conservation_status !== 'Least Concern'

  function setField<K extends keyof Editable>(key: K, value: Editable[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      await onSave({
        scientific_name: draft.scientific_name,
        common_name: draft.common_name,
        genus: draft.genus,
        pretreatment: draft.pretreatment,
        germination: draft.germination,
        growth_rate: draft.growth_rate,
        mature_height: draft.mature_height,
        mature_width: draft.mature_width,
        foliage: draft.foliage,
        flowers: draft.flowers,
        flowering_time: draft.flowering_time,
        soil_preference: draft.soil_preference,
        frost_tolerance: draft.frost_tolerance,
        drought_tolerance: draft.drought_tolerance,
        shade_tolerance: draft.shade_tolerance,
        water_requirement: draft.water_requirement,
        conservation_status: draft.conservation_status,
        conservation_locale: draft.conservation_locale,
        conservation_description: draft.conservation_description,
        image_url: draft.image_url,
        image_attribution: draft.image_attribution,
        image_license: draft.image_license,
        image_source: draft.image_source,
      })
      setEditing(false)
      setMessage('Library entry saved.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white leading-relaxed" onClick={(e) => e.stopPropagation()}>
      {/* Large hero image */}
      <div className="relative bg-slate-100 h-64 sm:h-80 border-b border-slate-200">
        <SpeciesImage
          key={draft.image_url}
          imageUrl={draft.image_url}
          genus={draft.genus}
          alt={draft.common_name}
          className="w-full h-full"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 via-slate-900/25 to-transparent px-4 pb-3 pt-10">
          <h3 className="font-bold italic text-white text-lg sm:text-xl leading-tight m-0 drop-shadow">{draft.scientific_name}</h3>
          <p className="text-emerald-100 text-sm m-0 mt-0.5 drop-shadow">{draft.common_name}</p>
        </div>
        <span className="absolute top-3 right-3 bg-white/95 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
          {draft.genus}
        </span>
      </div>

      <div className="sticky top-0 z-10 px-4 sm:px-5 py-2.5 bg-white/95 backdrop-blur border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <>
              <button type="button" onClick={() => onAdd('seed')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">+ Seed</button>
              <button type="button" onClick={() => onAdd('purchase')} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg">+ Bought</button>
              <button type="button" onClick={() => onAdd('wishlist')} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg">+ Wishlist</button>
              <button type="button" onClick={() => setEditing(true)} className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Edit</button>
            </>
          ) : (
            <>
              <button type="button" disabled={saving} onClick={() => void save()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(normalizeSpecies(species))
                  setEditing(false)
                }}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-slate-500 hover:text-emerald-800 px-2 py-1">
          Close ✕
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {message && <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 m-0">{message}</p>}

        {!editing ? (
          <PlantNeedsBar
            shade={draft.shade_tolerance}
            water={draft.water_requirement}
            drought={draft.drought_tolerance}
            frost={draft.frost_tolerance}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <label className="grid gap-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <SunSymbol level={draft.shade_tolerance} className="h-4 w-4" /> Light
              </span>
              <select
                value={draft.shade_tolerance}
                onChange={(e) => setField('shade_tolerance', e.target.value as ShadeTolerance)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5"
              >
                {SHADE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Water need (1–8)</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={draft.water_requirement}
                  onChange={(e) => setField('water_requirement', Number(e.target.value) as WaterRequirement)}
                  className="flex-1"
                />
                <WaterDroplets level={draft.water_requirement} />
              </div>
              <span className="text-[11px] text-slate-600">{draft.water_requirement}/8 droplets</span>
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FrostSymbol frost={draft.frost_tolerance} className="h-4 w-4" /> Frost
              </span>
              <input
                value={draft.frost_tolerance}
                onChange={(e) => setField('frost_tolerance', e.target.value)}
                placeholder="e.g. Moderate (-5°C)"
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <Field label="Drought tolerance" value={draft.drought_tolerance} onChange={(v) => setField('drought_tolerance', v)} />
          </div>
        )}

        {(draft.image_attribution || draft.image_license) && !editing && (
          <p className="text-[10px] text-slate-400 m-0">
            Image: {draft.image_attribution}
            {draft.image_license ? ` · ${draft.image_license}` : ''}
          </p>
        )}

        {editing && (
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider m-0">Photo</p>
            <Field
              label="Image URL"
              value={draft.image_url}
              onChange={(v) => {
                setField('image_url', v)
                setField('image_source', v.includes('wikimedia') ? 'library_cc' : 'web_link')
              }}
            />
            <Field label="Image attribution" value={draft.image_attribution} onChange={(v) => setField('image_attribution', v)} />
            <Field label="Image license" value={draft.image_license} onChange={(v) => setField('image_license', v)} />
            <button
              type="button"
              className="text-[11px] font-bold text-rose-700"
              onClick={() => {
                setField('image_url', '')
                setField('image_attribution', '')
                setField('image_license', '')
                setField('image_source', null)
              }}
            >
              Clear photo
            </button>
            <ImagePicker
              queryHint={draft.scientific_name || draft.common_name}
              onPick={(r) => {
                setField('image_url', r.url)
                setField('image_attribution', r.attribution)
                setField('image_license', r.license)
                setField('image_source', 'library_cc')
              }}
              onLink={(url) => {
                setField('image_url', url)
                setField('image_attribution', draft.image_attribution || 'User-linked image')
                setField('image_source', 'web_link')
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {editing ? (
              <>
                <Field label="Scientific name" value={draft.scientific_name} onChange={(v) => setField('scientific_name', v)} />
                <Field label="Common name" value={draft.common_name} onChange={(v) => setField('common_name', v)} />
                <Field label="Genus" value={draft.genus} onChange={(v) => setField('genus', v)} />
                <Field label="Flowering time" value={draft.flowering_time} onChange={(v) => setField('flowering_time', v)} />
                <Field label="Conservation status" value={draft.conservation_status} onChange={(v) => setField('conservation_status', v)} />
                <Field label="Native range" value={draft.conservation_locale} onChange={(v) => setField('conservation_locale', v)} />
                <Field label="Conservation notes" value={draft.conservation_description} onChange={(v) => setField('conservation_description', v)} multiline />
              </>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conservation</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                    threatened ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {draft.conservation_status || 'Least Concern'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-700 m-0">Native range: {draft.conservation_locale || 'Australia'}</p>
                <p className="text-[11px] text-slate-500 m-0">{draft.conservation_description}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {editing ? (
                <>
                  <Field label="Growth" value={draft.growth_rate} onChange={(v) => setField('growth_rate', v)} />
                  <Field label="Height" value={draft.mature_height} onChange={(v) => setField('mature_height', v)} />
                  <Field label="Width" value={draft.mature_width} onChange={(v) => setField('mature_width', v)} />
                </>
              ) : (
                <>
                  <div className="bg-white border border-slate-200 rounded-xl p-2 text-center">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Growth</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{draft.growth_rate || '—'}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-2 text-center">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Height</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{draft.mature_height || '—'}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-2 text-center">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Width</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{draft.mature_width || '—'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cultivation</span>
              {editing ? (
                <div className="space-y-2">
                  <Field label="Soil" value={draft.soil_preference} onChange={(v) => setField('soil_preference', v)} multiline />
                  <Field label="Foliage" value={draft.foliage} onChange={(v) => setField('foliage', v)} multiline />
                  <Field label="Flowers" value={draft.flowers} onChange={(v) => setField('flowers', v)} multiline />
                  <Field label="Pretreatment" value={draft.pretreatment} onChange={(v) => setField('pretreatment', v)} />
                  <Field label="Sowing guide" value={draft.germination} onChange={(v) => setField('germination', v)} multiline />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-1">
                    <span className="text-slate-400">Soil</span>
                    <span className="font-semibold text-slate-700 text-right">{draft.soil_preference || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foliage</span>
                    <p className="text-slate-600 mt-0.5 m-0">{draft.foliage || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flowers</span>
                    <p className="text-slate-600 mt-0.5 m-0">{draft.flowers || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pretreatment</span>
                    <p className="text-slate-600 mt-0.5 m-0">{draft.pretreatment || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sowing guide</span>
                    <p className="text-slate-600 mt-0.5 m-0">{renderLatex(draft.germination)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
