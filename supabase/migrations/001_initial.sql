-- AU Natives Garden — initial schema, RLS, storage

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  scientific_name text not null,
  common_name text not null default '',
  genus text not null default '',
  pretreatment text not null default '',
  germination text not null default '',
  growth_rate text not null default '',
  mature_height text not null default '',
  mature_width text not null default '',
  foliage text not null default '',
  flowers text not null default '',
  flowering_time text not null default '',
  soil_preference text not null default '',
  frost_tolerance text not null default '',
  drought_tolerance text not null default '',
  conservation_status text not null default '',
  conservation_locale text not null default '',
  conservation_description text not null default '',
  image_url text not null default '',
  image_attribution text not null default '',
  image_license text not null default '',
  image_source text check (image_source is null or image_source in ('library_cc', 'web_link', 'upload'))
);

create table if not exists public.garden_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  approx_size text not null default '',
  sun text not null default 'Full sun',
  soil text not null default '',
  frost_exposure text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  species_id uuid references public.species (id) on delete set null,
  custom_name text not null default '',
  source text not null check (source in ('seed', 'purchase', 'wishlist')),
  germ_status text not null default 'Unstarted'
    check (germ_status in ('Unstarted', 'Pre-treating', 'Planted', 'Germinated', 'Failed')),
  sow_date text not null default '',
  germ_date text not null default '',
  quantity text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plantings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_plant_id uuid not null references public.user_plants (id) on delete cascade,
  garden_site_id uuid not null references public.garden_sites (id) on delete cascade,
  planted_date text not null default '',
  is_planned boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.plant_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_plant_id uuid references public.user_plants (id) on delete cascade,
  species_id uuid references public.species (id) on delete cascade,
  url text not null,
  attribution text not null default '',
  source text not null check (source in ('library_cc', 'web_link', 'upload')),
  byte_size integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists species_genus_idx on public.species (genus);
create index if not exists species_name_idx on public.species (scientific_name);
create index if not exists user_plants_user_idx on public.user_plants (user_id);
create index if not exists garden_sites_user_idx on public.garden_sites (user_id);
create index if not exists plant_images_user_idx on public.plant_images (user_id);

alter table public.profiles enable row level security;
alter table public.species enable row level security;
alter table public.garden_sites enable row level security;
alter table public.user_plants enable row level security;
alter table public.plantings enable row level security;
alter table public.plant_images enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "species_read_all" on public.species for select using (true);

create policy "sites_all_own" on public.garden_sites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plants_all_own" on public.user_plants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plantings_all_own" on public.plantings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "images_all_own" on public.plant_images for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Upload quota helpers (count + bytes for source = upload)
create or replace function public.user_upload_usage(uid uuid)
returns table(used_count bigint, used_bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as used_count,
    coalesce(sum(byte_size), 0)::bigint as used_bytes
  from public.plant_images
  where user_id = uid and source = 'upload';
$$;

create or replace function public.enforce_upload_quota()
returns trigger
language plpgsql
as $$
declare
  usage record;
  max_count constant int := 20;
  max_total constant int := 26214400; -- 25 MB
  max_file constant int := 2097152;   -- 2 MB
begin
  if new.source <> 'upload' then
    new.byte_size := 0;
    return new;
  end if;

  if new.byte_size > max_file then
    raise exception 'File exceeds 2 MB per-image limit';
  end if;

  select * into usage from public.user_upload_usage(new.user_id);

  if usage.used_count >= max_count then
    raise exception 'Upload limit reached (20 progress photos per account)';
  end if;

  if usage.used_bytes + new.byte_size > max_total then
    raise exception 'Upload storage limit reached (25 MB per account)';
  end if;

  return new;
end;
$$;

drop trigger if exists plant_images_quota on public.plant_images;
create trigger plant_images_quota
before insert on public.plant_images
for each row execute function public.enforce_upload_quota();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Gardener'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', true)
on conflict (id) do nothing;

create policy "progress_photos_read"
on storage.objects for select
using (bucket_id = 'progress-photos');

create policy "progress_photos_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "progress_photos_delete_own"
on storage.objects for delete
using (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
