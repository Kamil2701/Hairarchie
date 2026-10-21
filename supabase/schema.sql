-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- after creating your Supabase project. See README.md for the full setup steps.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text not null default '',
  -- null until the customer creates a login (salted scrypt hash,
  -- "<salt-hex>:<hash-hex>" — see src/lib/customers.ts). A customer row
  -- created only from a booking (no account yet) has no password.
  password_hash text,
  created_at timestamptz not null default now()
);

alter table customers
  add column if not exists password_hash text;
alter table customers
  alter column phone set default '';

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  service_ids text[] not null,
  stylist_id text not null,
  date date not null,
  start_min integer not null check (start_min >= 0 and start_min < 1440),
  duration_min integer not null check (duration_min > 0),
  customer_id uuid references customers (id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  notes text not null default '',
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'attended')),
  created_at timestamptz not null default now()
);

-- One row per point-earning (or, later, point-spending) event. Points
-- balance for a customer is the sum of their rows here — no separate
-- counter to keep in sync, and it's ready for redemptions (negative
-- `points`) once customer accounts/login exist.
create table if not exists points_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id),
  booking_id uuid references bookings (id),
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  -- at most one earn-transaction per booking, so marking "erschienen"
  -- twice (or after an undo + redo) can't double-credit
  unique (booking_id)
);

create index if not exists points_transactions_customer_idx on points_transactions (customer_id);

create index if not exists bookings_stylist_date_idx on bookings (stylist_id, date);
create index if not exists bookings_date_idx on bookings (date);

-- Belt-and-braces against double-booking under concurrent requests: the
-- app already checks availability before inserting, but two requests
-- can race that check. This constraint makes overlapping confirmed
-- bookings for the same stylist+date impossible at the database level,
-- regardless of app-level timing.
create extension if not exists btree_gist;

alter table bookings
  add column if not exists time_range int4range
  generated always as (int4range(start_min, start_min + duration_min)) stored;

alter table bookings
  drop constraint if exists bookings_no_overlap;
alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    stylist_id with =,
    date with =,
    time_range with &&
  ) where (status <> 'cancelled');

-- Row Level Security is on with no policies: the app only ever talks to
-- Supabase with the service-role key (server-side only), which bypasses
-- RLS. This just makes sure the anon/public key — if it ever leaks or
-- gets used by mistake — cannot read or write customer bookings.
alter table bookings enable row level security;
alter table customers enable row level security;
alter table points_transactions enable row level security;

-- Blocked periods: admin-created "no bookings here" windows (vacation,
-- illness, salon closures). A null stylist_id blocks the whole salon.
-- A null start_min/end_min blocks the entire day for every date in
-- [start_date, end_date].
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  stylist_id text,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  start_min integer check (start_min is null or (start_min >= 0 and start_min < 1440)),
  end_min integer check (end_min is null or (end_min > 0 and end_min <= 1440)),
  reason text not null default '',
  created_at timestamptz not null default now(),
  check ((start_min is null) = (end_min is null)),
  check (start_min is null or end_min > start_min)
);

create index if not exists blocks_stylist_idx on blocks (stylist_id);
create index if not exists blocks_date_range_idx on blocks (start_date, end_date);

alter table blocks enable row level security;
