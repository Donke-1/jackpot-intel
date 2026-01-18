'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Target, Crown, ChevronRight, Timer, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type CycleRow = {
  id: string;
  name: string;
  status: string;
  created_at: string | null;
  credit_cost: number | null;
  is_free: boolean | null;
  goal_settings: any;
};

type VariantSettlement = {
  correct_count: number | null;
  tier_hit: string | null;
  payout_estimated: number | null;
  payout_actual: number | null;
};

type LatestSettled = {
  id: string;
  currency: string | null;
  prize_pool: number | null;
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
  lock_time: string | null;
  sites?: { name: string } | null;
  jackpot_types?: { name: string } | null;
};

function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  const cur = currency || 'KES';
  return `${cur} ${Number(amount).toLocaleString()}`;
}

export default function LiveIntel() {
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [topAgents, setTopAgents] = useState<any[]>([]);
  const [latest, setLatest] = useState<LatestSettled | null>(null);
  const [nextLock, setNextLock] = useState<NextLock | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: cycleRows } = await supabase
        .from('cycles')
        .select('id,name,status,created_at,credit_cost,is_free,goal_settings')
        .in('status', ['active', 'waiting', 'won'])
        .order('created_at', { ascending: false })
        .limit(5);

      setCycles((cycleRows as any) || []);

      // ✅ FIX: settled embed through jackpot_variants
      const { data: settled } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,currency,prize_pool,end_time,
          sites:site_id(name),
          jackpot_types:jackpot_type_id(name),
          jackpot_variants(
            id,variant,
            variant_settlements(correct_count,tier_hit,payout_estimated,payout_actual)
          )
        `
        )
        .eq('status', 'settled')
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatest((settled as any) || null);

      const nowIso = new Date().toISOString();
      const { data: next } = await supabase
        .from('jackpot_groups')
        .select(
          `
          lock_time,
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

      const { data: profiles } = await supabase
        .from('profiles')
        .select('username,total_wins')
        .neq('username', null)
        .order('total_wins', { ascending: false })
        .limit(5);

      setTopAgents((profiles as any) || []);
    }

    fetchData();
  }, []);

  const bestSettlement: BestSettlement | null = useMemo(() => {
    const variants = latest?.jackpot_variants || [];
    const all: BestSettlement[] = [];

    for (const v of variants) {
      for (const s of v.variant_settlements || []) {
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

  const liveCount = cycles.filter((c) => c.status === 'active').length;
  const wonCount = cycles.filter((c) => c.status === 'won').length;

  return (
    <div className="h-full flex flex-col justify-center space-y-6 max-w-md mx-auto">
      <div className="flex items-center space-x-2 mb-1">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <h3 className="text-sm font-bold text-green-400 tracking-widest uppercase">Live Network Feed</h3>
      </div>

      <div className="bg-black/40 border border-gray-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3 mb-4 text-yellow-400">
          <Sparkles className="w-5 h-5" />
          <h4 className="font-bold">Latest Proof</h4>
        </div>

        {latest && bestSettlement ? (
          <div className="space-y-3">
            <div className="text-white font-black text-lg">
              {(latest.sites?.name || 'SITE').toUpperCase()} — {(latest.jackpot_types?.name || 'JACKPOT').toUpperCase()}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[12px] text-gray-400">
                Variant <span className="text-white font-black">{bestSettlement.variant || '—'}</span> •{' '}
                <span className="text-white font-black">{bestSettlement.correct_count ?? '—'}</span> correct
              </div>
              <span className="text-[11px] text-gray-500 font-mono">{timeAgo(latest.end_time)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-800 pt-3">
              <div className="text-[12px] text-gray-500">Tier</div>
              <div className="text-[12px] text-white font-black">{bestSettlement.tier_hit || '—'}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[12px] text-gray-500">Estimated payout</div>
              <div className="text-[12px] text-green-400 font-black">
                {formatMoney(bestSettlement.payout_actual ?? bestSettlement.payout_estimated ?? null, latest.currency)}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="mt-2 inline-flex items-center justify-center w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 text-black font-black transition-colors"
            >
              Open Live Cycles <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-xs italic">
            No settled outcomes yet. Lock results in the admin settling queue to display proof here.
          </div>
        )}
      </div>

      {/* rest of your component stays the same */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-cyan-300">
            <Crown className="w-4 h-4" />
            <div className="text-xs font-black uppercase tracking-widest">Cycles</div>
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Live {liveCount} • Won {wonCount}
          </div>
        </div>

        <div className="space-y-2">
          {cycles.map((c) => (
            <div key={c.id} className="flex items-center justify-between border border-gray-800 rounded-lg px-3 py-2 bg-black/40">
              <div>
                <div className="text-sm font-black text-white">{c.name}</div>
                <div className="text-[10px] text-gray-500 uppercase font-bold">
                  {(c.goal_settings?.goalType || 'Target')} • {c.is_free ? 'FREE' : `${c.credit_cost ?? 0} credits`}
                </div>
              </div>
              <div className={cn('text-[10px] font-black uppercase', c.status === 'won' ? 'text-green-400' : c.status === 'active' ? 'text-cyan-300' : 'text-amber-300')}>
                {c.status}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-gray-800 pt-4 flex items-center justify-between">
          <div className="text-[11px] text-gray-500 flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            Next lock: <span className="text-gray-300 font-bold">{nextLock?.lock_time ? timeToLockLabel(nextLock.lock_time) : '—'}</span>
          </div>
          <Link href="/dashboard" className="text-[11px] text-cyan-300 font-black flex items-center">
            Open <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      <div className="bg-black/40 border border-gray-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 text-purple-300 mb-3">
          <Trophy className="w-4 h-4" />
          <div className="text-xs font-black uppercase tracking-widest">Top Agents</div>
        </div>
        <div className="space-y-2">
          {topAgents.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="text-white font-bold">{p.username}</div>
              <div className="text-[11px] text-gray-500 font-mono">{p.total_wins ?? 0} wins</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
