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

type LatestSettled = {
  id: string;
  prize_pool: number | null;
  currency: string | null;
  end_time: string | null;
  sites?: { name: string } | null;
  jackpot_types?: { name: string } | null;
  variant_settlements?: Array<{
    correct_count: number | null;
    tier_hit: string | null;
    payout_estimated: number | null;
    payout_actual: number | null;
    jackpot_variants?: { variant: 'A' | 'B' } | null;
  }>;
};

type NextLock = {
  id: string;
  lock_time: string | null;
  prize_pool: number | null;
  currency: string | null;
  sites?: { name: string } | null;
  jackpot_types?: { name: string } | null;
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

export default function LandingPage() {
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
          variant_settlements(
            correct_count,tier_hit,payout_estimated,payout_actual,
            jackpot_variants:variant_id(variant)
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
          sites:site_id(name),
          jackpot_types:jackpot_type_id(name),
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

  const bestSettlement = useMemo(() => {
    if (!latest?.variant_settlements || latest.variant_settlements.length === 0) return null;

    const sorted = [...latest.variant_settlements].sort((a, b) => {
      const aPay = (a.payout_actual ?? a.payout_estimated ?? 0) as number;
      const bPay = (b.payout_actual ?? b.payout_estimated ?? 0) as number;
      if (bPay !== aPay) return bPay - aPay;
      const aC = a.correct_count ?? 0;
      const bC = b.correct_count ?? 0;
      return bC - aC;
    });

    return sorted[0];
  }, [latest]);

  const hasA = Boolean(nextLock?.jackpot_variants?.some((v) => v.variant === 'A'));
  const hasB = Boolean(nextLock?.jackpot_variants?.some((v) => v.variant === 'B'));

  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO */}
      <section className="relative pt-24 pb-12 min-h-screen flex items-center overflow-hidden">
        {/* Background FX */}
        <div className="absolute inset-0 bg-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-cyan-900/25 blur-[140px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* LEFT: Visual + Copy */}
            <div className="lg:col-span-7 relative order-2 lg:order-1">
              {/* Mobile heading */}
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

              {/* Cosmic hero (keep) */}
              <CosmicHero />

              {/* Desktop CTA + hooks */}
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

                {/* Greedy hooks (but truthful) */}
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
                    className="px-8 py-5 bg-white/5 hover:bg-white/10 text-white font-extrabold rounded-full text-lg border border-gray-800 transition-colors"
                  >
                    Create account
                  </Link>
                </div>

                <p className="mt-4 text-sm text-gray-500">
                  *We show what you had access to (A, B, or A+B) when results are locked. No confusion.
                </p>
              </div>
            </div>

            {/* RIGHT: Live feed (keep) */}
            <div className="lg:col-span-5 relative order-1 lg:order-2 h-full">
              {/* Mobile CTA */}
              <div className="lg:hidden mb-8 flex justify-center">
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg w-full text-center shadow-lg border border-green-500"
                >
                  SEE LIVE CYCLES
                </Link>
              </div>

              {/* Live data component */}
              <LiveIntel />

              {/* Next lock card (real data) */}
              {nextLock && (
                <div className="mt-6 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <Timer className="w-4 h-4" /> Next Drop Locks
                    </div>
                    <BadgeMini>{timeToLockLabel(nextLock.lock_time)}</BadgeMini>
                  </div>

                  <div className="text-white font-black text-lg">
                    {(nextLock.sites?.name || 'Site').toUpperCase()} — {(nextLock.jackpot_types?.name || 'Jackpot').toUpperCase()}
                  </div>

                  <div className="text-[12px] text-gray-400 mt-1">
                    Lock time: <span className="text-gray-200 font-bold">{formatDateTime(nextLock.lock_time)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[12px] text-gray-500">
                      Variants ready:{' '}
                      <span className="text-white font-black">
                        {hasA ? 'A' : '—'} {hasB ? 'B' : ''}
                        {hasA && hasB ? ' (A+B)' : ''}
                      </span>
                    </div>
                    <div className="text-[12px] text-gray-500">
                      Pool:{' '}
                      <span className="text-white font-black">
                        {formatMoney(nextLock.prize_pool ?? null, nextLock.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS (more salesy) */}
      <section className="py-20 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white uppercase">Your edge is choice.</h2>
            <p className="text-gray-400">Pay less for a single variant — or run A+B coverage when the pool is juicy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <FeatureCard
              icon={<Target className="w-10 h-10 text-cyan-400" />}
              title="Two strategies, one jackpot"
              desc="Every jackpot can ship as Variant A and Variant B — side-by-side. Upgrade to A+B when you want maximum coverage."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-10 h-10 text-green-400" />}
              title="Lock-time protection"
              desc="No late entry after kickoff. Cycles only accept joins while included jackpots are still eligible."
            />
            <FeatureCard
              icon={<Banknote className="w-10 h-10 text-yellow-400" />}
              title="Transparent outcomes"
              desc="When results are locked, we compute performance per variant. If B wins and you bought A only — you’ll see that truth."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS + Real proof card */}
      <section className="py-20 bg-gray-900/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6 uppercase">How to eat (smart)</h2>
              <ul className="space-y-6">
                <HowStep n="1" title="Create an account" desc="Free signup. Track your joins and access." />
                <HowStep n="2" title="Choose a cycle" desc="Pick A, B, or A+B. Higher coverage costs more." />
                <HowStep n="3" title="Copy the slip" desc="Place the picks in your bookmaker app." />
                <HowStep n="4" title="Watch outcomes" desc="We lock results and compute performance per variant." accent />
              </ul>
            </div>

            <div className="bg-black border border-gray-800 p-8 rounded-2xl relative">
              <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase">
                Proof (Real Data)
              </div>

              {latest && bestSettlement ? (
                <>
                  <h3 className="text-gray-500 uppercase text-xs font-bold mb-2">Latest Settled Outcome</h3>
                  <div className="text-3xl font-black text-white mb-1">
                    {(latest.sites?.name || 'SITE').toUpperCase()} {(latest.jackpot_types?.name || 'JACKPOT').toUpperCase()}
                  </div>

                  <div className="text-green-400 font-mono text-xl mb-6">
                    Variant {bestSettlement.jackpot_variants?.variant || '—'} • {bestSettlement.correct_count ?? '—'} correct
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Tier</span>
                      <span className="text-white font-bold">{bestSettlement.tier_hit || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Estimated Payout</span>
                      <span className="text-white font-bold">
                        {formatMoney(bestSettlement.payout_actual ?? bestSettlement.payout_estimated ?? null, latest.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Prize Pool</span>
                      <span className="text-white font-bold">{formatMoney(latest.prize_pool ?? null, latest.currency)}</span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    className="block mt-6 bg-white hover:bg-gray-200 text-black text-center font-bold py-3 rounded uppercase transition-colors"
                  >
                    Open Live Cycles
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-gray-500 uppercase text-xs font-bold mb-2">No Settlements Yet</h3>
                  <div className="text-2xl font-black text-white mb-2">Lock results to show proof here.</div>
                  <p className="text-gray-400 text-sm mb-6">
                    Once you settle a jackpot (A/B), this panel becomes real-time proof for new users.
                  </p>
                  <Link
                    href="/admin/settling"
                    className="block mt-2 bg-white hover:bg-gray-200 text-black text-center font-bold py-3 rounded uppercase transition-colors"
                  >
                    Go to Settling Queue
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-b from-black to-green-900/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase">
            Ready to hunt the <span className="text-green-500">pool?</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Join a cycle, pick your variant coverage, and move before lock time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-block px-12 py-5 bg-green-500 text-black font-black text-xl rounded-lg hover:bg-green-400 hover:scale-105 transition-all shadow-[0_0_40px_rgba(34,197,94,0.4)]"
            >
              VIEW LIVE CYCLES
            </Link>
            <Link
              href="/login"
              className="inline-block px-12 py-5 bg-white/5 text-white font-black text-xl rounded-lg hover:bg-white/10 transition-all border border-gray-800"
            >
              CREATE ACCOUNT
            </Link>
          </div>
          <p className="text-[11px] text-gray-600 mt-4">
            *No fake numbers. Everything you see here becomes real as you ingest & settle jackpots.
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-6 bg-gray-900/30 border border-gray-800 rounded-xl hover:border-green-500/50 transition-colors group">
      <div className="mb-4 inline-block p-3 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function HookPill({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="px-4 py-3 rounded-2xl border border-gray-800 bg-black/40">
      <div className="flex items-center gap-2 text-white font-black text-sm">
        <span className="text-cyan-400">{icon}</span> {title}
      </div>
      <div className="text-[12px] text-gray-500 mt-1">{desc}</div>
    </div>
  );
}

function HowStep({
  n,
  title,
  desc,
  accent,
}: {
  n: string;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <li className="flex items-start">
      <span
        className={
          accent
            ? 'flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-white mt-1 shadow-lg shadow-green-500/50'
            : 'flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center font-bold text-white mt-1'
        }
      >
        {n}
      </span>
      <div className="ml-4">
        <h4 className={accent ? 'text-xl font-bold text-green-400' : 'text-xl font-bold text-white'}>{title}</h4>
        <p className={accent ? 'text-gray-300' : 'text-gray-400'}>{desc}</p>
      </div>
    </li>
  );
}

function BadgeMini({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-gray-800 bg-black/40 text-gray-300">
      {children}
    </span>
  );
}
