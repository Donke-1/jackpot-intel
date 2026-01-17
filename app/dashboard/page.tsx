'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BoastFeed from './BoastFeed';
import DailyDrops from '@/components/DailyDrops';
import SuccessModal from './SuccessModal';
import StatusCard from '@/components/ui/StatusCard';
import { Badge } from '@/components/ui/Badge';
import { Loader2, LayoutGrid, Zap, TrendingUp, Sparkles, Calendar, Lock, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Cycle, CycleSubscription, JackpotGroup, JackpotVariant, Fixture, Prediction } from '@/types';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

type CycleCard = Cycle & {
  userJoined?: boolean;
  userCreditsPaid?: number;
};

type CycleContentGroup = JackpotGroup & {
  sites?: { name: string; code: string } | null;
  jackpot_types?: { name: string; code: string } | null;
};

type VariantWithPreds = JackpotVariant & {
  predictions?: Array<Prediction & { fixture?: Fixture }>;
};

function getGoalLabel(cycle: any): string {
  const gt = cycle?.goal_settings?.goalType;
  if (typeof gt === 'string' && gt.trim()) return gt.trim();
  if (typeof cycle?.category === 'string' && cycle.category.trim()) return cycle.category.trim();
  return '—';
}

export default function Dashboard() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);

  const [cycles, setCycles] = useState<CycleCard[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const [cycleGroups, setCycleGroups] = useState<CycleContentGroup[]>([]);
  const [cycleVariants, setCycleVariants] = useState<VariantWithPreds[]>([]);
  const [joinedCycleIds, setJoinedCycleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchBase() {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user ?? null;
      setUser(u);

      if (u) {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', u.id).single();
        setCredits(profile?.credits ?? 0);
      } else {
        setCredits(0);
      }

      const { data: cycleRows } = await supabase
        .from('cycles')
        .select('*')
        .in('status', ['active', 'waiting', 'won'])
        .order('created_at', { ascending: false });

      const list: CycleCard[] = (cycleRows as any) || [];

      if (u) {
        const { data: subs } = await supabase
          .from('cycle_subscriptions')
          .select('cycle_id,status,credits_paid')
          .eq('user_id', u.id);

        const joined = new Set<string>();
        (subs as CycleSubscription[] | null)?.forEach((s) => {
          if (s.status === 'active') joined.add(s.cycle_id);
        });
        setJoinedCycleIds(joined);

        for (const c of list) {
          const match = (subs as any[] | null)?.find((s) => s.cycle_id === c.id && s.status === 'active');
          c.userJoined = Boolean(match);
          c.userCreditsPaid = match?.credits_paid ?? 0;
        }
      } else {
        setJoinedCycleIds(new Set());
      }

      setCycles(list);

      const qp = searchParams.get('cycle');
      const qpMatch = qp ? list.find((c) => c.id === qp) : null;

      if (qpMatch) {
        setSelectedCycleId(qpMatch.id);
      } else if (list.length) {
        const primary = list.find((c) => c.status === 'active') || list[0];
        setSelectedCycleId(primary.id);
      } else {
        setSelectedCycleId(null);
      }

      setLoading(false);
    }

    fetchBase();
  }, [searchParams]);

  useEffect(() => {
    async function fetchCycleContents(cycleId: string) {
      const { data: links, error: linkErr } = await supabase
        .from('cycle_variants')
        .select(
          `
          group_id,
          variant_id,
          is_paired,
          jackpot_groups:group_id(id,status,draw_date,lock_time,end_time,prize_pool,currency,site_id,jackpot_type_id,
            sites:site_id(name,code),
            jackpot_types:jackpot_type_id(name,code)
          ),
          jackpot_variants:variant_id(id,group_id,variant,strategy_tag,price_credits)
        `
        )
        .eq('cycle_id', cycleId);

      if (linkErr) {
        console.error(linkErr);
        setCycleGroups([]);
        setCycleVariants([]);
        return;
      }

      const groupsMap = new Map<string, CycleContentGroup>();
      const variants: VariantWithPreds[] = [];

      (links as any[] | null)?.forEach((l) => {
        const g = l.jackpot_groups as CycleContentGroup | null;
        if (g && !groupsMap.has(g.id)) groupsMap.set(g.id, g);

        const v = l.jackpot_variants as VariantWithPreds | null;
        if (v) variants.push(v);
      });

      const groups = Array.from(groupsMap.values()).sort((a, b) => {
        const ta = a.lock_time ? new Date(a.lock_time).getTime() : 0;
        const tb = b.lock_time ? new Date(b.lock_time).getTime() : 0;
        return ta - tb;
      });

      setCycleGroups(groups);

      if (variants.length === 0) {
        setCycleVariants([]);
        return;
      }

      const variantIds = variants.map((v) => v.id);
      const { data: preds, error: predErr } = await supabase
        .from('predictions')
        .select(
          `
          id,variant_id,fixture_id,pick,confidence,rationale,created_at,
          fixtures:fixture_id(id,group_id,seq,match_name,home_team,away_team,kickoff_time,status,result,final_score)
        `
        )
        .in('variant_id', variantIds);

      if (predErr) {
        setCycleVariants(variants);
        return;
      }

      const byVariant = new Map<string, Array<Prediction & { fixture?: Fixture }>>();
      (preds as any[] | null)?.forEach((p) => {
        const vId = p.variant_id as string;
        if (!byVariant.has(vId)) byVariant.set(vId, []);
        byVariant.get(vId)!.push({ ...p, fixture: p.fixtures });
      });

      const enriched = variants.map((v) => {
        const list = byVariant.get(v.id) || [];
        list.sort((a, b) => (a.fixture?.seq ?? 0) - (b.fixture?.seq ?? 0));
        return { ...v, predictions: list };
      });

      setCycleVariants(enriched);
    }

    if (selectedCycleId) fetchCycleContents(selectedCycleId);
  }, [selectedCycleId]);

  const activeCycle = useMemo(() => cycles.find((c) => c.id === selectedCycleId) || null, [cycles, selectedCycleId]);
  const userJoinedActive = useMemo(() => (activeCycle ? joinedCycleIds.has(activeCycle.id) : false), [activeCycle, joinedCycleIds]);

  const groupsWithVariants = useMemo(() => {
    const vByGroup = new Map<string, VariantWithPreds[]>();
    for (const v of cycleVariants) {
      if (!vByGroup.has(v.group_id)) vByGroup.set(v.group_id, []);
      vByGroup.get(v.group_id)!.push(v);
    }
    for (const [, arr] of vByGroup) {
      arr.sort((a, b) => (a.variant === 'A' ? -1 : 1) - (b.variant === 'A' ? -1 : 1));
    }
    return cycleGroups.map((g) => ({ group: g, variants: vByGroup.get(g.id) || [] }));
  }, [cycleGroups, cycleVariants]);

  const handleJoin = async () => {
    if (!user || !activeCycle) return;

    const { data, error } = await supabase.rpc('join_cycle', { p_cycle_id: activeCycle.id });

    if (error) {
      alert(error.message);
      return;
    }

    if (!data?.ok) {
      alert(data?.message || 'Join failed.');
      return;
    }

    if (data.message === 'already_joined') {
      alert('You already joined this cycle.');
    } else {
      alert(`Joined. Charged ${data.cost} credits.`);
    }

    if (typeof data.remaining_credits === 'number') {
      setCredits(data.remaining_credits);
    }

    // Refresh subscriptions so UI unlocks
    const { data: subs } = await supabase
      .from('cycle_subscriptions')
      .select('cycle_id,status')
      .eq('user_id', user.id);

    const joined = new Set<string>();
    (subs as any[] | null)?.forEach((s) => {
      if (s.status === 'active') joined.add(s.cycle_id);
    });
    setJoinedCycleIds(joined);

    setSelectedCycleId(activeCycle.id);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-20 animate-in fade-in">
      <SuccessModal cycles={cycles as any} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BoastFeed />
        </div>
        <div className="lg:col-span-1">
          <DailyDrops />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black px-4 text-sm font-black text-gray-600 uppercase tracking-[0.3em]">
              Protocol Marketplace
            </span>
          </div>
        </div>

        <Link href="/jackpots">
          <Button variant="outline" className="border-gray-800 text-gray-300 hover:text-white hover:border-cyan-500/60">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Jackpot Shop
          </Button>
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
            <LayoutGrid className="w-3 h-3 mr-2" /> Select Active Deployment
          </h3>
          <Badge variant="outline" className="text-cyan-500 border-cyan-500/30 text-[10px]">
            {cycles.filter((c) => c.status === 'active').length} Live Opportunities
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles.map((cycle) => (
            <button
              key={cycle.id}
              onClick={() => setSelectedCycleId(cycle.id)}
              className={cn(
                'relative text-left p-5 rounded-2xl border-2 transition-all duration-300 group',
                selectedCycleId === cycle.id
                  ? 'bg-cyan-900/10 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.15)] scale-[1.02]'
                  : 'bg-gray-900/20 border-gray-800 hover:border-gray-700 hover:bg-gray-900/40'
              )}
            >
              {cycle.status === 'waiting' && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-amber-600 text-white border-none text-[9px] animate-pulse">WAITING</Badge>
                </div>
              )}
              {cycle.status === 'won' && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-green-600 text-white border-none text-[9px]">GOAL REACHED 🏆</Badge>
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <h4 className="font-black text-white text-sm uppercase tracking-tight">{cycle.name}</h4>
                {selectedCycleId === cycle.id ? (
                  <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-pulse" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-gray-700 group-hover:text-gray-500" />
                )}
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Badge className="bg-gray-800 text-gray-400 border-none text-[9px] font-bold">
                  {cycle.is_free ? 'FREE' : `${cycle.credit_cost ?? 0} CREDITS`}
                </Badge>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter line-clamp-1">
                  {getGoalLabel(cycle)}
                </span>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800/50">
                <span className="text-[9px] text-gray-600 font-black uppercase">Status: {cycle.status}</span>
                <div className="flex items-center text-cyan-500 text-[10px] font-bold">
                  DETAILS <Sparkles className="w-3 h-3 ml-1" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {activeCycle && (
        <div className="space-y-6 pt-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-900/20 p-6 rounded-3xl border border-gray-800">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className={cn('w-2 h-2 rounded-full animate-ping', activeCycle.status === 'won' ? 'bg-green-500' : 'bg-cyan-500')} />
                <span className={cn('text-[10px] font-black uppercase tracking-widest', activeCycle.status === 'won' ? 'text-green-500' : 'text-cyan-500')}>
                  {activeCycle.status === 'won' ? 'Target Secured' : 'Active Connection'}
                </span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter">{activeCycle.name}</h2>
              <p className="text-gray-500 text-xs font-medium mt-1 uppercase tracking-tight">
                {activeCycle.status === 'won' ? 'Analysis finalized - Goal Achieved' : `Cycle contains ${cycleGroups.length} jackpot groups`}
              </p>
            </div>

            <div className="min-w-[280px]">
              <StatusCard deadline={activeCycle.max_end_at || undefined} status={activeCycle.status as any} />
            </div>
          </div>

          {user ? (
            <div className="bg-gray-900/20 p-4 rounded-2xl border border-gray-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {!userJoinedActive ? <Lock className="w-4 h-4 text-amber-400" /> : <Zap className="w-4 h-4 text-cyan-400" />}
                <div>
                  <div className="text-sm font-black text-white">{userJoinedActive ? 'Access granted' : 'Predictions locked'}</div>
                  <div className="text-[11px] text-gray-500">
                    {userJoinedActive ? 'You can view the full predictions for this cycle.' : `Join to unlock. Credits: ${credits}`}
                  </div>
                </div>
              </div>

              {!userJoinedActive && (
                <Button onClick={handleJoin} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl px-6">
                  JOIN ({activeCycle.is_free ? 'FREE' : `${activeCycle.credit_cost ?? 0} CREDITS`})
                </Button>
              )}
            </div>
          ) : null}

          <div className="space-y-4">
            {groupsWithVariants.map(({ group, variants }) => {
              const site = (group as any).sites?.name || 'Site';
              const type = (group as any).jackpot_types?.name || 'Jackpot';
              return (
                <div key={group.id} className="bg-gray-900/20 border border-gray-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-500 font-black uppercase tracking-widest flex items-center">
                        <Calendar className="w-3 h-3 mr-2" /> Locks: {group.lock_time ? new Date(group.lock_time).toLocaleString() : '—'}
                      </div>
                      <div className="text-xl font-black text-white tracking-tight">
                        {site} — {type}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Status: {group.status}
                        {group.prize_pool != null ? ` • Pool: ${Number(group.prize_pool).toLocaleString()} ${group.currency || 'KES'}` : ''}
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] font-mono">
                      {variants.map((v) => v.variant).join('+') || '—'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {variants.map((v) => {
                      const preds = v.predictions || [];
                      const locked = !userJoinedActive;

                      return (
                        <div key={v.id} className="bg-black/40 border border-gray-800 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-black text-white">
                              Variant {v.variant}{' '}
                              <span className="text-[10px] text-gray-500 font-bold ml-2">{v.strategy_tag || ''}</span>
                            </div>
                            <Badge variant="secondary" className="bg-gray-800 border-none text-[9px]">
                              {preds.length ? `${preds.length} picks` : 'preview'}
                            </Badge>
                          </div>

                          <div className={cn('space-y-2', locked && 'blur-[4px] select-none pointer-events-none')}>
                            {(preds.length ? preds : new Array(6).fill(null)).map((p: any, idx: number) => {
                              const fx = p?.fixture;
                              const title =
                                fx?.match_name ||
                                (fx?.home_team && fx?.away_team ? `${fx.home_team} vs ${fx.away_team}` : `Match ${idx + 1}`);
                              const pick = p?.pick || '—';
                              return (
                                <div key={p?.id || idx} className="flex items-center justify-between text-[12px]">
                                  <div className="text-gray-300 line-clamp-1">{title}</div>
                                  <div className="font-black text-cyan-400">{pick}</div>
                                </div>
                              );
                            })}
                          </div>

                          {locked && (
                            <div className="mt-3 text-[10px] text-gray-500 flex items-center gap-2">
                              <Lock className="w-3 h-3" /> Join cycle to reveal Variant {v.variant}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!user && (
        <div className="bg-gradient-to-r from-cyan-950/40 to-black border border-cyan-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <Zap className="text-cyan-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-black text-white tracking-tight">PROTOCOL LOCKED</p>
              <p className="text-sm text-gray-500 font-medium">Create an account to unlock predictions and track outcomes.</p>
            </div>
          </div>
          <Link
            href="/login"
            className="w-full md:w-auto text-center bg-cyan-500 hover:bg-cyan-400 text-black font-black px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            INITIALIZE ACCESS
          </Link>
        </div>
      )}
    </div>
  );
}
