import speciesSeed from '../data/species.json'
import type {
  GardenSite,
  GermStatus,
  PlantImage,
  Planting,
  PlantSource,
  Species,
  SunExposure,
  UserPlant,
} from '../types/models'
import { canUpload, compressImage, computeQuota } from './images'
import { localApi } from './localStore'
import { isSupabaseConfigured, supabase } from './supabase'

function mapSpeciesRow(row: Record<string, unknown>): Species {
  return row as unknown as Species
}

async function ensureSpeciesSeeded() {
  if (!supabase) return
  const { count } = await supabase.from('species').select('*', { count: 'exact', head: true })
  if ((count ?? 0) > 0) return
  const rows = (speciesSeed as Array<Omit<Species, 'id'>>).map((s) => ({
    legacy_id: s.legacy_id,
    scientific_name: s.scientific_name,
    common_name: s.common_name,
    genus: s.genus,
    pretreatment: s.pretreatment,
    germination: s.germination,
    growth_rate: s.growth_rate,
    mature_height: s.mature_height,
    mature_width: s.mature_width,
    foliage: s.foliage,
    flowers: s.flowers,
    flowering_time: s.flowering_time,
    soil_preference: s.soil_preference,
    frost_tolerance: s.frost_tolerance,
    drought_tolerance: s.drought_tolerance,
    shade_tolerance: s.shade_tolerance || 'Full sun',
    water_requirement: s.water_requirement || 4,
    conservation_status: s.conservation_status,
    conservation_locale: s.conservation_locale,
    conservation_description: s.conservation_description,
    image_url: s.image_url,
    image_attribution: s.image_attribution,
    image_license: s.image_license,
    image_source: s.image_source,
  }))
  // batch insert
  for (let i = 0; i < rows.length; i += 40) {
    const chunk = rows.slice(i, i + 40)
    await supabase.from('species').upsert(chunk, { onConflict: 'legacy_id' })
  }
}

export const api = {
  mode: isSupabaseConfigured ? ('cloud' as const) : ('local' as const),

  async listSpecies(): Promise<Species[]> {
    if (!supabase) return localApi.listSpecies()
    await ensureSpeciesSeeded()
    const { data, error } = await supabase.from('species').select('*').order('scientific_name')
    if (error) throw error
    return (data ?? []).map(mapSpeciesRow)
  },

  async updateSpecies(id: string, patch: Partial<Omit<Species, 'id' | 'legacy_id'>>): Promise<Species> {
    if (!supabase) return localApi.updateSpecies(id, patch)
    const { data, error } = await supabase.from('species').update(patch).eq('id', id).select().single()
    if (error) throw error
    return mapSpeciesRow(data as Record<string, unknown>)
  },

  async listPlants(userId: string): Promise<UserPlant[]> {
    if (!supabase) return localApi.listPlants()
    const { data, error } = await supabase.from('user_plants').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as UserPlant[]
  },

  async addPlant(userId: string, input: {
    species_id: string | null
    custom_name?: string
    source: PlantSource
    quantity?: string
  }): Promise<UserPlant> {
    if (!supabase) return localApi.addPlant(input)
    const { data, error } = await supabase.from('user_plants').insert({
      user_id: userId,
      species_id: input.species_id,
      custom_name: input.custom_name ?? '',
      source: input.source,
      quantity: input.quantity ?? '',
    }).select().single()
    if (error) throw error
    return data as UserPlant
  },

  async updatePlant(id: string, patch: Partial<Pick<UserPlant, 'germ_status' | 'sow_date' | 'germ_date' | 'quantity' | 'notes' | 'custom_name' | 'source'>>): Promise<UserPlant> {
    if (!supabase) return localApi.updatePlant(id, patch)
    const { data, error } = await supabase.from('user_plants').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data as UserPlant
  },

  async deletePlant(id: string) {
    if (!supabase) return localApi.deletePlant(id)
    const { error } = await supabase.from('user_plants').delete().eq('id', id)
    if (error) throw error
  },

  async listSites(userId: string): Promise<GardenSite[]> {
    if (!supabase) return localApi.listSites()
    const { data, error } = await supabase.from('garden_sites').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as GardenSite[]
  },

  async addSite(userId: string, input: {
    name: string
    approx_size?: string
    sun?: SunExposure
    soil?: string
    frost_exposure?: string
    notes?: string
  }): Promise<GardenSite> {
    if (!supabase) return localApi.addSite(input)
    const { data, error } = await supabase.from('garden_sites').insert({
      user_id: userId,
      name: input.name,
      approx_size: input.approx_size ?? '',
      sun: input.sun ?? 'Full sun',
      soil: input.soil ?? '',
      frost_exposure: input.frost_exposure ?? '',
      notes: input.notes ?? '',
    }).select().single()
    if (error) throw error
    return data as GardenSite
  },

  async updateSite(id: string, patch: Partial<Omit<GardenSite, 'id' | 'user_id' | 'created_at'>>): Promise<GardenSite> {
    if (!supabase) return localApi.updateSite(id, patch)
    const { data, error } = await supabase.from('garden_sites').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data as GardenSite
  },

  async deleteSite(id: string) {
    if (!supabase) return localApi.deleteSite(id)
    const { error } = await supabase.from('garden_sites').delete().eq('id', id)
    if (error) throw error
  },

  async listPlantings(userId: string): Promise<Planting[]> {
    if (!supabase) return localApi.listPlantings()
    const { data, error } = await supabase.from('plantings').select('*').eq('user_id', userId)
    if (error) throw error
    return (data ?? []) as Planting[]
  },

  async assignPlanting(userId: string, input: {
    user_plant_id: string
    garden_site_id: string
    is_planned?: boolean
    planted_date?: string
    notes?: string
  }): Promise<Planting> {
    if (!supabase) return localApi.assignPlanting(input)
    await supabase.from('plantings').delete().eq('user_plant_id', input.user_plant_id)
    const { data, error } = await supabase.from('plantings').insert({
      user_id: userId,
      user_plant_id: input.user_plant_id,
      garden_site_id: input.garden_site_id,
      is_planned: input.is_planned ?? true,
      planted_date: input.planted_date ?? '',
      notes: input.notes ?? '',
    }).select().single()
    if (error) throw error
    return data as Planting
  },

  async removePlanting(id: string) {
    if (!supabase) return localApi.removePlanting(id)
    const { error } = await supabase.from('plantings').delete().eq('id', id)
    if (error) throw error
  },

  async listImages(userId: string, userPlantId?: string): Promise<PlantImage[]> {
    if (!supabase) return localApi.listImages(userPlantId)
    let q = supabase.from('plant_images').select('*').eq('user_id', userId)
    if (userPlantId) q = q.eq('user_plant_id', userPlantId)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as PlantImage[]
  },

  async getUploadQuota(userId: string) {
    if (!supabase) {
      const usage = localApi.uploadUsage()
      return computeQuota(usage.usedCount, usage.usedBytes)
    }
    const { data, error } = await supabase.from('plant_images').select('byte_size').eq('user_id', userId).eq('source', 'upload')
    if (error) throw error
    const usedCount = data?.length ?? 0
    const usedBytes = (data ?? []).reduce((sum, row) => sum + (row.byte_size as number), 0)
    return computeQuota(usedCount, usedBytes)
  },

  async addLinkedImage(userId: string, input: {
    user_plant_id: string | null
    species_id: string | null
    url: string
    attribution?: string
    source: 'library_cc' | 'web_link'
  }) {
    if (!supabase) return localApi.addImage({ ...input, byte_size: 0 })
    const { data, error } = await supabase.from('plant_images').insert({
      user_id: userId,
      user_plant_id: input.user_plant_id,
      species_id: input.species_id,
      url: input.url,
      attribution: input.attribution ?? '',
      source: input.source,
      byte_size: 0,
    }).select().single()
    if (error) throw error
    return data as PlantImage
  },

  async uploadProgressPhoto(userId: string, userPlantId: string, file: File) {
    const quota = await this.getUploadQuota(userId)
    const blob = await compressImage(file)
    const blocked = canUpload(quota, blob.size)
    if (blocked) throw new Error(blocked)

    if (!supabase) {
      const dataUrl = await blobToDataUrl(blob)
      return localApi.addImage({
        user_plant_id: userPlantId,
        species_id: null,
        url: dataUrl,
        attribution: 'Personal upload',
        source: 'upload',
        byte_size: blob.size,
      })
    }

    const path = `${userId}/${userPlantId}/${crypto.randomUUID()}.jpg`
    const { error: upErr } = await supabase.storage.from('progress-photos').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from('progress-photos').getPublicUrl(path)
    const { data, error } = await supabase.from('plant_images').insert({
      user_id: userId,
      user_plant_id: userPlantId,
      species_id: null,
      url: pub.publicUrl,
      attribution: 'Personal upload',
      source: 'upload',
      byte_size: blob.size,
    }).select().single()
    if (error) throw error
    return data as PlantImage
  },

  async deleteImage(userId: string, image: PlantImage) {
    if (!supabase) return localApi.deleteImage(image.id)
    if (image.source === 'upload') {
      const marker = '/progress-photos/'
      const idx = image.url.indexOf(marker)
      if (idx >= 0) {
        const path = decodeURIComponent(image.url.slice(idx + marker.length))
        await supabase.storage.from('progress-photos').remove([path])
      }
    }
    const { error } = await supabase.from('plant_images').delete().eq('id', image.id).eq('user_id', userId)
    if (error) throw error
  },

  async setGermStatus(id: string, status: GermStatus) {
    return this.updatePlant(id, { germ_status: status })
  },
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Read failed'))
    reader.readAsDataURL(blob)
  })
}
