import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const species = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/species.json'), 'utf8'))

function esc(s) {
  return String(s ?? '').replace(/'/g, "''")
}

const values = species.map((s) => `(
  '${esc(s.legacy_id)}',
  '${esc(s.scientific_name)}',
  '${esc(s.common_name)}',
  '${esc(s.genus)}',
  '${esc(s.pretreatment)}',
  '${esc(s.germination)}',
  '${esc(s.growth_rate)}',
  '${esc(s.mature_height)}',
  '${esc(s.mature_width)}',
  '${esc(s.foliage)}',
  '${esc(s.flowers)}',
  '${esc(s.flowering_time)}',
  '${esc(s.soil_preference)}',
  '${esc(s.frost_tolerance)}',
  '${esc(s.drought_tolerance)}',
  '${esc(s.shade_tolerance || 'Full sun')}',
  ${Number(s.water_requirement) || 4},
  '${esc(s.conservation_status)}',
  '${esc(s.conservation_locale)}',
  '${esc(s.conservation_description)}',
  '${esc(s.image_url)}',
  '${esc(s.image_attribution)}',
  '${esc(s.image_license)}',
  ${s.image_source ? `'${esc(s.image_source)}'` : 'null'}
)`).join(',\n')

const sql = `-- Seed Australian natives species library
insert into public.species (
  legacy_id, scientific_name, common_name, genus, pretreatment, germination,
  growth_rate, mature_height, mature_width, foliage, flowers, flowering_time,
  soil_preference, frost_tolerance, drought_tolerance, shade_tolerance, water_requirement,
  conservation_status, conservation_locale, conservation_description, image_url, image_attribution,
  image_license, image_source
) values
${values}
on conflict (legacy_id) do update set
  scientific_name = excluded.scientific_name,
  common_name = excluded.common_name,
  genus = excluded.genus,
  pretreatment = excluded.pretreatment,
  germination = excluded.germination,
  growth_rate = excluded.growth_rate,
  mature_height = excluded.mature_height,
  mature_width = excluded.mature_width,
  foliage = excluded.foliage,
  flowers = excluded.flowers,
  flowering_time = excluded.flowering_time,
  soil_preference = excluded.soil_preference,
  frost_tolerance = excluded.frost_tolerance,
  drought_tolerance = excluded.drought_tolerance,
  shade_tolerance = excluded.shade_tolerance,
  water_requirement = excluded.water_requirement,
  conservation_status = excluded.conservation_status,
  conservation_locale = excluded.conservation_locale,
  conservation_description = excluded.conservation_description,
  image_url = excluded.image_url,
  image_attribution = excluded.image_attribution,
  image_license = excluded.image_license,
  image_source = excluded.image_source;
`

const outDir = path.join(__dirname, '../../supabase/seed')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'species.sql'), sql)
console.log(`Wrote species.sql with ${species.length} rows`)
