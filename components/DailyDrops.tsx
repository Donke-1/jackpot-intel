'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Flame, Clock, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type DropRow = {
  id: string;
  status: string;
  lock_time: string | null;
  created_at: string | null;
  prize_pool: number | null;
  currency: string | null;
  sites?: { name: string; code: string } | null;
  jackpot_types?: { name: string; code: string } | null;
  jackpot_variants?: Array<{ id: string; variant: 'A' | 'B' }>;
};

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function lockLabel(lockTime: string | null) {
  if (!lockTime) return 'Lock time —';
  const t = new Date(lockTime).getTime();
  if (Number.isNaN(t)) return 'Lock time —';
  const diff = t - Date.now();
  if (diff <= 0) return 'LOCKED';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Locks in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Locks in ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Locks in ${days}d`;
}

export default function DailyDrops() {
  const [drops, setDrops] = useState<DropRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDrops() {
      setLoading(true);

      // Recent ingests / active groups (non-archived)
      const { data, error } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,status,lock_time,created_at,prize_pool,currency,
          sites:site_id(name,code),
          jackpot_types:jackpot_type_id(name,code),
          jackpot_variants(id,variant)
        `
        )
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        setDrops([]);
        setLoading(false);
        return;
      }

      // Prefer not-locked first
      const sorted = ((data as any[]) || []).sort((a, b) => {
        const aLocked = lockLabel(a.lock_time) === 'LOCKED';
        const bLocked = lockLabel(b.lock_time) === 'LOCKED';
        if (aLocked !== bLocked) return aLocked ? 1 : -1;
        return 0;
      });

      setDrops(sorted as any);
      setLoading(false);
    }

    fetchDrops();
  }, []);

  const visibleDrops = useMemo(() => {
    // Show only drafts/active/locked/settling - hide settled in "drops"
    return drops.filter((d) => ['draft', 'active', 'locked', 'settling'].includes(d.status));
  }, [drops]);

  if (loading) return null;
  if (visibleDrops.length === 0) return null;

  return (
    <div className="space-y-3 mb-8 animate-in slide-in-from-top-4 duration-700">
      <div className="flex items-center space-x-2 px-1">
        <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
        <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest">
          Fresh Drops{' '}
          <span className="text-gray-600 text-[10px] ml-2 normal-case border border-gray-800 px-2 py-0.5 rounded-full">
            Newly ingested jackpots
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleDrops.slice(0, 6).map((d) => {
          const site = d.sites?.name || 'Site';
          const type = d.jackpot_types?.name || 'Jackpot';
          const hasA = Boolean(d.jackpot_variants?.some((v) => v.variant === 'A'));
          const hasB = Boolean(d.jackpot_variants?.some((v) => v.variant === 'B'));
          const lockTxt = lockLabel(d.lock_time);

          return (
            <div
              key={d.id}
              className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-4 rounded-xl relative overflow-hidden group hover:border-orange-500/30 transition-all"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all" />

              <div className="flex justify-between items-start mb-3">
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded border uppercase',
                    d.status === 'draft'
                      ? 'bg-gray-900/20 text-gray-300 border-gray-800'
                      : d.status === 'active'
                      ? 'bg-green-900/20 text-green-400 border-green-900'
                      : d.status === 'locked'
                      ? 'bg-red-900/20 text-red-400 border-red-900'
                      : 'bg-amber-900/20 text-amber-300 border-amber-900'
                  )}
                >
                  {d.status}
                </span>

                <span className="text-xs font-mono text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {lockTxt}
                </span>
              </div>

              <h4 className="font-bold text-white text-sm truncate">
                {site} — {type}
              </h4>

              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Variants</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-[11px] font-black', hasA ? 'text-orange-400' : 'text-gray-700')}>
                      A
                    </span>
                    <span className={cn('text-[11px] font-black', hasB ? 'text-orange-400' : 'text-gray-700')}>
                      B
                    </span>
                    {(hasA && hasB) && (
                      <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> paired
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Ingested</p>
                  <div className="flex items-center justify-end text-white font-mono font-bold bg-gray-800 px-2 py-1 rounded">
                    <Layers className="w-3 h-3 mr-1 text-gray-400" />
                    {formatWhen(d.created_at)}
                  </div>
                </div>
              </div>

              {d.prize_pool != null && (
                <div className="mt-3 text-[10px] text-gray-500">
                  Pool: <span className="text-white font-bold">{Number(d.prize_pool).toLocaleString()}</span>{' '}
                  {d.currency || 'KES'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
