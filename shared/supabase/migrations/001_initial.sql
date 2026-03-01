-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  username    text unique,
  avatar_url  text,
  created_at  timestamptz default timezone('utc', now()) not null
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ─── LOCATIONS ───────────────────────────────────────────────────────────────
create table if not exists public.locations (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null,
  category    text not null check (category in ('restaurant','market','street','store','boutique')),
  description text,
  lat         double precision not null,
  lng         double precision not null,
  photo_url   text,
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz default timezone('utc', now()) not null
);

alter table public.locations enable row level security;

create policy "Locations viewable by everyone"
  on public.locations for select using (true);

create policy "Authenticated users can insert locations"
  on public.locations for insert with check (auth.uid() = created_by);

create policy "Users can update own locations"
  on public.locations for update using (auth.uid() = created_by);

create policy "Users can delete own locations"
  on public.locations for delete using (auth.uid() = created_by);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id           uuid default uuid_generate_v4() primary key,
  location_id  uuid references public.locations on delete cascade not null,
  user_id      uuid references auth.users on delete cascade not null,
  rating       integer not null check (rating >= 1 and rating <= 5),
  comment      text,
  created_at   timestamptz default timezone('utc', now()) not null,
  unique (location_id, user_id)
);

alter table public.reviews enable row level security;

create policy "Reviews viewable by everyone"
  on public.reviews for select using (true);

create policy "Authenticated users can insert reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on public.reviews for delete using (auth.uid() = user_id);

-- ─── REALTIME ────────────────────────────────────────────────────────────────
-- Run these in the Supabase dashboard under Database > Replication
-- alter publication supabase_realtime add table public.locations;
-- alter publication supabase_realtime add table public.reviews;

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── HELPER VIEW: locations with avg rating ───────────────────────────────────
create or replace view public.locations_with_stats as
select
  l.*,
  p.username as creator_username,
  coalesce(round(avg(r.rating)::numeric, 1), null) as avg_rating,
  count(r.id)::integer as review_count
from public.locations l
left join public.profiles p on p.id = l.created_by
left join public.reviews r on r.location_id = l.id
group by l.id, p.username;
