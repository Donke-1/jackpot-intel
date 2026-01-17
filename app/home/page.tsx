'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Zap,
  Trophy,
  Timer,
  ShoppingBag,
  Wallet,
  Layers,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CycleRow = {
  id: string;
  name: string;
  status: string; // active/waiting/won
  is_free: boolean | null;
  credit_cost: number | null;
  goal_settings: any;
  created_at: string | null;
};

type NextLock = {
  id: string;
  lock_time: string | null;
  prize_pool: number | null;
  currency: string | null;
  sites?: { name: string } | null;
  jackpot_types?: { name: string } | null;
};

type LatestSettled = {
  id: string;
  end_time: string | null;
  currency: string | null;
  prize_pool: number | null;
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

function fmtMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  return `${currency || 'KES'} ${Number(amount).toLocaleString()}`;
}

function goalLabel(c: CycleRow) {
  const gt = c?.goal_settings?.goalType;
  return typeof gt === 'string' && gt.trim() ? gt : 'Target';
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);

  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [joinedCycleIds, setJoinedCycleIds] = useState<Set<string>>(new Set());

  const [nextLock, setNextLock] = useState<NextLock | null>(null);
  const [latestSettled, setLatestSettled] = useState<LatestSettled | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      // auth
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user ?? null;
      setUser(u);

      if (!u) {
        // if somehow not logged in, send them to marketing
        window.location.href = '/';
        return;
      }

      // profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits,username')
        .eq('id', u.id)
        .single();
      setCredits(profile?.credits ?? 0);
      setUsername(profile?.username ?? null);

      // cycles
      const { data: cyc } = await supabase
        .from('cycles')
        .select('id,name,status,is_free,credit_cost,goal_settings,created_at')
        .in('status', ['active', 'waiting', 'won'])
        .order('created_at', { ascending: false })
        .limit(12);

      setCycles((cyc as any) || []);

      // joined cycles
      const { data: subs } = await supabase
        .from('cycle_subscriptions')
        .select('cycle_id,status')
        .eq('user_id', u.id);

      const joined = new Set<string>();
      (subs as any[] | null)?.forEach((s) => {
        if (s.status === 'active') joined.add(s.cycle_id);
      });
      setJoinedCycleIds(joined);

      // next lock
      const nowIso = new Date().toISOString();
      const { data: next } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,lock_time,prize_pool,currency,
          sites:site_id(name),
          jackpot_types:jackpot_type_id(name)
        `
        )
        .in('status', ['draft', 'active'])
        .gt('lock_time', nowIso)
        .order('lock_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextLock((next as any) || null);

      // latest settled proof
      const { data: settled } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,end_time,currency,prize_pool,
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

      setLatestSettled((settled as any) || null);

      setLoading(false);
    }

    fetchAll();
  }, []);

  const bestSettlement = useMemo(() => {
    const arr = latestSettled?.variant_settlements || [];
    if (!arr.length) return null;
    return [...arr].sort((a, b) => {
      const ap = (a.payout_actual ?? a.payout_estimated ?? 0) as number;
      const bp = (b.payout_actual ?? b.payout_estimated ?? 0) as number;
      if (bp !== ap) return bp - ap;
      return (b.correct_count ?? 0) - (a.correct_count ?? 0);
    })[0];
  }, [latestSettled]);

  const activeCycles = useMemo(() => cycles.filter((c) => c.status === 'active'), [cycles]);
  const wonCycles = useMemo(() => cycles.filter((c) => c.status === 'won'), [cycles]);

  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-900/10 text-cyan-300 text-[11px] font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              Home Console
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3">
              Welcome back{username ? `, ${username}` : ''}.
            </h1>
            <p className="text-gray-500 mt-2">
              Your quick command center: cycles, proof, and next lock.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-gray-800 text-gray-300 text-[10px]">
              Credits: {credits}
            </Badge>
            <Link href="/dashboard/wallet">
              <Button variant="outline" className="border-gray-800 text-gray-200">
                <Wallet className="w-4 h-4 mr-2" />
                Vault
              </Button>
            </Link>
            <Link href="/jackpots">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-black">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Jackpot Shop
              </Button>
            </Link>
          </div>
        </div>

        {/* Top tiles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Next lock */}
          <div className="bg-gray-900/20 border border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-2">
                <Timer className="w-4 h-4" /> Next Lock
              </div>
              <Badge variant="outline" className="border-gray-800 text-gray-300 text-[10px]">
                {nextLock?.lock_time ? timeToLockLabel(nextLock.lock_time) : '—'}
              </Badge>
            </div>
            <div className="mt-3 text-xl font-black">
              {nextLock ? `${nextLock.sites?.name || 'Site'} — ${nextLock.jackpot_types?.name || 'Jackpot'}` : 'No upcoming lock'}
            </div>
            <div className="mt-2 text-[12px] text-gray-500">
              Pool: <span className="text-white font-bold">{fmtMoney(nextLock?.prize_pool ?? null, nextLock?.currency ?? 'KES')}</span>
            </div>
            <div className="mt-4">
              <Link href="/jackpots">
                <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black">
                  Buy before lock <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Proof */}
          <div className="bg-gray-900/20 border border-gray-800 rounded-3xl p-6">
            <div className="text-xs font-black uppercase tracking-widest text-green-300 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Latest Proof
            </div>
            {latestSettled && bestSettlement ? (
              <>
                <div className="mt-3 text-xl font-black">
                  {(latestSettled.sites?.name || 'SITE')} — {(latestSettled.jackpot_types?.name || 'JACKPOT')}
                </div>
                <div className="mt-2 text-[12px] text-gray-500">
                  Variant <span className="text-white font-black">{bestSettlement.jackpot_variants?.variant || '—'}</span> •{' '}
                  <span className="text-white font-black">{bestSettlement.correct_count ?? '—'}</span> correct
                </div>
                <div className="mt-2 text-[12px] text-gray-500">
                  Est payout:{' '}
                  <span className="text-green-400 font-black">
                    {fmtMoney(bestSettlement.payout_actual ?? bestSettlement.payout_estimated ?? null, latestSettled.currency)}
                  </span>
                </div>
                <div className="mt-4">
                  <Link href="/results">
                    <Button variant="outline" className="w-full border-gray-800 text-gray-200">
                      Open archives <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 text-xl font-black">No settled proof yet</div>
                <div className="mt-2 text-[12px] text-gray-500">
                  Once you settle jackpots, proof shows up here automatically.
                </div>
              </>
            )}
          </div>

          {/* Announcements placeholder */}
          <div className="bg-gray-900/20 border border-gray-800 rounded-3xl p-6">
            <div className="text-xs font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Announcements
            </div>
            <div className="mt-3 text-gray-500 text-sm">
              Coming soon: news, strategy updates, featured wins, promo artwork.
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-gray-800 bg-black/40 p-3 text-[12px] text-gray-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Gallery
              </div>
              <div className="rounded-2xl border border-gray-800 bg-black/40 p-3 text-[12px] text-gray-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Slides
              </div>
            </div>
          </div>
        </div>

        {/* Cycles summary */}
        <div className="bg-gray-900/20 border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Your Cycle Summary
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="border-gray-800 text-gray-200">
                Open dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
              <div className="text-[11px] text-gray-500 uppercase font-black">Live cycles</div>
              <div className="text-3xl font-black mt-1">{activeCycles.length}</div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
              <div className="text-[11px] text-gray-500 uppercase font-black">Won cycles</div>
              <div className="text-3xl font-black mt-1">{wonCycles.length}</div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
              <div className="text-[11px] text-gray-500 uppercase font-black">Joined</div>
              <div className="text-3xl font-black mt-1">{joinedCycleIds.size}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {cycles.slice(0, 6).map((c) => {
              const joined = joinedCycleIds.has(c.id);
              return (
                <Link key={c.id} href={`/dashboard?cycle=${c.id}`}>
                  <div className="rounded-2xl border border-gray-800 bg-black/40 p-4 hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-white">{c.name}</div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {goalLabel(c)} • {c.is_free ? 'FREE' : `${c.credit_cost ?? 0} credits`}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] border-gray-800',
                            c.status === 'won' ? 'text-green-400' : c.status === 'active' ? 'text-cyan-300' : 'text-amber-300'
                          )}
                        >
                          {c.status.toUpperCase()}
                        </Badge>
                        {joined && (
                          <Badge variant="outline" className="text-[10px] border-gray-800 text-gray-300">
                            JOINED
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
