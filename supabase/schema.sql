-- Babbling Banks database schema for Supabase.
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- It is safe to run more than once.

-- =====================================================================
-- FAVORITES: one row per (user, episode)
-- =====================================================================
create table if not exists public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  episode_id   text not null,
  episode_data jsonb,
  created_at   timestamptz not null default now(),
  unique (user_id, episode_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users can view their own favorites" on public.favorites;
create policy "Users can view their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on public.favorites;
create policy "Users can insert their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own favorites" on public.favorites;
create policy "Users can update their own favorites"
  on public.favorites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

create index if not exists idx_favorites_user_id on public.favorites (user_id);
create index if not exists idx_favorites_episode_id on public.favorites (episode_id);

-- =====================================================================
-- SEARCH LOGS (optional): anonymous analytics on what people search for.
-- The app does not write here yet; keep it if you want to add analytics.
-- =====================================================================
create table if not exists public.search_logs (
  id           uuid primary key default gen_random_uuid(),
  query        text not null,
  result_count integer not null default 0,
  top_result   text,
  user_id      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.search_logs enable row level security;

drop policy if exists "Anyone can log a search" on public.search_logs;
create policy "Anyone can log a search"
  on public.search_logs for insert
  with check (true);

create index if not exists idx_search_logs_created_at on public.search_logs (created_at desc);
