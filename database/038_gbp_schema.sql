-- ============================================================
-- Automated Google Review Reply — Phase 1 Schema
-- Three new tables: gbp_connections, gbp_reviews, reply_settings
-- Conventions: text + CHECK (not PG enums), timestamptz, uuid PKs
-- Safe to re-run: IF NOT EXISTS + idempotent RLS blocks
-- ============================================================

-- ── 1. gbp_connections ───────────────────────────────────────
-- One row per (business, GBP location). Stores encrypted refresh token.
create table if not exists public.gbp_connections (
  id                uuid        primary key default gen_random_uuid(),
  business_id       uuid        not null references public.businesses(id) on delete cascade,
  google_account_id text        not null,
  location_id       text        not null,
  refresh_token     text,                    -- AES-256-GCM blob, null when revoked
  status            text        not null default 'active'
                    check (status in ('active', 'revoked', 'error')),
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now(),

  unique (business_id, location_id)
);

create index if not exists gbp_connections_business_idx on public.gbp_connections(business_id);
create index if not exists gbp_connections_status_idx   on public.gbp_connections(status);

alter table public.gbp_connections enable row level security;

-- Owners can read their own connections; all writes go through service role.
drop policy if exists gbp_connections_owner_select on public.gbp_connections;
create policy gbp_connections_owner_select
  on public.gbp_connections for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = gbp_connections.business_id
        and businesses.owner_id = auth.uid()
    )
  );

-- ── 2. gbp_reviews ───────────────────────────────────────────
-- One row per Google review. Synced by background cron (Phase 2).
create table if not exists public.gbp_reviews (
  id                uuid        primary key default gen_random_uuid(),
  connection_id     uuid        not null references public.gbp_connections(id) on delete cascade,
  google_review_id  text        not null unique,
  rating            int         check (rating between 1 and 5),
  comment           text,
  reviewer_name     text,
  review_created_at timestamptz,
  reply_text        text,
  reply_status      text        not null default 'pending'
                    check (reply_status in (
                      'pending', 'drafted', 'awaiting_approval',
                      'approved', 'sent', 'failed'
                    )),
  replied_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists gbp_reviews_connection_idx    on public.gbp_reviews(connection_id);
create index if not exists gbp_reviews_reply_status_idx  on public.gbp_reviews(reply_status);
create index if not exists gbp_reviews_created_idx       on public.gbp_reviews(created_at desc);

alter table public.gbp_reviews enable row level security;

-- Owners can read reviews that belong to their connections.
drop policy if exists gbp_reviews_owner_select on public.gbp_reviews;
create policy gbp_reviews_owner_select
  on public.gbp_reviews for select
  using (
    exists (
      select 1
      from public.gbp_connections
      join public.businesses on businesses.id = gbp_connections.business_id
      where gbp_connections.id = gbp_reviews.connection_id
        and businesses.owner_id = auth.uid()
    )
  );

-- ── 3. reply_settings ────────────────────────────────────────
-- One row per business. Created on first GBP connect (or on demand).
-- Mirrors plan_prices style: business_id is the PK.
create table if not exists public.reply_settings (
  business_id          uuid    primary key references public.businesses(id) on delete cascade,
  auto_reply_enabled   boolean not null default false,
  auto_activated       boolean not null default false,  -- set true after first paid auto-post
  admin_force_state    text    check (admin_force_state in ('on', 'off') or admin_force_state is null),
  tone                 text    not null default 'friendly',
  signature            text,
  language             text                              -- null = inherit from businesses.language
);

alter table public.reply_settings enable row level security;

-- Owners can read their own settings; writes via service role API routes.
drop policy if exists reply_settings_owner_select on public.reply_settings;
create policy reply_settings_owner_select
  on public.reply_settings for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = reply_settings.business_id
        and businesses.owner_id = auth.uid()
    )
  );
