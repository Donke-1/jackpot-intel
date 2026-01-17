# JackpotIntel

A Next.js + Supabase web app for publishing jackpot predictions and bundling them into cycles. Supports **two sister prediction variants (A/B)** per jackpot, atomic purchases/joining via Supabase RPCs, and an admin workflow for ingest → cycle creation → settling.

---

## What this app does

### Core concepts

- **Sites**: bookmakers (SportPesa, Mozzart, SportyBet, Shabiki).
- **Jackpot Types**: per-site jackpot formats (e.g., mega/midweek/daily/grand).
- **Jackpot Group**: a real jackpot list instance from a bookmaker (fixtures + lock time + prize pool).
- **Jackpot Variants (A/B)**: two sister prediction sets for the same jackpot group (Strategy A and Strategy B).
- **Fixtures**: match list shared by both A/B variants.
- **Predictions**: one pick per fixture per variant.
- **Cycles**: bundles of variants across groups; users can join cycles to unlock predictions.
- **Settling**: admin enters results for fixtures, locks results, computes settlements, updates cycles.

### Key user flows

- **Public / Guest**
  - View landing page with live intel & proof (when available).
  - Browse active cycles on Dashboard (predictions blurred).
  - Browse Jackpot Shop (purchase requires login).

- **User**
  - Join a cycle (credits-based), unlocking A/B predictions for all included variants.
  - Purchase single jackpot variant A, B, or upgrade to A+B.
  - View wallet and activity/ledger.
  - Submit support ticket.

- **Admin**
  - Ingest jackpot fixtures + predictions into inventory (A and B variants).
  - Create/extend cycles by selecting group variants.
  - Set per-variant prices for single jackpot purchases.
  - Settle results: enter fixture outcomes → lock → compute settlements → update cycles.
  - Manage users: award/deduct credits, toggle admin.
  - Manage support inbox.

---

## Tech stack

- **Next.js (App Router)**
- **Supabase**
  - Postgres + RLS
  - Auth
  - RPC functions for atomic operations

---

## Repository structure (high level)

- `app/` — Next.js pages/routes
  - `app/dashboard` — main cycle marketplace
  - `app/jackpots` — single jackpot shop
  - `app/support` — user support form
  - `app/payments` — payments coming soon + manual top-up CTA
  - `app/admin/*` — admin console
- `components/` — UI components
- `lib/` — Supabase client and shared utilities
- `types/` — canonical TypeScript types aligned to DB schema

---

## Database model (Supabase)

### Core tables

- `profiles` — user profile + credits + admin flag + total wins
- `sites` — bookmaker list
- `jackpot_types` — per-site type list
- `payout_rules` — per site/type default tiers JSON

- `jackpot_groups` — the real jackpot list instance
- `jackpot_variants` — A/B variants per group (includes `price_credits`)
- `fixtures` — match list per group + results
- `predictions` — pick per variant per fixture
- `variant_settlements` — computed stats per variant after results lock

- `cycles` — cycle metadata + `goal_settings`
- `cycle_variants` — cycle ↔ variant links (supports pairing)
- `cycle_subscriptions` — user joins

- `jackpot_purchases` — user single purchases (A/B/A+B)
- `credit_ledger` — auditable credit movements

### Support tables

- `support_tickets` — user support tickets

### Settlement tracking tables

- `cycle_group_results` — per (cycle, group) computed best-of-variants hit status
- `cycle_win_log` — idempotency table to avoid awarding wins multiple times

---

## Required Supabase RPC functions

These functions are part of the production-ready core loop:

- `purchase_jackpot_group(p_group_id uuid, p_variants text[])` — atomic single jackpot purchase & credit deduction
- `join_cycle(p_cycle_id uuid)` — atomic cycle join & credit deduction
- `settle_group_and_update_cycles(p_group_id uuid)` — updates cycle progress / marks cycles won / increments user total_wins

---

## Local development

### 1) Prereqs

- Node.js 18+ (recommended)
- npm / pnpm / yarn
- Supabase project created

### 2) Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

> Do **not** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. If/when you add server-only endpoints, keep it server-side only.

### 3) Install and run

```bash
npm install
npm run dev
```

App will run at:

- `http://localhost:3000`

---

## Supabase setup checklist

### 1) Create schema (first-time deployment)

If this is the first deployment on a fresh Supabase project, run the **canonical schema SQL** in Supabase **SQL Editor**. This creates all tables/enums/RLS/policies/triggers used by the app.

> Tip: If you already experimented with other schemas, you can wipe `public` first using a "nuclear reset" (drop everything in `public`) and then apply the schema.

#### Canonical schema SQL (copy/paste)

```sql
begin;

create extension if not exists pgcrypto;

-- =========
-- Enums
-- =========
do $$
begin
  if not exists (select 1 from pg_type where typname = 'jackpot_group_status') then
    create type public.jackpot_group_status as enum
      ('draft','active','locked','settling','settled','archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'fixture_status') then
    create type public.fixture_status as enum
      ('scheduled','finished','void','postponed','abandoned');
  end if;

  if not exists (select 1 from pg_type where typname = 'cycle_status') then
    create type public.cycle_status as enum
      ('draft','active','waiting','won','expired','archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum
      ('active','cancelled','refunded');
  end if;
end $$;

-- =========
-- Profiles + admin helper
-- =========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  is_admin boolean default false,
  credits integer default 0,
  total_wins integer default 0,
  created_at timestamptz default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, timezone('utc', now()))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========
-- Sites & Jackpot Types
-- =========
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default timezone('utc', now())
);

create table public.jackpot_types (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default timezone('utc', now()),
  unique(site_id, code)
);

create table public.payout_rules (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  jackpot_type_id uuid not null references public.jackpot_types(id) on delete cascade,
  currency text default 'KES',
  tiers jsonb not null default '{}'::jsonb,
  created_at timestamptz default timezone('utc', now()),
  unique(site_id, jackpot_type_id)
);

-- =========
-- Jackpot Group + A/B Variants
-- =========
create table public.jackpot_groups (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id),
  jackpot_type_id uuid not null references public.jackpot_types(id),
  external_ref text,
  draw_date timestamptz,
  lock_time timestamptz,
  end_time timestamptz,
  status public.jackpot_group_status not null default 'draft',
  currency text default 'KES',
  prize_pool numeric,
  payout_tiers_override jsonb,
  created_at timestamptz default timezone('utc', now()),
  created_by uuid references public.profiles(id),
  notes text
);

create table public.jackpot_variants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.jackpot_groups(id) on delete cascade,
  variant text not null check (variant in ('A','B')),
  strategy_tag text,
  price_credits integer default 0,
  created_at timestamptz default timezone('utc', now()),
  unique(group_id, variant)
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.jackpot_groups(id) on delete cascade,
  seq integer not null,
  match_name text,
  home_team text,
  away_team text,
  kickoff_time timestamptz not null,
  status public.fixture_status not null default 'scheduled',
  result text,
  final_score text,
  created_at timestamptz default timezone('utc', now()),
  unique(group_id, seq)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.jackpot_variants(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  pick text not null,
  rationale text,
  confidence integer,
  created_at timestamptz default timezone('utc', now()),
  unique(variant_id, fixture_id)
);

create table public.variant_settlements (
  variant_id uuid primary key references public.jackpot_variants(id) on delete cascade,
  correct_count integer default 0,
  tier_hit text,
  payout_estimated numeric,
  payout_actual numeric,
  settled_at timestamptz,
  settled_by uuid references public.profiles(id),
  notes text
);

-- =========
-- Cycles + Subscriptions
-- =========
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  status public.cycle_status not null default 'draft',
  goal_settings jsonb not null default '{}'::jsonb,
  credit_cost integer default 0,
  is_free boolean default false,
  max_end_at timestamptz,
  created_at timestamptz default timezone('utc', now()),
  created_by uuid references public.profiles(id)
);

create table public.cycle_variants (
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  group_id uuid not null references public.jackpot_groups(id) on delete cascade,
  variant_id uuid not null references public.jackpot_variants(id) on delete cascade,
  is_paired boolean default true,
  created_at timestamptz default timezone('utc', now()),
  primary key (cycle_id, variant_id)
);

create table public.cycle_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  status public.subscription_status not null default 'active',
  credits_paid integer default 0,
  joined_at timestamptz default timezone('utc', now()),
  unique(user_id, cycle_id)
);

-- =========
-- Purchases + Ledger
-- =========
create table public.jackpot_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.jackpot_groups(id) on delete cascade,
  variants text[] not null,
  credits_paid integer default 0,
  created_at timestamptz default timezone('utc', now())
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref_type text,
  ref_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz default timezone('utc', now())
);

-- =========
-- Helper: access
-- =========
create or replace function public.user_has_variant_access(_variant_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.cycle_subscriptions cs
      join public.cycle_variants cv on cv.cycle_id = cs.cycle_id
      where cs.user_id = auth.uid()
        and cs.status = 'active'
        and cv.variant_id = _variant_id
    )
    or exists (
      select 1
      from public.jackpot_purchases jp
      join public.jackpot_variants jv on jv.group_id = jp.group_id
      where jp.user_id = auth.uid()
        and jv.id = _variant_id
        and jv.variant = any (jp.variants)
    );
$$;

-- =========
-- RLS enable
-- =========
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.jackpot_types enable row level security;
alter table public.payout_rules enable row level security;
alter table public.jackpot_groups enable row level security;
alter table public.jackpot_variants enable row level security;
alter table public.fixtures enable row level security;
alter table public.predictions enable row level security;
alter table public.variant_settlements enable row level security;
alter table public.cycles enable row level security;
alter table public.cycle_variants enable row level security;
alter table public.cycle_subscriptions enable row level security;
alter table public.jackpot_purchases enable row level security;
alter table public.credit_ledger enable row level security;

-- Profiles: own read/update; admin read all
create policy "profiles_read_own" on public.profiles
for select to authenticated
using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- Public read: cycles/groups/variants/fixtures
create policy "public_read_cycles" on public.cycles
for select to anon, authenticated
using (true);

create policy "public_read_cycle_variants" on public.cycle_variants
for select to anon, authenticated
using (true);

create policy "public_read_groups" on public.jackpot_groups
for select to anon, authenticated
using (true);

create policy "public_read_variants" on public.jackpot_variants
for select to anon, authenticated
using (true);

create policy "public_read_fixtures" on public.fixtures
for select to anon, authenticated
using (true);

-- Predictions: read only if access
create policy "predictions_read_with_access" on public.predictions
for select to authenticated
using (public.user_has_variant_access(variant_id) or public.is_admin());

-- Admin-only write core tables
create policy "admin_write_sites" on public.sites
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_types" on public.jackpot_types
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_rules" on public.payout_rules
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_groups" on public.jackpot_groups
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_variants" on public.jackpot_variants
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_fixtures" on public.fixtures
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_predictions" on public.predictions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_variant_settlements" on public.variant_settlements
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_cycles" on public.cycles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_cycle_variants" on public.cycle_variants
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Users can insert/read their own subscriptions/purchases
create policy "subs_insert_own" on public.cycle_subscriptions
for insert to authenticated
with check (auth.uid() = user_id);

create policy "subs_read_own_or_admin" on public.cycle_subscriptions
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "purchases_insert_own" on public.jackpot_purchases
for insert to authenticated
with check (auth.uid() = user_id);

create policy "purchases_read_own_or_admin" on public.jackpot_purchases
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

-- Ledger: user can read own; admin can insert; user spend insert handled by RPC in production hardening
create policy "ledger_read_own_or_admin" on public.credit_ledger
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "ledger_admin_write" on public.credit_ledger
for insert to authenticated
with check (public.is_admin());

commit;
```

After applying the schema, continue with seeding **Sites**, **Jackpot Types**, and **Payout Rules** below.

### 2) Seed sites + jackpot types

Seed `sites` and `jackpot_types` so codes are consistent:

- SportPesa: `mega`, `midweek`
- Mozzart: `daily`, `grand`
- SportyBet: `jackpot12`
- Shabiki: `power17`, `power13`, `supa`

### 3) Seed payout rules

Insert default `payout_rules.tiers` for each site/type.

### 4) Create admin user

- Supabase Dashboard → Authentication → Users → Add user (email + password)
- Then set admin in SQL:

```sql
update public.profiles
set is_admin = true,
    credits = 1000
where id = 'ADMIN_AUTH_UUID';
```

If `profiles` rows are missing for existing auth users:

```sql
insert into public.profiles (id, email, created_at)
select id, email, timezone('utc', now())
from auth.users
on conflict (id) do nothing;
```

---

## Deployment

### Option A) Vercel (recommended)

1. Push repo to GitHub.
2. Import project into Vercel.
3. Set environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

### Option B) Any Node hosting

1. Build:

```bash
npm run build
```

2. Start:

```bash
npm run start
```

3. Ensure env vars are set in the runtime environment.

---

## Operational workflow

### Admin: Ingest

1. Go to `/admin/ingest`
2. Select platform + type + strategy variant (A or B)
3. Generate AI prompt → paste output → commit
4. Repeat for the sister variant (A then B) using the same `external_ref` to keep them paired.

### Admin: Create cycles

1. Go to `/admin/cycles`
2. Select jackpot groups and choose A, B, or A+B
3. Publish cycle (set credits and goal)

### Users: Join cycles

- Users join from `/dashboard` using **atomic** `join_cycle` RPC.

### Admin: Settling

1. Go to `/admin/settling`
2. Select a group
3. Enter fixture results
4. Click **LOCK RESULTS**
   - Writes `variant_settlements`
   - Marks group `settled`
   - Calls `settle_group_and_update_cycles`

### Users: Single purchases

- Users buy from `/jackpots` via `purchase_jackpot_group`.

---

## Pending production hardening

These are the remaining items to make the system fully production-grade:

1. **Expire/refund engine**
   - Auto-expire cycles at `max_end_at`
   - Refund credits (partial/full) based on cycle performance
   - Ledger-backed credit grants (no direct profile updates)

2. **Payment integration**
   - M-Pesa / card checkout
   - Payment webhooks → credit_ledger credits → profiles balance

3. **Admin write hardening**
   - Move admin mutations to server-only endpoints using service-role key
   - Reduce reliance on client-side admin writes

4. **Payout distribution**
   - Decide whether payouts are assumed, claimed, or verified
   - Add payout event records per user/cycle/group and credit them

5. **Better settlement and analytics**
   - Per-cycle performance UI (bonus progress, best variant, history)
   - More accurate payout estimation models per site/type

6. **Observability & QA**
   - Structured logging for RPC failures
   - Sentry/error reporting
   - Automated tests for RPCs and critical flows

7. **Content/legal**
   - Clear disclaimers around betting, payout variability, and risk
   - Terms/policies pages

