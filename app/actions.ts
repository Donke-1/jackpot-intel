'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Server actions are executed on the server, but using anon key means RLS still applies.
// Later, admin-only actions should use a service role client in route handlers.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type JoinCycleResult = { success: boolean; message: string };

function nowIso() {
  return new Date().toISOString();
}

/**
 * Checks whether a cycle is joinable right now.
 * Rules:
 * - Cycle must not be won/expired/archived.
 * - If cycle has attached jackpot groups with a lock_time in the future -> join allowed.
 * - If cycle has no attached groups OR all are locked -> allow join only if cycle.status === 'waiting'
 *   (this matches your "join for next jackpot drop" behavior).
 */
async function canJoinCycle(cycleId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data: cycle, error: cycleErr } = await supabase
    .from('cycles')
    .select('id,status,max_end_at')
    .eq('id', cycleId)
    .single();

  if (cycleErr || !cycle) return { ok: false, reason: 'Cycle not found.' };

  if (cycle.status === 'won' || cycle.status === 'expired' || cycle.status === 'archived') {
    return { ok: false, reason: `Cycle is not joinable (status: ${cycle.status}).` };
  }

  // If cycle has an expiry and it passed, treat as not joinable.
  if (cycle.max_end_at) {
    const maxEnd = new Date(cycle.max_end_at).getTime();
    if (!Number.isNaN(maxEnd) && Date.now() > maxEnd) {
      return { ok: false, reason: 'Cycle has expired.' };
    }
  }

  // Fetch attached groups and their lock_time.
  const { data: links, error: linksErr } = await supabase
    .from('cycle_variants')
    .select('group_id, jackpot_groups:group_id(lock_time,status)')
    .eq('cycle_id', cycleId);

  if (linksErr) {
    // If we can't inspect, fail closed.
    return { ok: false, reason: 'Unable to validate cycle eligibility.' };
  }

  const groups = (links || [])
    .map((l: any) => l.jackpot_groups)
    .filter(Boolean) as Array<{ lock_time: string | null; status: string }>;

  // If there are no groups attached, allow join only for waiting cycles.
  if (groups.length === 0) {
    return cycle.status === 'waiting'
      ? { ok: true }
      : { ok: false, reason: 'Cycle has no active jackpots attached yet.' };
  }

  // If any group locks in the future, join is allowed.
  const hasFutureLock = groups.some((g) => {
    if (!g.lock_time) return false;
    const t = new Date(g.lock_time).getTime();
    return !Number.isNaN(t) && t > Date.now();
  });

  if (hasFutureLock) return { ok: true };

  // Otherwise, all attached jackpots are already locked -> allow only if cycle is waiting.
  if (cycle.status === 'waiting') return { ok: true };

  return { ok: false, reason: 'Cycle entry is locked (jackpots already kicked off).' };
}

/**
 * Join a cycle (subscription/participation).
 * - Deduct credits if cycle is paid (credit_cost > 0 and not is_free).
 * - Writes to credit_ledger for audit.
 *
 * NOTE:
 * credit_ledger insert is admin-only by RLS in our canonical schema. For now, we only deduct by updating
 * profiles.credits to keep MVP moving. We'll move credit adjustments into an admin RPC later.
 */
export async function joinCycle(cycleId: string, userId: string): Promise<JoinCycleResult> {
  // 1) Validate join eligibility by time/state
  const eligible = await canJoinCycle(cycleId);
  if (!eligible.ok) {
    return { success: false, message: eligible.reason || 'Cycle is not joinable.' };
  }

  // 2) Fetch cycle cost/free flags
  const { data: cycle, error: cycleErr } = await supabase
    .from('cycles')
    .select('id,credit_cost,is_free,status')
    .eq('id', cycleId)
    .single();

  if (cycleErr || !cycle) {
    return { success: false, message: 'Cycle not found.' };
  }

  const creditCost = Number(cycle.credit_cost || 0);
  const isFree = Boolean(cycle.is_free);

  // 3) Upsert subscription first (so user doesn't get charged twice in weird edge cases)
  //    We set credits_paid later after charge is successful.
  const { data: subUpsert, error: subErr } = await supabase
    .from('cycle_subscriptions')
    .upsert(
      {
        user_id: userId,
        cycle_id: cycleId,
        status: 'active',
        joined_at: nowIso(),
        credits_paid: 0,
      },
      { onConflict: 'user_id,cycle_id' }
    )
    .select('id,credits_paid')
    .single();

  if (subErr || !subUpsert) {
    return { success: false, message: subErr?.message || 'Failed to join cycle.' };
  }

  // If it's free, we're done.
  if (isFree || creditCost <= 0) {
    revalidatePath('/dashboard');
    revalidatePath('/account');
    revalidatePath('/');
    return { success: true, message: 'Joined cycle (free).' };
  }

  // 4) Charge credits (MVP: update profiles.credits directly)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (profileErr) {
    return { success: false, message: 'Unable to check credit balance.' };
  }

  const currentCredits = Number(profile?.credits || 0);
  if (currentCredits < creditCost) {
    return { success: false, message: `Insufficient credits. Need ${creditCost}.` };
  }

  const { error: deductErr } = await supabase
    .from('profiles')
    .update({ credits: currentCredits - creditCost })
    .eq('id', userId);

  if (deductErr) {
    return { success: false, message: 'Credit transaction failed.' };
  }

  // 5) Record credits_paid on subscription
  const { error: paidErr } = await supabase
    .from('cycle_subscriptions')
    .update({ credits_paid: creditCost })
    .eq('id', subUpsert.id);

  if (paidErr) {
    // Best-effort refund if subscription update fails
    await supabase.from('profiles').update({ credits: currentCredits }).eq('id', userId);
    return { success: false, message: 'Join completed but failed to record payment; refunded.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/account');
  revalidatePath('/');
  return { success: true, message: `Joined cycle using ${creditCost} credits.` };
}

/**
 * Admin-only (conceptually): Lock results for a jackpot group.
 * For MVP we keep this as a placeholder to be implemented via an admin route handler
 * using the service role key, because it must write fixtures/results + settlements.
 *
 * We'll implement this after updating the Admin Settling UI.
 */
export async function lockJackpotResultsPlaceholder(): Promise<JoinCycleResult> {
  return {
    success: false,
    message:
      'Not implemented yet. This will be implemented as a server-only admin endpoint (service role) during the Settling phase.',
  };
}
