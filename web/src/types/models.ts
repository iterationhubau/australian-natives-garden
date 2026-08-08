export type PlantSource = 'seed' | 'purchase' | 'wishlist'
export type GermStatus = 'Unstarted' | 'Pre-treating' | 'Planted' | 'Germinated' | 'Failed'
export type ImageSource = 'library_cc' | 'web_link' | 'upload'
export type SunExposure = 'Full sun' | 'Part shade' | 'Shade' | 'Mixed'
/** Garden light preference for a species */
export type ShadeTolerance = 'Full sun' | 'Part shade' | 'Shade'
/** 1 = very little water, 8 = very thirsty */
export type WaterRequirement = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface Species {
  id: string
  legacy_id?: string
  scientific_name: string
  common_name: string
  genus: string
  pretreatment: string
  germination: string
  growth_rate: string
  mature_height: string
  mature_width: string
  foliage: string
  flowers: string
  flowering_time: string
  soil_preference: string
  frost_tolerance: string
  drought_tolerance: string
  shade_tolerance: ShadeTolerance
  water_requirement: WaterRequirement
  conservation_status: string
  conservation_locale: string
  conservation_description: string
  image_url: string
  image_attribution: string
  image_license: string
  image_source: ImageSource | null
}

export interface Profile {
  id: string
  display_name: string
  created_at: string
}

export interface GardenSite {
  id: string
  user_id: string
  name: string
  approx_size: string
  sun: SunExposure
  soil: string
  frost_exposure: string
  notes: string
  created_at: string
}

export interface UserPlant {
  id: string
  user_id: string
  species_id: string | null
  custom_name: string
  source: PlantSource
  germ_status: GermStatus
  sow_date: string
  germ_date: string
  quantity: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Planting {
  id: string
  user_id: string
  user_plant_id: string
  garden_site_id: string
  planted_date: string
  is_planned: boolean
  notes: string
  created_at: string
}

export interface PlantImage {
  id: string
  user_id: string
  user_plant_id: string | null
  species_id: string | null
  url: string
  attribution: string
  source: ImageSource
  byte_size: number
  created_at: string
}

export interface UploadQuota {
  maxCount: number
  maxBytesTotal: number
  maxBytesPerFile: number
  usedCount: number
  usedBytes: number
}

export const UPLOAD_QUOTA = {
  maxCount: 20,
  maxBytesTotal: 25 * 1024 * 1024,
  maxBytesPerFile: 2 * 1024 * 1024,
} as const
