'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, CheckCircle2, XCircle, Calendar, ChevronDown, ChevronUp, Trophy, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type SettledGroup = {
  id: string;
  end_time: string | null;
  lock_time: string | null;
  prize_pool: number | null;
  currency: string | null;
  sites?: { name: string } | null;
  jackpot_types?: { name: string } | null;
  fixtures?: Array<{
    id: string;
    seq: number;
    match_name: string | null;
    home_team: string | null;
    away_team: string | null;
    kickoff_time: string;
    status: string;
    result: string | null;
  }>;
  variant_settlements?: Array<{
    correct_count: number | null;
    tier_hit: string | null;
    payout_estimated: number | null;
    payout_actual: number | null;
    jackpot_variants?: { variant: 'A' | 'B' } | null;
  }>;
};

type CycleRow = {
  id: string;
  name: string;
  status: string;
  created_at: string | null;
  max_end_at: string | null;
  goal_settings: any;
  is_free: boolean | null;
  credit_cost: number | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function fmtMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  return `${currency || 'KES'} ${Number(amount).toLocaleString()}`;
}

function fixtureLabel(f: any) {
  if (f.match_name) return f.match_name;
  if (f.home_team && f.away_team) return `${f.home_team} vs ${f.away_team}`;
  return `Match ${f.seq}`;
}

export default function ResultsPage() {
  const [settled, setSettled] = useState<SettledGroup[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: settledRows } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,end_time,lock_time,prize_pool,currency,
          sites:site_id(name),
          jackpot_types:jackpot_type_id(name),
          fixtures(id,seq,match_name,home_team,away_team,kickoff_time,status,result),
          variant_settlements(
            correct_count,tier_hit,payout_estimated,payout_actual,
            jackpot_variants:variant_id(variant)
          )
        `
        )
        .eq('status', 'settled')
        .order('end_time', { ascending: false })
        .limit(25);

      setSettled((settledRows as any) || []);

      const { data: cycleRows } = await supabase
        .from('cycles')
        .select('id,name,status,created_at,max_end_at,goal_settings,is_free,credit_cost')
        .in('status', ['won', 'expired', 'archived'])
        .order('max_end_at', { ascending: false })
        .limit(25);

      setCycles((cycleRows as any) || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const toggleExpand = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 pb-20">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mission Archives</h1>
            <p className="text-gray-500">Settled jackpots and completed cycles (real outcomes).</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">Retrieving archived data...</div>
        ) : (
          <>
            {/* Settled jackpots */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Settled Jackpots (A/B)
                </h2>
                <Badge variant="outline" className="text-[10px] border-gray-800 text-gray-400">
                  {settled.length}
                </Badge>
              </div>

              {settled.length === 0 ? (
                <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center text-gray-500">
                  No settled jackpots yet. Lock results in the admin settling queue.
                </div>
              ) : (
                <div className="space-y-4">
                  {settled.map((g) => {
                    const site = g.sites?.name || 'Site';
                    const type = g.jackpot_types?.name || 'Jackpot';

                    const settlements = (g.variant_settlements || []).slice().sort((a, b) => {
                      const av = a.jackpot_variants?.variant === 'A' ? 0 : 1;
                      const bv = b.jackpot_variants?.variant === 'A' ? 0 : 1;
                      return av - bv;
                    });

                    return (
                      <div key={g.id} className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden">
                        <div
                          onClick={() => toggleExpand(`group:${g.id}`)}
                          className="p-6 cursor-pointer hover:bg-gray-900/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-xl font-bold text-white">
                                {site} — {type}
                              </h3>
                              <Badge variant="outline" className="border-green-900 text-green-400 bg-green-900/10">
                                SETTLED
                              </Badge>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 space-x-3">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" /> Ended {fmtDate(g.end_time)}
                              </span>
                              <span>•</span>
                              <span className="text-gray-300">
                                Pool {fmtMoney(g.prize_pool ?? null, g.currency)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-gray-500 font-bold">Best Estimate</p>
                              <p className="text-lg font-bold text-green-400">
                                {(() => {
                                  const best = settlements
                                    .map((s) => s.payout_actual ?? s.payout_estimated ?? 0)
                                    .reduce((a, b) => (Number(b) > Number(a) ? b : a), 0);
                                  return best ? fmtMoney(Number(best), g.currency) : '—';
                                })()}
                              </p>
                            </div>
                            {expanded === `group:${g.id}` ? (
                              <ChevronUp className="text-gray-500" />
                            ) : (
                              <ChevronDown className="text-gray-500" />
                            )}
                          </div>
                        </div>

                        {expanded === `group:${g.id}` && (
                          <div className="border-t border-gray-800 bg-black/50 p-6 space-y-6 animate-in slide-in-from-top-2">
                            {/* A/B outcomes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {settlements.map((s, idx) => (
                                <div key={idx} className="bg-gray-900/30 border border-gray-800 rounded-2xl p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-black text-white">
                                      Variant {s.jackpot_variants?.variant || '—'}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] border-cyan-900 text-cyan-300">
                                      {s.correct_count ?? '—'} correct
                                    </Badge>
                                  </div>
                                  <div className="text-[12px] text-gray-400">
                                    Tier: <span className="text-white font-bold">{s.tier_hit || '—'}</span>
                                  </div>
                                  <div className="text-[12px] text-gray-400 mt-1">
                                    Est. payout:{' '}
                                    <span className="text-green-400 font-black">
                                      {fmtMoney(s.payout_actual ?? s.payout_estimated ?? null, g.currency)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Fixture results */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                Fixture Results
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(g.fixtures || [])
                                  .slice()
                                  .sort((a, b) => a.seq - b.seq)
                                  .map((f) => (
                                    <div
                                      key={f.id}
                                      className="flex justify-between items-center bg-gray-900 border border-gray-800 px-3 py-2 rounded text-xs"
                                    >
                                      <span className="text-gray-400 truncate max-w-[170px]">
                                        {fixtureLabel(f)}
                                      </span>
                                      <span
                                        className={cn(
                                          'font-black px-1.5 py-0.5 rounded border',
                                          f.status === 'finished'
                                            ? 'text-cyan-300 bg-cyan-900/20 border-cyan-900/30'
                                            : 'text-gray-500 bg-gray-900/30 border-gray-800'
                                        )}
                                      >
                                        {f.status === 'finished' ? f.result || '—' : f.status.toUpperCase()}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Completed cycles */}
            <section className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" /> Completed Cycles
                </h2>
                <Badge variant="outline" className="text-[10px] border-gray-800 text-gray-400">
                  {cycles.length}
                </Badge>
              </div>

              {cycles.length === 0 ? (
                <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center text-gray-500">
                  No completed cycles yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {cycles.map((c) => {
                    const isWon = c.status === 'won';
                    return (
                      <div key={c.id} className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="text-xl font-bold text-white">{c.name}</div>
                            {isWon ? (
                              <Badge variant="success" className="bg-green-900/30 text-green-400 border-green-900">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> WON
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-900/30 text-red-400 border-red-900">
                                <XCircle className="w-3 h-3 mr-1" /> {c.status.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Goal: <span className="text-gray-300">{c.goal_settings?.goalType || '—'}</span>
                            {' • '}
                            End: <span className="text-gray-300">{fmtDate(c.max_end_at)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase text-gray-500 font-bold">Cost</div>
                          <div className="text-white font-black">
                            {c.is_free ? 'FREE' : `${c.credit_cost ?? 0} credits`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
