-- =========================================================
-- ORBITAL — Stage 2 core schema
-- Run this whole file once in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT where relevant).
-- =========================================================

-- -------------------------------------------------
-- 1. profiles
-- -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  preferences jsonb not null default '{"theme":"dark","notificationsEnabled":true,"units":"metric"}'::jsonb,
  level int not null default 1,
  xp int not null default 0,
  badges jsonb not null default '[]'::jsonb,
  sightings_count int not null default 0,
  current_plan text not null default 'explorer',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up (email or Google)
-- so the app never has to guess/fabricate profile data on the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, current_plan)
  values (
    new.id,
    split_part(coalesce(new.email, 'commander'), '@', 1),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Orbital Commander'),
    'explorer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Avatar storage bucket (used by profileService.uploadAvatar)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- -------------------------------------------------
-- 2. plans — catalog is server/admin-owned, publicly readable
-- -------------------------------------------------
create table if not exists public.plans (
  id text primary key,
  name text not null,
  tier text not null check (tier in ('explorer','pro','intelligence')),
  interval text not null check (interval in ('none','month','year')),
  stripe_price_id text,
  price_cents int not null default 0,
  features jsonb not null default '{}'::jsonb
);

alter table public.plans enable row level security;

drop policy if exists "Anyone can read plans" on public.plans;
create policy "Anyone can read plans"
  on public.plans for select
  using (true);
-- Intentionally no insert/update/delete policy: only the service-role key
-- (server-side only, e.g. this migration or an admin script) can write plans.

-- Seed the 3 real ORBITAL plans/prices. stripe_price_id left NULL here —
-- fill these in with your actual Stripe test Price IDs in Stage 3.
insert into public.plans (id, name, tier, interval, price_cents, features) values
  ('explorer', 'Explorer', 'explorer', 'none', 0,
    '{"satellite_limit":100,"realtime_telemetry":false,"unlimited_pass_predictions":false,"advanced_orbital_data":false,"smart_alerts":false,"visibility_engine":false,"weather_light_pollution":false,"what_should_i_watch":false,"unlimited_sightings":false,"camera_ai_verification":false,"advanced_missions":false,"all_badges":false,"no_ads":false,"orbital_ai":false,"orbital_lab":false,"historical_data":false,"constellation_analytics":false,"conjunction_reentry":false,"ground_station_data":false,"earth_observation":false,"deep_space_tracking":false,"advanced_simulations":false}'::jsonb),
  ('pro_monthly', 'Pro', 'pro', 'month', 599,
    '{"satellite_limit":"unlimited","realtime_telemetry":true,"unlimited_pass_predictions":true,"advanced_orbital_data":true,"smart_alerts":true,"visibility_engine":true,"weather_light_pollution":true,"what_should_i_watch":true,"unlimited_sightings":true,"camera_ai_verification":true,"advanced_missions":true,"all_badges":true,"no_ads":true,"orbital_ai":false,"orbital_lab":false,"historical_data":false,"constellation_analytics":false,"conjunction_reentry":false,"ground_station_data":false,"earth_observation":false,"deep_space_tracking":false,"advanced_simulations":false}'::jsonb),
  ('pro_yearly', 'Pro', 'pro', 'year', 4999,
    '{"satellite_limit":"unlimited","realtime_telemetry":true,"unlimited_pass_predictions":true,"advanced_orbital_data":true,"smart_alerts":true,"visibility_engine":true,"weather_light_pollution":true,"what_should_i_watch":true,"unlimited_sightings":true,"camera_ai_verification":true,"advanced_missions":true,"all_badges":true,"no_ads":true,"orbital_ai":false,"orbital_lab":false,"historical_data":false,"constellation_analytics":false,"conjunction_reentry":false,"ground_station_data":false,"earth_observation":false,"deep_space_tracking":false,"advanced_simulations":false}'::jsonb),
  ('intelligence_monthly', 'Intelligence', 'intelligence', 'month', 1299,
    '{"satellite_limit":"unlimited","realtime_telemetry":true,"unlimited_pass_predictions":true,"advanced_orbital_data":true,"smart_alerts":true,"visibility_engine":true,"weather_light_pollution":true,"what_should_i_watch":true,"unlimited_sightings":true,"camera_ai_verification":true,"advanced_missions":true,"all_badges":true,"no_ads":true,"orbital_ai":true,"orbital_lab":true,"historical_data":true,"constellation_analytics":true,"conjunction_reentry":true,"ground_station_data":true,"earth_observation":true,"deep_space_tracking":true,"advanced_simulations":true}'::jsonb),
  ('intelligence_yearly', 'Intelligence', 'intelligence', 'year', 9999,
    '{"satellite_limit":"unlimited","realtime_telemetry":true,"unlimited_pass_predictions":true,"advanced_orbital_data":true,"smart_alerts":true,"visibility_engine":true,"weather_light_pollution":true,"what_should_i_watch":true,"unlimited_sightings":true,"camera_ai_verification":true,"advanced_missions":true,"all_badges":true,"no_ads":true,"orbital_ai":true,"orbital_lab":true,"historical_data":true,"constellation_analytics":true,"conjunction_reentry":true,"ground_station_data":true,"earth_observation":true,"deep_space_tracking":true,"advanced_simulations":true}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  tier = excluded.tier,
  interval = excluded.interval,
  price_cents = excluded.price_cents,
  features = excluded.features;

-- -------------------------------------------------
-- 3. user_subscriptions — Stripe/webhook is the ONLY writer
-- -------------------------------------------------
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id) default 'explorer',
  status text not null default 'active',
    -- active | trialing | past_due | canceled | incomplete | incomplete_expired | unpaid
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.user_subscriptions;
create policy "Users can view own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);
-- No insert/update/delete policy for authenticated/anon: this table can ONLY
-- be written by the service-role key from the Stripe webhook handler. This is
-- what makes "server is the source of truth for paid access" actually true.

-- -------------------------------------------------
-- 4. processed_webhooks — idempotency guard, service-role only
-- -------------------------------------------------
create table if not exists public.processed_webhooks (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.processed_webhooks enable row level security;
-- No policies at all: neither anon nor authenticated can read/write this.
-- Only the service-role key (webhook handler) can touch it.

-- -------------------------------------------------
-- 5. user_has_feature(text) — the RPC entitlementService.ts already calls
-- -------------------------------------------------
create or replace function public.user_has_feature(p_feature_key text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_features jsonb;
  v_status text;
  v_val jsonb;
begin
  select p.features, s.status
  into v_features, v_status
  from public.user_subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();

  -- No row, or subscription not currently active/trialing -> Explorer defaults
  if v_features is null or v_status not in ('active', 'trialing') then
    select features into v_features from public.plans where id = 'explorer';
  end if;

  v_val := v_features -> p_feature_key;

  if v_val is null then
    return false;
  end if;

  if jsonb_typeof(v_val) = 'boolean' then
    return (v_val)::boolean;
  elsif jsonb_typeof(v_val) = 'number' then
    return (v_val)::numeric > 0;
  elsif jsonb_typeof(v_val) = 'string' then
    return (v_val #>> '{}') = 'unlimited';
  end if;

  return false;
end;
$$;

grant execute on function public.user_has_feature(text) to authenticated, anon;
