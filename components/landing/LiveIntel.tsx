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

type LatestSettled = {
  id: string;
  currency: string | null;
  prize_pool: number | null;
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
      // 1) Active + won cycles (real)
      const { data: cycleRows } = await supabase
        .from('cycles')
        .select('id,name,status,created_at,credit_cost,is_free,goal_settings')
        .in('status', ['active', 'waiting', 'won'])
        .order('created_at', { ascending: false })
        .limit(5);

      setCycles((cycleRows as any) || []);

      // 2) Latest settled jackpot (bait)
      const { data: settled } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,currency,prize_pool,end_time,
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

      setLatest((settled as any) || null);

      // 3) Next lock (urgency)
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

      // 4) Top agents (keep, but real)
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

  const bestSettlement = useMemo(() => {
    const arr = latest?.variant_settlements || [];
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => {
      const aPay = (a.payout_actual ?? a.payout_estimated ?? 0) as number;
      const bPay = (b.payout_actual ?? b.payout_estimated ?? 0) as number;
      if (bPay !== aPay) return bPay - aPay;
      const aC = a.correct_count ?? 0;
      const bC = b.correct_count ?? 0;
      return bC - aC;
    });
    return sorted[0];
  }, [latest]);

  const liveCount = cycles.filter((c) => c.status === 'active').length;
  const wonCount = cycles.filter((c) => c.status === 'won').length;

  return (
    <div className="h-full flex flex-col justify-center space-y-6 max-w-md mx-auto">
      {/* HEADER */}
      <div className="flex items-center space-x-2 mb-1">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <h3 className="text-sm font-bold text-green-400 tracking-widest uppercase">Live Network Feed</h3>
      </div>

      {/* CARD 0: Latest proof */}
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
                Variant <span className="text-white font-black">{bestSettlement.jackpot_variants?.variant || '—'}</span> •{' '}
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

      {/* CARD 1: Cycle feed */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 text-cyan-400">
            <Target className="w-5 h-5" />
            <h4 className="font-bold">Hot Cycles</h4>
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
            <Zap className="w-3 h-3 text-cyan-400" /> {liveCount} live • {wonCount} won
          </div>
        </div>

        {cycles.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-xs italic">Waiting for cycle injection…</div>
        ) : (
          <div className="space-y-4">
            {cycles.slice(0, 4).map((cycle) => {
              const goal = cycle.goal_settings?.goalType || 'Target';
              const tag = cycle.status === 'won' ? 'WON' : cycle.status === 'active' ? 'LIVE' : 'WAITING';
              const tagColor =
                cycle.status === 'won'
                  ? 'bg-green-900/30 text-green-400 border-green-900'
                  : cycle.status === 'active'
                  ? 'bg-yellow-900/30 text-yellow-500 border-yellow-900'
                  : 'bg-amber-900/30 text-amber-300 border-amber-900';

              const price = cycle.is_free ? 'FREE' : `${cycle.credit_cost ?? 0} credits`;

              return (
                <Link
                  href="/dashboard"
                  key={cycle.id}
                  className="group flex justify-between items-center border-b border-gray-800 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-800/50 rounded px-2 -mx-2 transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-bold text-sm group-hover:text-cyan-400 transition-colors">
                        {cycle.name}
                      </p>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-black uppercase', tagColor)}>
                        {tag}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {goal} • <span className="text-gray-400 font-bold">{price}</span>
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </Link>
              );
            })}
          </div>
        )}

        {/* urgency line */}
        {nextLock?.lock_time && (
          <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-[11px]">
            <div className="text-gray-500 flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-400" /> Next lock
            </div>
            <div className="text-white font-black">
              {timeToLockLabel(nextLock.lock_time)}{' '}
              <span className="text-gray-500 font-bold">
                • {(nextLock.sites?.name || 'Site')} {nextLock.jackpot_types?.name ? `— ${nextLock.jackpot_types.name}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: Top agents */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3 mb-4 text-purple-400">
          <Crown className="w-5 h-5 text-yellow-400" />
          <h4 className="font-bold">Elite Operatives</h4>
        </div>

        <div className="space-y-3">
          {topAgents.map((agent, i) => {
            const codename = agent.username || null;
            const wins = agent.total_wins || 0;
            if (!codename) return null;

            return (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border',
                      i === 0
                        ? 'bg-yellow-500 text-black border-yellow-400'
                        : i === 1
                        ? 'bg-gray-400 text-black border-gray-300'
                        : i === 2
                        ? 'bg-orange-700 text-white border-orange-500'
                        : 'bg-gray-800 text-gray-500 border-gray-700'
                    )}
                  >
                    {i + 1}
                  </div>

                  <div>
                    <p className="text-sm text-gray-300 font-mono group-hover:text-white transition-colors">
                      Agent {codename}
                    </p>
                    <p className="text-[10px] text-gray-500">Rank {i + 1}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm font-bold text-white">
                    <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
                    {wins} Wins
                  </div>
                </div>
              </div>
            );
          })}

          {topAgents.length === 0 && (
            <p className="text-xs text-gray-500 italic text-center">No operatives yet. First winners will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
