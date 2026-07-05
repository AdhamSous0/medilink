
-- Enums
create type public.app_role as enum ('doctor', 'medical_center', 'patient');
create type public.provider_type as enum ('clinic', 'medical_center', 'laboratory', 'radiology_center');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  specialty text,
  license_number text,
  date_of_birth date,
  organization_name text,
  provider_type public.provider_type,
  address text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Authenticated users can view all profiles"
  on public.profiles for select to authenticated using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users can view their own roles"
  on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- has_role (security definer to avoid recursive RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

-- get_current_user_role helper
create or replace function public.get_current_user_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1
$$;

-- updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto-create profile + role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role public.app_role;
  _provider_type public.provider_type;
begin
  -- Default to 'patient' if not provided
  _role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.app_role,
    'patient'::public.app_role
  );

  _provider_type := nullif(new.raw_user_meta_data ->> 'provider_type', '')::public.provider_type;

  insert into public.profiles (
    id, email, full_name, phone, specialty, license_number,
    date_of_birth, organization_name, provider_type, address
  ) values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'specialty', ''),
    nullif(new.raw_user_meta_data ->> 'license_number', ''),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    nullif(new.raw_user_meta_data ->> 'organization_name', ''),
    _provider_type,
    nullif(new.raw_user_meta_data ->> 'address', '')
  );

  insert into public.user_roles (user_id, role) values (new.id, _role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
