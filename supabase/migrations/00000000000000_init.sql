-- Enable extensions
create extension if not exists "uuid-ossp";

-- Enums
create type public.role_type as enum ('partner', 'manager');
create type public.outlet_status as enum ('active', 'setup', 'closed');

-- profiles
create table public.profiles (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- outlets
create table public.outlets (
  id                       uuid           primary key default uuid_generate_v4(),
  name                     text           not null,
  brand                    text           not null,
  address                  text,
  phone                    text,
  petpooja_restaurant_id   text,
  status                   public.outlet_status not null default 'setup',
  created_at               timestamptz    not null default now(),
  updated_at               timestamptz    not null default now()
);

-- outlet_members
create table public.outlet_members (
  outlet_id   uuid             not null references public.outlets(id) on delete cascade,
  user_id     uuid             not null references auth.users(id) on delete cascade,
  role        public.role_type not null,
  created_at  timestamptz      not null default now(),
  primary key (outlet_id, user_id)
);

-- Indexes
create index outlet_members_user_id_idx on public.outlet_members (user_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_outlets_updated_at
  before update on public.outlets
  for each row execute procedure public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Partner check helper (used by RLS policies)
create or replace function public.is_partner()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.outlet_members
    where user_id = auth.uid() and role = 'partner'
  );
$$;

-- Enable RLS
alter table public.profiles      enable row level security;
alter table public.outlets       enable row level security;
alter table public.outlet_members enable row level security;

-- profiles RLS
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);

-- outlets RLS
create policy "outlets_all_partners"
  on public.outlets for all
  using (public.is_partner());

create policy "outlets_select_managers"
  on public.outlets for select
  using (
    exists (
      select 1 from public.outlet_members
      where outlet_id = outlets.id
        and user_id = auth.uid()
        and role = 'manager'
    )
  );

-- outlet_members RLS
create policy "outlet_members_all_partners"
  on public.outlet_members for all
  using (public.is_partner());

create policy "outlet_members_select_own"
  on public.outlet_members for select
  using (auth.uid() = user_id);
