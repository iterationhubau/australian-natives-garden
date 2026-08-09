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

const KEY = 'au_natives_garden_v2'
const LOCAL_USER_ID = 'local-user'
const CATALOG_VERSION = 12
/** Versions before this may have placeholder water=4; force-sync from catalog once. */
const SITE_NEEDS_SYNC_BEFORE = 7
/** Versions before this should pull refreshed catalog photos (unless user linked a custom web/upload image). */
const IMAGE_SYNC_BEFORE = 12

type DbShape = {
  catalogVersion?: number
  species: Species[]
  sites: GardenSite[]
  plants: UserPlant[]
  plantings: Planting[]
  images: PlantImage[]
}

function uid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

function seedSpecies(): Species[] {
  return (speciesSeed as Array<Omit<Species, 'id'>>).map((s) => ({
    ...s,
    id: uid(),
    shade_tolerance: s.shade_tolerance || 'Full sun',
    water_requirement: s.water_requirement || 4,
    image_source: (s.image_source as Species['image_source']) ?? null,
  }))
}

function isCatalogishImage(row: Species): boolean {
  if (!row.image_url) return true
  if (row.image_url.startsWith('/catalog/')) return true
  if (row.image_source === 'library_cc') return true
  return /wikimedia\.org|upload\.wikimedia/i.test(row.image_url)
}

/**
 * Add new bundled catalog species without overwriting user library edits.
 * Fills missing shade/water from catalog; optionally force-syncs site-needs / photos after a catalog upgrade.
 */
function mergeCatalog(existing: Species[], opts?: { syncSiteNeeds?: boolean; syncImages?: boolean }): Species[] {
  const byLegacy = new Map(existing.map((s) => [s.legacy_id, s]))
  const byName = new Map(existing.map((s) => [s.scientific_name.toLowerCase(), s]))
  const merged = existing.map((s) => ({ ...s }))
  const syncSiteNeeds = Boolean(opts?.syncSiteNeeds)
  const syncImages = Boolean(opts?.syncImages)

  for (const row of merged) {
    const catalog =
      (row.legacy_id ? (speciesSeed as Array<Omit<Species, 'id'>>).find((c) => c.legacy_id === row.legacy_id) : undefined) ||
      (speciesSeed as Array<Omit<Species, 'id'>>).find((c) => c.scientific_name.toLowerCase() === row.scientific_name.toLowerCase())
    if (!catalog) continue
    if (syncSiteNeeds || !row.shade_tolerance) {
      row.shade_tolerance = catalog.shade_tolerance || row.shade_tolerance || 'Full sun'
    }
    if (syncSiteNeeds || !row.water_requirement) {
      row.water_requirement = catalog.water_requirement || row.water_requirement || 4
    }
    if (catalog.image_url && (syncImages ? isCatalogishImage(row) : !row.image_url)) {
      row.image_url = catalog.image_url
      row.image_attribution = catalog.image_attribution || row.image_attribution
      row.image_license = catalog.image_license || row.image_license
      row.image_source = (catalog.image_source as Species['image_source']) ?? row.image_source
    }
  }

  for (const catalog of speciesSeed as Array<Omit<Species, 'id'>>) {
    const prev =
      (catalog.legacy_id ? byLegacy.get(catalog.legacy_id) : undefined) ||
      byName.get(catalog.scientific_name.toLowerCase())
    if (prev) continue
    const row: Species = {
      ...catalog,
      id: uid(),
      shade_tolerance: catalog.shade_tolerance || 'Full sun',
      water_requirement: catalog.water_requirement || 4,
      image_source: (catalog.image_source as Species['image_source']) ?? null,
    }
    merged.push(row)
    if (row.legacy_id) byLegacy.set(row.legacy_id, row)
    byName.set(row.scientific_name.toLowerCase(), row)
  }
  return merged
}

function load(): DbShape {
  // Migrate from v1 if present
  const raw = localStorage.getItem(KEY) || localStorage.getItem('au_natives_garden_v1')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DbShape
      const prevVersion = parsed.catalogVersion ?? 0
      if (prevVersion < CATALOG_VERSION || !parsed.species?.length) {
        parsed.species = mergeCatalog(parsed.species || [], {
          syncSiteNeeds: prevVersion < SITE_NEEDS_SYNC_BEFORE,
          syncImages: prevVersion < IMAGE_SYNC_BEFORE,
        })
        parsed.catalogVersion = CATALOG_VERSION
        save(parsed)
      }
      return parsed
    } catch {
      /* fall through */
    }
  }
  const db: DbShape = {
    catalogVersion: CATALOG_VERSION,
    species: seedSpecies(),
    sites: [],
    plants: [],
    plantings: [],
    images: [],
  }
  save(db)
  return db
}

function save(db: DbShape) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export const localApi = {
  userId: LOCAL_USER_ID,

  listSpecies(): Species[] {
    return load().species.slice().sort((a, b) => a.scientific_name.localeCompare(b.scientific_name))
  },

  getSpecies(id: string): Species | undefined {
    return load().species.find((s) => s.id === id)
  },

  updateSpecies(id: string, patch: Partial<Omit<Species, 'id' | 'legacy_id'>>): Species {
    const db = load()
    const species = db.species.find((s) => s.id === id)
    if (!species) throw new Error('Species not found')
    Object.assign(species, patch)
    save(db)
    return species
  },

  listPlants(): UserPlant[] {
    return load().plants.filter((p) => p.user_id === LOCAL_USER_ID)
  },

  addPlant(input: {
    species_id: string | null
    custom_name?: string
    source: PlantSource
    quantity?: string
  }): UserPlant {
    const db = load()
    const plant: UserPlant = {
      id: uid(),
      user_id: LOCAL_USER_ID,
      species_id: input.species_id,
      custom_name: input.custom_name ?? '',
      source: input.source,
      germ_status: 'Unstarted',
      sow_date: '',
      germ_date: '',
      quantity: input.quantity ?? '',
      notes: '',
      created_at: now(),
      updated_at: now(),
    }
    db.plants.push(plant)
    save(db)
    return plant
  },

  updatePlant(id: string, patch: Partial<Pick<UserPlant, 'germ_status' | 'sow_date' | 'germ_date' | 'quantity' | 'notes' | 'custom_name' | 'source'>>): UserPlant {
    const db = load()
    const plant = db.plants.find((p) => p.id === id)
    if (!plant) throw new Error('Plant not found')
    Object.assign(plant, patch, { updated_at: now() })
    if (patch.germ_status && patch.germ_status !== 'Germinated') plant.germ_date = plant.germ_date
    save(db)
    return plant
  },

  deletePlant(id: string) {
    const db = load()
    db.plants = db.plants.filter((p) => p.id !== id)
    db.plantings = db.plantings.filter((p) => p.user_plant_id !== id)
    db.images = db.images.filter((i) => i.user_plant_id !== id)
    save(db)
  },

  listSites(): GardenSite[] {
    return load().sites.filter((s) => s.user_id === LOCAL_USER_ID)
  },

  addSite(input: {
    name: string
    approx_size?: string
    sun?: SunExposure
    soil?: string
    frost_exposure?: string
    notes?: string
  }): GardenSite {
    const db = load()
    const site: GardenSite = {
      id: uid(),
      user_id: LOCAL_USER_ID,
      name: input.name,
      approx_size: input.approx_size ?? '',
      sun: input.sun ?? 'Full sun',
      soil: input.soil ?? '',
      frost_exposure: input.frost_exposure ?? '',
      notes: input.notes ?? '',
      created_at: now(),
    }
    db.sites.push(site)
    save(db)
    return site
  },

  updateSite(id: string, patch: Partial<Omit<GardenSite, 'id' | 'user_id' | 'created_at'>>): GardenSite {
    const db = load()
    const site = db.sites.find((s) => s.id === id)
    if (!site) throw new Error('Site not found')
    Object.assign(site, patch)
    save(db)
    return site
  },

  deleteSite(id: string) {
    const db = load()
    db.sites = db.sites.filter((s) => s.id !== id)
    db.plantings = db.plantings.filter((p) => p.garden_site_id !== id)
    save(db)
  },

  listPlantings(): Planting[] {
    return load().plantings.filter((p) => p.user_id === LOCAL_USER_ID)
  },

  assignPlanting(input: {
    user_plant_id: string
    garden_site_id: string
    is_planned?: boolean
    planted_date?: string
    notes?: string
  }): Planting {
    const db = load()
    db.plantings = db.plantings.filter((p) => p.user_plant_id !== input.user_plant_id)
    const planting: Planting = {
      id: uid(),
      user_id: LOCAL_USER_ID,
      user_plant_id: input.user_plant_id,
      garden_site_id: input.garden_site_id,
      planted_date: input.planted_date ?? '',
      is_planned: input.is_planned ?? true,
      notes: input.notes ?? '',
      created_at: now(),
    }
    db.plantings.push(planting)
    save(db)
    return planting
  },

  removePlanting(id: string) {
    const db = load()
    db.plantings = db.plantings.filter((p) => p.id !== id)
    save(db)
  },

  listImages(userPlantId?: string): PlantImage[] {
    const images = load().images.filter((i) => i.user_id === LOCAL_USER_ID)
    return userPlantId ? images.filter((i) => i.user_plant_id === userPlantId) : images
  },

  uploadUsage() {
    const uploads = load().images.filter((i) => i.user_id === LOCAL_USER_ID && i.source === 'upload')
    return {
      usedCount: uploads.length,
      usedBytes: uploads.reduce((sum, i) => sum + i.byte_size, 0),
    }
  },

  addImage(input: {
    user_plant_id: string | null
    species_id: string | null
    url: string
    attribution?: string
    source: PlantImage['source']
    byte_size?: number
  }): PlantImage {
    const db = load()
    const image: PlantImage = {
      id: uid(),
      user_id: LOCAL_USER_ID,
      user_plant_id: input.user_plant_id,
      species_id: input.species_id,
      url: input.url,
      attribution: input.attribution ?? '',
      source: input.source,
      byte_size: input.source === 'upload' ? input.byte_size ?? 0 : 0,
      created_at: now(),
    }
    db.images.push(image)
    save(db)
    return image
  },

  deleteImage(id: string) {
    const db = load()
    db.images = db.images.filter((i) => i.id !== id)
    save(db)
  },

  setGermStatus(id: string, status: GermStatus) {
    return this.updatePlant(id, { germ_status: status })
  },
}
