'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Lock, Trophy, Calendar, Layers, Ticket, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Cycle, CycleSubscription, JackpotPurchase } from '@/types';

type SubRow = CycleSubscription & { cycles?: Cycle | null };
type PurchaseRow = JackpotPurchase & {
  jackpot_groups?: {
    id: string;
    status: string;
    lock_time: string | null;
    end_time: string | null;
    currency: string | null;
    prize_pool: number | null;
    sites?: { name: string } | null;
    jackpot_types?: { name: string } | null;
  } | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function MyPredictions() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // 1) Cycle subscriptions
      const { data: subRows } = await supabase
        .from('cycle_subscriptions')
        .select(
          `
          id,user_id,cycle_id,status,credits_paid,joined_at,
          cycles:cycle_id(id,name,status,category,goal_settings,credit_cost,is_free,max_end_at,created_at)
        `
        )
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      setSubs((subRows as any) || []);

      // 2) Jackpot purchases (single jackpot access)
      const { data: purRows } = await supabase
        .from('jackpot_purchases')
        .select(
          `
          id,user_id,group_id,variants,credits_paid,created_at,
          jackpot_groups:group_id(
            id,status,lock_time,end_time,currency,prize_pool,
            sites:site_id(name),
            jackpot_types:jackpot_type_id(name)
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPurchases((purRows as any) || []);
      setLoading(false);
    }

    fetchAll();
  }, []);

  const totalItems = useMemo(() => subs.length + purchases.length, [subs.length, purchases.length]);

  if (loading) return <div className="p-12 text-center text-gray-500">Decrypting your intel…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in px-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">My Intel</h1>
          <p className="text-gray-400">Your joined cycles and single jackpot purchases.</p>
        </div>
        <Badge variant="neon">{totalItems} ITEMS</Badge>
      </div>

      {/* Empty state */}
      {subs.length === 0 && purchases.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
          <Lock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-500">No Intel Yet</h3>
          <p className="text-gray-600 mb-6">Join a cycle or purchase a jackpot to unlock predictions.</p>
          <Link href="/dashboard" className="text-cyan-500 hover:underline">
            View Live Cycles &rarr;
          </Link>
        </div>
      ) : (
        <>
          {/* Joined cycles */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" /> Joined Cycles
              </h2>
              <Badge variant="outline" className="text-[10px] border-gray-800 text-gray-400">
                {subs.length}
              </Badge>
            </div>

            {subs.length === 0 ? (
              <div className="text-xs text-gray-600 border border-gray-800 rounded-xl p-5 bg-gray-900/20">
                You haven’t joined any cycles yet.
              </div>
            ) : (
              <div className="grid gap-4">
                {subs.map((s) => {
                  const c = (s as any).cycles as Cycle | undefined;
                  if (!c) return null;

                  const isWon = c.status === 'won';
                  const isActive = c.status === 'active' || c.status === 'waiting';

                  return (
                    <Link key={s.id} href="/dashboard">
                      <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl flex items-center justify-between hover:bg-gray-900/60 transition-colors group cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`p-3 rounded-lg ${
                              isWon ? 'bg-green-500/10 text-green-500' : 'bg-cyan-900/20 text-cyan-500'
                            }`}
                          >
                            {isWon ? <Trophy className="w-6 h-6 text-yellow-500" /> : <Layers className="w-6 h-6" />}
                          </div>

                          <div>
                            <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                              {c.name}
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              Joined {fmtDate(s.joined_at)} • Paid {s.credits_paid ?? 0} credits
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          {isActive && (
                            <Badge variant="outline" className="border-amber-900 text-amber-300 text-[10px]">
                              {c.status.toUpperCase()}
                            </Badge>
                          )}
                          {isWon && <Badge variant="neon">WON</Badge>}
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Jackpot purchases */}
          <section className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Ticket className="w-4 h-4 text-cyan-500" /> Single Jackpot Purchases
              </h2>
              <Badge variant="outline" className="text-[10px] border-gray-800 text-gray-400">
                {purchases.length}
              </Badge>
            </div>

            {purchases.length === 0 ? (
              <div className="text-xs text-gray-600 border border-gray-800 rounded-xl p-5 bg-gray-900/20">
                You haven’t purchased any single jackpots yet.
              </div>
            ) : (
              <div className="grid gap-4">
                {purchases.map((p) => {
                  const g = (p as any).jackpot_groups as PurchaseRow['jackpot_groups'];
                  const site = g?.sites?.name || 'Site';
                  const type = g?.jackpot_types?.name || 'Jackpot';
                  const variants = (p.variants || []).join('+') || '—';

                  return (
                    <Link key={p.id} href="/dashboard">
                      <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl flex items-center justify-between hover:bg-gray-900/60 transition-colors group cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 rounded-lg bg-gray-800 text-gray-300">
                            <Ticket className="w-6 h-6" />
                          </div>

                          <div>
                            <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                              {site} — {type}
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              Purchased {fmtDate(p.created_at)} • Variants {variants} • Paid {p.credits_paid ?? 0} credits
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <Badge variant="outline" className="border-cyan-900 text-cyan-300 text-[10px]">
                            {g?.status?.toUpperCase() || '—'}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
