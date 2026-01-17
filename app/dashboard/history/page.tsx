'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowDownLeft, ArrowUpRight, Clock, Layers, ShoppingBag } from 'lucide-react';

type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string | null;
};

type SubRow = {
  id: string;
  cycle_id: string;
  credits_paid: number | null;
  joined_at: string | null;
  cycles?: { name: string; status: string; goal_settings: any } | null;
};

type PurchaseRow = {
  id: string;
  group_id: string;
  variants: Array<'A' | 'B'>;
  credits_paid: number | null;
  created_at: string | null;
  jackpot_groups?: {
    status: string;
    sites?: { name: string } | null;
    jackpot_types?: { name: string } | null;
  } | null;
};

type UnifiedRow =
  | {
      kind: 'ledger';
      id: string;
      when: string | null;
      title: string;
      subtitle: string;
      delta: number;
      direction: 'in' | 'out';
    }
  | {
      kind: 'cycle_join';
      id: string;
      when: string | null;
      title: string;
      subtitle: string;
      delta: number;
      direction: 'in' | 'out' | 'neutral';
    }
  | {
      kind: 'purchase';
      id: string;
      when: string | null;
      title: string;
      subtitle: string;
      delta: number;
      direction: 'in' | 'out' | 'neutral';
    };

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);

  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setLoading(false);
        return;
      }

      // 1) Credit ledger (true ledger; may be empty until we wire all actions)
      const { data: ledgerRows } = await supabase
        .from('credit_ledger')
        .select('id,delta,reason,ref_type,ref_id,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setLedger((ledgerRows as any) || []);

      // 2) Cycle subscriptions (fallback activity)
      const { data: subRows } = await supabase
        .from('cycle_subscriptions')
        .select(
          `
          id,cycle_id,credits_paid,joined_at,
          cycles:cycle_id(name,status,goal_settings)
        `
        )
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(25);

      setSubs((subRows as any) || []);

      // 3) Jackpot purchases (fallback activity)
      const { data: purRows } = await supabase
        .from('jackpot_purchases')
        .select(
          `
          id,group_id,variants,credits_paid,created_at,
          jackpot_groups:group_id(
            status,
            sites:site_id(name),
            jackpot_types:jackpot_type_id(name)
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      setPurchases((purRows as any) || []);

      setLoading(false);
    }

    fetchHistory();
  }, []);

  const rows = useMemo<UnifiedRow[]>(() => {
    const out: UnifiedRow[] = [];

    ledger.forEach((l) => {
      const direction = l.delta >= 0 ? 'in' : 'out';
      out.push({
        kind: 'ledger',
        id: l.id,
        when: l.created_at,
        title: l.reason,
        subtitle: l.ref_type ? `Ref: ${l.ref_type}` : 'Ledger entry',
        delta: l.delta,
        direction,
      });
    });

    subs.forEach((s) => {
      const c = (s as any).cycles;
      const paid = Number(s.credits_paid || 0);
      out.push({
        kind: 'cycle_join',
        id: s.id,
        when: s.joined_at,
        title: c?.name || 'Cycle Join',
        subtitle: c?.goal_settings?.goalType ? `Goal: ${c.goal_settings.goalType}` : `Status: ${c?.status || '—'}`,
        delta: paid > 0 ? -paid : 0,
        direction: paid > 0 ? 'out' : 'neutral',
      });
    });

    purchases.forEach((p) => {
      const g = (p as any).jackpot_groups;
      const site = g?.sites?.name || 'Site';
      const type = g?.jackpot_types?.name || 'Jackpot';
      const paid = Number(p.credits_paid || 0);
      out.push({
        kind: 'purchase',
        id: p.id,
        when: p.created_at,
        title: `${site} — ${type}`,
        subtitle: `Variants ${(p.variants || []).join('+') || '—'} • Status ${g?.status || '—'}`,
        delta: paid > 0 ? -paid : 0,
        direction: paid > 0 ? 'out' : 'neutral',
      });
    });

    out.sort((a, b) => {
      const ta = a.when ? new Date(a.when).getTime() : 0;
      const tb = b.when ? new Date(b.when).getTime() : 0;
      return tb - ta;
    });

    // optional: if ledger exists, it already includes many of these events later; we still show both for now.
    return out.slice(0, 60);
  }, [ledger, subs, purchases]);

  return (
    <div className="space-y-6 text-white px-4 pb-20 max-w-4xl mx-auto animate-in fade-in">
      <h1 className="text-3xl font-bold">Activity Ledger</h1>

      <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading ledger…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No activity recorded yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-gray-800">
              {rows.map((tx) => {
                const isCredit = tx.direction === 'in';
                const isDebit = tx.direction === 'out';

                const Icon =
                  tx.kind === 'cycle_join' ? Layers : tx.kind === 'purchase' ? ShoppingBag : isCredit ? ArrowDownLeft : ArrowUpRight;

                return (
                  <tr key={`${tx.kind}:${tx.id}`} className="hover:bg-gray-900/30">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                            isCredit
                              ? 'bg-green-900/20 text-green-500'
                              : isDebit
                              ? 'bg-red-900/20 text-red-500'
                              : 'bg-gray-900/40 text-gray-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="font-bold text-sm text-gray-200">{tx.title}</div>
                          <div className="text-xs text-gray-500">{tx.subtitle}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <div
                        className={`font-mono font-bold ${
                          isCredit ? 'text-green-400' : isDebit ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        {tx.delta === 0 ? '—' : tx.delta > 0 ? `+${tx.delta} credits` : `${tx.delta} credits`}
                      </div>
                      <div className="text-[10px] text-gray-600">{fmtDate(tx.when)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
