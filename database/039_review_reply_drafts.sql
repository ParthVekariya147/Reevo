-- ============================================================
-- 039 — AI Review Reply Draft Mode
--
-- New table:  review_reply_drafts   (owner-pasted review → Claude draft)
-- Alter:      reply_settings        (add reply_length)
-- Alter:      businesses            (add reply_draft_limit_override)
-- Seed:       admin_settings        (free_reply_draft_limit = 10)
--
-- Safe to re-run: IF NOT EXISTS + ON CONFLICT DO NOTHING.
-- ============================================================

-- ── 1. review_reply_drafts ───────────────────────────────────
create table if not exists public.review_reply_drafts (
  id             uuid        primary key default gen_random_uuid(),
  business_id    uuid        not null references public.businesses(id) on delete cascade,
  reviewer_name  text,
  rating         int         check (rating between 1 and 5),
  review_text    text        not null,
  reply_draft    text,
  tone_used      text,
  length_used    text,
  copied_at      timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists review_reply_drafts_biz_created_idx
  on public.review_reply_drafts(business_id, created_at desc);

alter table public.review_reply_drafts enable row level security;

drop policy if exists "reply_drafts_owner" on public.review_reply_drafts;
create policy "reply_drafts_owner" on public.review_reply_drafts
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- ── 2. reply_settings: reply_length ─────────────────────────
alter table public.reply_settings
  add column if not exists reply_length text not null default 'medium'
    check (reply_length in ('short', 'medium', 'long'));

-- ── 3. businesses: per-business override ─────────────────────
-- NULL = use global free_reply_draft_limit from admin_settings.
-- -1 = unlimited for this business regardless of plan.
-- Any positive int = that many drafts/month on free plan.
alter table public.businesses
  add column if not exists reply_draft_limit_override int;

-- ── 4. admin_settings: global free limit ─────────────────────
insert into public.admin_settings (key, value) values
  ('free_reply_draft_limit', '10')
on conflict (key) do nothing;

-- ── ROLLBACK ─────────────────────────────────────────────────
-- drop table if exists public.review_reply_drafts;
-- alter table public.reply_settings drop column if exists reply_length;
-- alter table public.businesses drop column if exists reply_draft_limit_override;
-- delete from public.admin_settings where key = 'free_reply_draft_limit';
-- ─────────────────────────────────────────────────────────────
