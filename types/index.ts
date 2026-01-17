// types/index.ts
// Canonical types aligned to the new Supabase schema (jackpot_groups + jackpot_variants A/B)

export type JackpotGroupStatus =
  | 'draft'
  | 'active'
  | 'locked'
  | 'settling'
  | 'settled'
  | 'archived';

export type FixtureStatus =
  | 'scheduled'
  | 'finished'
  | 'void'
  | 'postponed'
  | 'abandoned';

export type CycleStatus =
  | 'draft'
  | 'active'
  | 'waiting'
  | 'won'
  | 'expired'
  | 'archived';

export type SubscriptionStatus = 'active' | 'cancelled' | 'refunded';

export type PredictionPick = '1' | 'X' | '2' | string;

export type VariantCode = 'A' | 'B';

export interface UserProfile {
  id: string; // uuid
  email?: string | null;
  username?: string | null;
  is_admin?: boolean | null;
  credits?: number | null;
  total_wins?: number | null;
  created_at?: string | null;
}

/**
 * Betting sites (bookmakers) - e.g., SportPesa, Betika, etc.
 */
export interface Site {
  id: string; // uuid
  code: string; // unique slug e.g. "sportpesa"
  name: string;
  is_active?: boolean | null;
  created_at?: string | null;
}

/**
 * Jackpot types per site - e.g., Daily/Weekly/Mega/Supa
 */
export interface JackpotType {
  id: string; // uuid
  site_id: string; // uuid -> sites.id
  code: string; // e.g. "daily"
  name: string; // e.g. "Daily Jackpot"
  is_active?: boolean | null;
  created_at?: string | null;
}

/**
 * Default payout rules per site/type.
 * tiers: JSON describing thresholds + payout formulas/amounts.
 */
export interface PayoutRule {
  id: string; // uuid
  site_id: string;
  jackpot_type_id: string;
  currency?: string | null; // e.g. "KES"
  tiers: Record<string, unknown>; // jsonb
  created_at?: string | null;
}

/**
 * The bookmaker's real jackpot instance.
 * This is shared by both variants (A/B).
 */
export interface JackpotGroup {
  id: string; // uuid
  site_id: string;
  jackpot_type_id: string;
  external_ref?: string | null;
  draw_date?: string | null; // timestamptz
  lock_time?: string | null; // timestamptz
  end_time?: string | null; // timestamptz
  status: JackpotGroupStatus;
  currency?: string | null; // default "KES"
  prize_pool?: number | null; // numeric
  payout_tiers_override?: Record<string, unknown> | null; // jsonb
  created_at?: string | null;
  created_by?: string | null; // uuid -> profiles.id
  notes?: string | null;

  // Nested selects (optional)
  site?: Site;
  jackpot_type?: JackpotType;
  variants?: JackpotVariant[];
  fixtures?: Fixture[];
}

/**
 * A/B predictions for a jackpot group (strategy outputs).
 */
export interface JackpotVariant {
  id: string; // uuid
  group_id: string; // uuid -> jackpot_groups.id
  variant: VariantCode; // 'A' | 'B'
  strategy_tag?: string | null; // e.g. "Strategy A"
  price_credits?: number | null; // per-variant pricing (optional)
  created_at?: string | null;

  // Nested selects (optional)
  group?: JackpotGroup;
  predictions?: Prediction[];
  settlement?: VariantSettlement | null;
}

/**
 * One match in a jackpot list.
 * Fixtures/results are shared across variants.
 */
export interface Fixture {
  id: string; // uuid
  group_id: string; // uuid -> jackpot_groups.id
  seq: number; // order within jackpot
  match_name?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  kickoff_time: string; // timestamptz
  status: FixtureStatus;
  result?: string | null; // e.g. '1' | 'X' | '2'
  final_score?: string | null;
  created_at?: string | null;

  // Nested selects (optional)
  group?: JackpotGroup;
}

/**
 * Prediction for a specific fixture in a specific variant.
 */
export interface Prediction {
  id: string; // uuid
  variant_id: string; // uuid -> jackpot_variants.id
  fixture_id: string; // uuid -> fixtures.id
  pick: PredictionPick;
  rationale?: string | null;
  confidence?: number | null;
  created_at?: string | null;

  // Nested selects (optional)
  fixture?: Fixture;
  variant?: JackpotVariant;
}

/**
 * Computed settlement stats per variant after results are locked.
 */
export interface VariantSettlement {
  variant_id: string; // uuid -> jackpot_variants.id (PK)
  correct_count?: number | null;
  tier_hit?: string | null;
  payout_estimated?: number | null;
  payout_actual?: number | null;
  settled_at?: string | null;
  settled_by?: string | null; // uuid -> profiles.id
  notes?: string | null;

  // Nested selects (optional)
  variant?: JackpotVariant;
}

/**
 * A cycle = goal-driven bundle of jackpot variants.
 */
export interface Cycle {
  id: string; // uuid
  name: string;
  category: string; // keep flexible; your UI can constrain it
  status: CycleStatus;
  goal_settings?: Record<string, unknown> | null; // jsonb
  credit_cost?: number | null;
  is_free?: boolean | null;
  max_end_at?: string | null; // timestamptz
  created_at?: string | null;
  created_by?: string | null; // uuid -> profiles.id

  // Nested selects (optional)
  variants?: CycleVariantLink[];
}

/**
 * Link table: which variants (A/B) are included in a cycle.
 * group_id is included to keep A/B "sisters" aligned for UI.
 */
export interface CycleVariantLink {
  cycle_id: string; // uuid
  group_id: string; // uuid -> jackpot_groups.id
  variant_id: string; // uuid -> jackpot_variants.id
  is_paired?: boolean | null;
  created_at?: string | null;

  // Nested selects (optional)
  cycle?: Cycle;
  group?: JackpotGroup;
  variant?: JackpotVariant;
}

/**
 * User joined a cycle (subscription/participation).
 */
export interface CycleSubscription {
  id: string; // uuid
  user_id: string; // uuid -> auth.users.id
  cycle_id: string; // uuid -> cycles.id
  status: SubscriptionStatus;
  credits_paid?: number | null;
  joined_at?: string | null;

  // Nested selects (optional)
  cycle?: Cycle;
  user?: UserProfile;
}

/**
 * User purchased a single jackpot group's predictions.
 * variants array indicates A only, B only, or both.
 */
export interface JackpotPurchase {
  id: string; // uuid
  user_id: string; // uuid
  group_id: string; // uuid
  variants: VariantCode[]; // ['A'] | ['B'] | ['A','B']
  credits_paid?: number | null;
  created_at?: string | null;

  // Nested selects (optional)
  group?: JackpotGroup;
}

/**
 * Audited credit movements (admin awards, refunds, purchases, joins).
 */
export interface CreditLedgerEntry {
  id: string; // uuid
  user_id: string; // uuid
  delta: number; // +/-
  reason: string;
  ref_type?: string | null;
  ref_id?: string | null; // uuid as string
  created_by?: string | null; // uuid -> profiles.id
  created_at?: string | null;
}
