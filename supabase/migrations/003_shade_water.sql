alter table public.species
  add column if not exists shade_tolerance text not null default 'Full sun',
  add column if not exists water_requirement integer not null default 4;

alter table public.species
  drop constraint if exists species_shade_tolerance_check;

alter table public.species
  add constraint species_shade_tolerance_check
  check (shade_tolerance in ('Full sun', 'Part shade', 'Shade'));

alter table public.species
  drop constraint if exists species_water_requirement_check;

alter table public.species
  add constraint species_water_requirement_check
  check (water_requirement >= 1 and water_requirement <= 8);
