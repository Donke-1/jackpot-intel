'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Banknote,
  Target,
  Zap,
  Timer,
  Sparkles,
  Crown,
  Flame,
} from 'lucide-react';
import CosmicHero from '@/components/landing/CosmicHero';
import LiveIntel from '@/components/landing/LiveIntel';
import { supabase } from '@/lib/supabase';

type VariantSettlement = {
  correct_count: number | null;
  tier_hit: string | null;
  payout_estimated: number | null;
  payout_actual: number | null;
};

type LatestSettled = {
  id: string;
  prize_pool: number | null;
  currency: string | null;
  end_time: string | null;
  sites?: { name: string } | null;
  jackpot_types?: { name: string } | null;
  jackpot_variants?: Array<{
    id: string;
    variant: 'A' | 'B' | string;
    variant_settlements?: VariantSettlement[];
  }>;
};

type BestSettlement = VariantSettlement & { variant: 'A' | 'B' | string };

type NextLock = {
  id: string;
  lock_time: string | null;
  prize_pool: number | null;
  currency: string | null;
  sites?: { name: string; code: string } | null;
  jackpot_types?: { name: string; code: string } | null;
  jackpot_variants?: Array<{ variant: 'A' | 'B' }>;
};

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  const cur = currency || 'KES';
  return `${cur} ${Number(amount).toLocaleString()}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function timeToLockLabel(lockIso: string | null) {
  if (!lockIso) return '—';
  const t = new Date(lockIso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = t - Date.now();
  if (diff <= 0) return 'Locked';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function HookPill({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-black/40 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-cyan-300 text-xs font-black uppercase tracking-widest">
        {icon} {title}
      </div>
      <div className="text-gray-400 text-sm mt-2">{desc}</div>
    </div>
  );
}

export default function LandingClient() {
  const [latest, setLatest] = useState<LatestSettled | null>(null);
  const [nextLock, setNextLock] = useState<NextLock | null>(null);

  useEffect(() => {
    async function fetchLatestSettled() {
      const { data } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,prize_pool,currency,end_time,
          sites:site_id(name),
          jackpot_types:jackpot_type_id(name),
          jackpot_variants(
            id,variant,
            variant_settlements(
              correct_count,tier_hit,payout_estimated,payout_actual
            )
          )
        `
        )
        .eq('status', 'settled')
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatest((data as any) || null);
    }

    async function fetchNextLock() {
      const nowIso = new Date().toISOString();

      const { data } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,lock_time,prize_pool,currency,status,
          sites:site_id(name,code),
          jackpot_types:jackpot_type_id(name,code),
          jackpot_variants(variant)
        `
        )
        .in('status', ['draft', 'active'])
        .gt('lock_time', nowIso)
        .order('lock_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextLock((data as any) || null);
    }

    fetchLatestSettled();
    fetchNextLock();
  }, []);

  const bestSettlement: BestSettlement | null = useMemo(() => {
    const variants = latest?.jackpot_variants || [];
    if (!variants.length) return null;

    const all: BestSettlement[] = [];
    for (const v of variants) {
      const settlements = v.variant_settlements || [];
      for (const s of settlements) {
        all.push({ ...s, variant: v.variant });
      }
    }
    if (!all.length) return null;

    return all.sort((a, b) => {
      const aPay = (a.payout_actual ?? a.payout_estimated ?? 0) as number;
      const bPay = (b.payout_actual ?? b.payout_estimated ?? 0) as number;
      if (bPay !== aPay) return bPay - aPay;
      return (b.correct_count ?? 0) - (a.correct_count ?? 0);
    })[0];
  }, [latest]);

  const hasA = Boolean(nextLock?.jackpot_variants?.some((v) => v.variant === 'A'));
  const hasB = Boolean(nextLock?.jackpot_variants?.some((v) => v.variant === 'B'));

  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO */}
      <section className="relative pt-24 pb-12 min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-cyan-900/25 blur-[140px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 relative order-2 lg:order-1">
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-900/10 text-cyan-300 text-[11px] font-black uppercase tracking-widest">
                  <Sparkles className="w-4 h-4" />
                  Jackpot Intel Engine
                </div>
                <h1 className="text-4xl font-black text-white mt-4 uppercase leading-tight">
                  Stop guessing.
                  <br />
                  <span className="text-cyan-400">Start hunting bonuses.</span>
                </h1>
                <p className="text-gray-400 text-sm mt-4">
                  Choose Variant A, Variant B, or run A+B coverage. You control the risk and the cost.
                </p>
              </div>

              <CosmicHero />

              <div className="hidden lg:block mt-[-60px] relative z-20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-900/10 text-cyan-300 text-[11px] font-black uppercase tracking-widest">
                    <Crown className="w-4 h-4" />
                    Superhuman Slip Builder
                  </div>

                  {nextLock?.lock_time && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-900/10 text-amber-300 text-[11px] font-black uppercase tracking-widest">
                      <Timer className="w-4 h-4" />
                      Next lock in {timeToLockLabel(nextLock.lock_time)}
                    </div>
                  )}
                </div>

                <h1 className="text-6xl font-black text-white leading-none mb-6 uppercase">
                  JACKPOT
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-500">
                    WIN STRATEGY.
                  </span>
                </h1>

                <p className="text-gray-300 text-xl mb-6 max-w-xl font-medium">
                  Don’t chase the full jackpot blindly.
                  <br />
                  <strong>Hunt bonuses first —</strong> and upgrade to A+B when you want maximum coverage.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 max-w-2xl">
                  <HookPill icon={<Zap className="w-4 h-4" />} title="A / B / A+B" desc="Pay for coverage you want." />
                  <HookPill icon={<Target className="w-4 h-4" />} title="Cycles" desc="Bundles that chase targets." />
                  <HookPill icon={<Flame className="w-4 h-4" />} title="Lock times" desc="No late entries after kickoff." />
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="px-10 py-5 bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-full text-xl flex items-center shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-105 transition-transform"
                  >
                    OPEN LIVE CYCLES <ArrowRight className="ml-2 w-6 h-6" />
                  </Link>

                  <Link
                    href="/login"
                    className="px-8 py-5 bg-black/40 border border-gray-800 hover:border-gray-700 text-white font-extrabold rounded-full text-xl flex items-center transition-colors"
                  >
                    LOGIN / JOIN
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT rail */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <LiveIntel />

              <div className="mt-6 bg-black/40 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> Proof Snapshot
                </div>

                {latest && bestSettlement ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-white font-black">
                      {(latest.sites?.name || 'Site')} — {(latest.jackpot_types?.name || 'Jackpot')}
                    </div>
                    <div className="text-[12px] text-gray-500">
                      Ended: <span className="text-gray-300">{formatDateTime(latest.end_time)}</span>
                    </div>
                    <div className="text-[12px] text-gray-500">
                      Variant: <span className="text-white font-black">{bestSettlement.variant}</span> •{' '}
                      <span className="text-white font-black">{bestSettlement.correct_count ?? '—'}</span> correct
                    </div>
                    <div className="text-[12px] text-gray-500">
                      Est payout:{' '}
                      <span className="text-green-400 font-black">
                        {formatMoney(bestSettlement.payout_actual ?? bestSettlement.payout_estimated ?? null, latest.currency)}
                      </span>
                    </div>
                    <div className="text-[12px] text-gray-500">
                      Pool: <span className="text-gray-200 font-bold">{formatMoney(latest.prize_pool ?? null, latest.currency)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-gray-500 italic">No settled outcomes yet.</div>
                )}

                <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
                  <div>
                    Next lock: <span className="text-gray-300">{nextLock?.lock_time ? formatDateTime(nextLock.lock_time) : '—'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full border ${hasA ? 'border-cyan-500/40 text-cyan-300' : 'border-gray-800 text-gray-600'}`}>
                      A
                    </span>
                    <span className={`px-2 py-1 rounded-full border ${hasB ? 'border-cyan-500/40 text-cyan-300' : 'border-gray-800 text-gray-600'}`}>
                      B
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Link href="/dashboard" className="flex-1">
                    <div className="bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl py-3 text-center">
                      Open Dashboard
                    </div>
                  </Link>
                  <Link href="/jackpots" className="flex-1">
                    <div className="bg-black/40 border border-gray-800 hover:border-gray-700 text-white font-black rounded-xl py-3 text-center">
                      Shop
                    </div>
                  </Link>
                </div>

                <div className="mt-4 flex items-center justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-3 h-3" /> Pay per variant
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Upgrade to A+B
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
