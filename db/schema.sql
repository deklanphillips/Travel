-- Pointfare database schema (Postgres / Neon).
-- Apply with:  psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists pgcrypto;

-- Accounts (used by the paywall in Phase 2).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  is_pro boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- Price-drop alerts: notify when a watched route's fare drops.
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  origin text not null,
  destination text,                -- null/empty = "anywhere from origin"
  cabin text not null default 'economy',
  depart_date text not null,       -- exact day (YYYY-MM-DD) or month (YYYY-MM)
  return_date text,                -- set for round-trip alerts
  target_price integer,            -- USD; null = "any drop"
  last_notified_price integer,     -- last price we emailed about
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists alerts_active_idx on alerts (active);

-- Fare snapshots, used to detect price drops over time.
create table if not exists price_history (
  id bigserial primary key,
  origin text not null,
  destination text not null,
  cabin text not null,
  depart_date text not null,
  price integer not null,          -- USD
  carrier text,
  observed_at timestamptz not null default now()
);
create index if not exists price_history_route_idx
  on price_history (origin, destination, cabin, depart_date, observed_at desc);

-- Award (miles) availability cache — our own aggregated data over time.
create table if not exists award_cache (
  id bigserial primary key,
  program text not null,
  program_code text,
  origin text not null,
  destination text not null,
  depart_date date not null,
  cabin text not null,
  miles integer not null,
  fees integer not null default 0,
  seats integer,
  carrier_code text,
  source text,
  updated_at timestamptz not null default now(),
  unique (program, origin, destination, depart_date, cabin, miles)
);
create index if not exists award_cache_route_idx
  on award_cache (origin, destination, depart_date, cabin);
