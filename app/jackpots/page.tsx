'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Lock, Timer, ShoppingCart, Layers } from 'lucide-react';

type VariantCode = 'A' | 'B';

type GroupRow = {
  id: string;
  status: string;
  lock_time: string | null;
  end_time: string | null;
  prize_pool: number | null;
  currency: string | null;
  sites?: { name: string; code: string } | null;
  jackpot_types?: { name: string; code: string } | null;
  jackpot_variants?: Array<{ id: string; variant: VariantCode; price_credits: number | null }>;
};

type PurchaseRow = {
  group_id: string;
  variants: VariantCode[];
};

const DEFAULT_PRICE_A = 10;
const DEFAULT_PRICE_B = 10;
// Must match the SQL RPC bundle discount (10%)
const BUNDLE_DISCOUNT_PCT = 0.1;

function timeToLock(lockIso: string | null) {
  if (!lockIso) return '—';
  const t = new Date(lockIso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = t - Date.now();
  if (diff <= 0) return 'LOCKED';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function normalizePrice(n: number | null | undefined, fallback: number) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function bundlePrice(a: number, b: number) {
  const raw = (a + b) * (1 - BUNDLE_DISCOUNT_PCT);
  return Math.max(1, Math.round(raw));
}

function variantsKey(v: VariantCode[]) {
  return [...v].sort().join('+');
}

export default function JackpotShopPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user ?? null;
      setUser(u);

      if (u) {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', u.id).single();
        setCredits(profile?.credits ?? 0);

        const { data: pur } = await supabase
          .from('jackpot_purchases')
          .select('group_id,variants')
          .eq('user_id', u.id);

        setPurchases((pur as any) || []);
      } else {
        setCredits(0);
        setPurchases([]);
      }

      const nowIso = new Date().toISOString();
      const { data: g } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,status,lock_time,end_time,prize_pool,currency,
          sites:site_id(name,code),
          jackpot_types:jackpot_type_id(name,code),
          jackpot_variants(id,variant,price_credits)
        `
        )
        .in('status', ['draft', 'active'])
        .gt('lock_time', nowIso)
        .order('lock_time', { ascending: true })
        .limit(60);

      setGroups((g as any) || []);
      setLoading(false);
    }

    fetchAll();
  }, []);

  const purchaseSet = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const p of purchases) {
      if (!m.has(p.group_id)) m.set(p.group_id, new Set());
      m.get(p.group_id)!.add(variantsKey(p.variants || []));
    }
    return m;
  }, [purchases]);

  async function refreshCreditsAndPurchases() {
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
    setCredits(profile?.credits ?? credits);

    const { data: pur } = await supabase
      .from('jackpot_purchases')
      .select('group_id,variants')
      .eq('user_id', user.id);

    setPurchases((pur as any) || []);
  }

  async function buy(group: GroupRow, variants: VariantCode[]) {
    if (!user) {
      router.push('/login');
      return;
    }

    const lock = group.lock_time ? new Date(group.lock_time).getTime() : 0;
    if (lock && lock <= Date.now()) {
      alert('This jackpot is already locked.');
      return;
    }

    const key = `${group.id}:${variantsKey(variants)}`;
    setBuying(key);

    try {
      const { data, error } = await supabase.rpc('purchase_jackpot_group', {
        p_group_id: group.id,
        p_variants: variants,
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.message || 'Purchase failed.');
      }

      if (data.message === 'already_owned') {
        alert('You already own these variants for this jackpot.');
      } else {
        alert(`Purchase successful. Charged ${data.cost} credits.`);
      }

      if (typeof data.remaining_credits === 'number') {
        setCredits(data.remaining_credits);
      } else {
        await refreshCreditsAndPurchases();
      }

      await refreshCreditsAndPurchases();
    } catch (e: any) {
      // The RPC throws specific errors; show message directly
      alert(e?.message || 'Purchase failed.');
    } finally {
      setBuying(null);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-black text-gray-500 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Jackpot Shop</h1>
            <p className="text-gray-500 text-sm">
              Buy single jackpots (Variant A, Variant B, or complete A+B coverage).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-gray-800 text-gray-300 text-[10px]">
              {user ? `Credits: ${credits}` : 'Guest'}
            </Badge>
            <Link href="/dashboard" className="text-cyan-400 font-bold text-sm hover:text-cyan-300">
              Back to Cycles →
            </Link>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center text-gray-500">
            No active jackpots right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((g) => {
              const site = g.sites?.name || 'Site';
              const type = g.jackpot_types?.name || 'Jackpot';

              const varA = g.jackpot_variants?.find((v) => v.variant === 'A') || null;
              const varB = g.jackpot_variants?.find((v) => v.variant === 'B') || null;

              const priceA = normalizePrice(varA?.price_credits ?? null, DEFAULT_PRICE_A);
              const priceB = normalizePrice(varB?.price_credits ?? null, DEFAULT_PRICE_B);
              const priceAB = bundlePrice(priceA, priceB);

              const purchased = purchaseSet.get(g.id) || new Set<string>();

              const boughtA = purchased.has('A');
              const boughtB = purchased.has('B');
              const boughtAB = purchased.has('A+B');

              const hasAAccess = boughtA || boughtAB;
              const hasBAccess = boughtB || boughtAB;
              const hasBothAccess = boughtAB || (boughtA && boughtB);

              const lockTxt = timeToLock(g.lock_time);
              const locked = lockTxt === 'LOCKED';

              let abLabel = `A+B • ${priceAB}`;
              let abVariantsToBuy: VariantCode[] = ['A', 'B'];

              if (hasBothAccess) {
                abLabel = 'A+B ✓';
                abVariantsToBuy = ['A', 'B'];
              } else if (hasAAccess && !hasBAccess) {
                abLabel = `Add B • ${priceB}`;
                abVariantsToBuy = ['B'];
              } else if (hasBAccess && !hasAAccess) {
                abLabel = `Add A • ${priceA}`;
                abVariantsToBuy = ['A'];
              }

              return (
                <div key={g.id} className="bg-gray-900/20 border border-gray-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
                        <Timer className="w-4 h-4 text-amber-400" /> Locks in {lockTxt}
                      </div>
                      <div className="text-xl font-black text-white tracking-tight mt-1">
                        {site} — {type}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Pool:{' '}
                        <span className="text-white font-bold">
                          {g.prize_pool == null ? '—' : Number(g.prize_pool).toLocaleString()}
                        </span>{' '}
                        {g.currency || 'KES'}
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] border-gray-800 text-gray-300">
                      {g.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[12px] text-gray-400 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Available:
                      <span className={cn('font-black', varA ? 'text-cyan-300' : 'text-gray-700')}> A</span>
                      <span className={cn('font-black', varB ? 'text-cyan-300' : 'text-gray-700')}> B</span>
                    </div>

                    {locked && (
                      <span className="text-[11px] text-red-400 flex items-center gap-1">
                        <Lock className="w-4 h-4" /> Locked
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      disabled={!varA || locked || hasAAccess}
                      onClick={() => buy(g, ['A'])}
                      className="border-gray-800 hover:border-cyan-500"
                    >
                      {hasAAccess ? 'A ✓' : `A • ${priceA}`}
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!varB || locked || hasBAccess}
                      onClick={() => buy(g, ['B'])}
                      className="border-gray-800 hover:border-cyan-500"
                    >
                      {hasBAccess ? 'B ✓' : `B • ${priceB}`}
                    </Button>

                    <Button
                      disabled={!varA || !varB || locked || hasBothAccess}
                      onClick={() => buy(g, abVariantsToBuy)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-black"
                    >
                      {abLabel}
                    </Button>
                  </div>

                  {buying?.startsWith(g.id) && (
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Processing…
                    </div>
                  )}

                  {!user && (
                    <div className="text-[11px] text-gray-600">
                      Login to purchase.{' '}
                      <Link href="/login" className="text-cyan-400 font-bold hover:text-cyan-300">
                        Login →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
