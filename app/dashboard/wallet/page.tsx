'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Wallet,
  History,
  Loader2,
  Ticket,
  ShieldCheck,
  Zap,
  TrendingDown,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

type ProfileRow = {
  id: string;
  credits: number | null;
  email: string | null;
  username: string | null;
};

type CycleSubRow = {
  id: string;
  cycle_id: string;
  credits_paid: number | null;
  joined_at: string | null;
  cycles?: {
    id: string;
    name: string;
    status: string;
    goal_settings: any;
    is_free: boolean | null;
    credit_cost: number | null;
  } | null;
};

type PurchaseRow = {
  id: string;
  group_id: string;
  variants: Array<'A' | 'B'>;
  credits_paid: number | null;
  created_at: string | null;
  jackpot_groups?: {
    id: string;
    status: string;
    sites?: { name: string } | null;
    jackpot_types?: { name: string } | null;
  } | null;
};

type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  created_at: string | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [subs, setSubs] = useState<CycleSubRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  useEffect(() => {
    async function fetchWalletData() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // 1) Profile (credits)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id,credits,email,username')
        .eq('id', user.id)
        .single();
      setProfile((profileData as any) || null);

      // 2) Recent cycle joins
      const { data: subRows } = await supabase
        .from('cycle_subscriptions')
        .select(
          `
          id,cycle_id,credits_paid,joined_at,
          cycles:cycle_id(id,name,status,goal_settings,is_free,credit_cost)
        `
        )
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(5);

      setSubs((subRows as any) || []);

      // 3) Recent jackpot purchases
      const { data: purRows } = await supabase
        .from('jackpot_purchases')
        .select(
          `
          id,group_id,variants,credits_paid,created_at,
          jackpot_groups:group_id(
            id,status,
            sites:site_id(name),
            jackpot_types:jackpot_type_id(name)
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setPurchases((purRows as any) || []);

      // 4) Credit ledger (read-only to user)
      const { data: ledgerRows } = await supabase
        .from('credit_ledger')
        .select('id,delta,reason,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setLedger((ledgerRows as any) || []);

      setLoading(false);
    }

    fetchWalletData();
  }, []);

  const mergedActivity = useMemo(() => {
    const items: Array<
      | { kind: 'cycle'; when: string | null; title: string; subtitle: string; delta: number }
      | { kind: 'purchase'; when: string | null; title: string; subtitle: string; delta: number }
    > = [];

    subs.forEach((s) => {
      const c = (s as any).cycles;
      const goal = typeof c?.goal_settings?.goalType === 'string' ? c.goal_settings.goalType : (c?.status || 'cycle');
      const paid = Number(s.credits_paid || 0);
      items.push({
        kind: 'cycle',
        when: s.joined_at,
        title: c?.name || 'Cycle Join',
        subtitle: `Joined • ${goal}`,
        delta: paid > 0 ? -paid : 0,
      });
    });

    purchases.forEach((p) => {
      const g = (p as any).jackpot_groups;
      const site = g?.sites?.name || 'Site';
      const type = g?.jackpot_types?.name || 'Jackpot';
      const paid = Number(p.credits_paid || 0);
      items.push({
        kind: 'purchase',
        when: p.created_at,
        title: `${site} — ${type}`,
        subtitle: `Purchased • Variants ${(p.variants || []).join('+') || '—'}`,
        delta: paid > 0 ? -paid : 0,
      });
    });

    items.sort((a, b) => {
      const ta = a.when ? new Date(a.when).getTime() : 0;
      const tb = b.when ? new Date(b.when).getTime() : 0;
      return tb - ta;
    });

    return items.slice(0, 8);
  }, [subs, purchases]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 pb-20 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">The Hunter&apos;s Vault</h1>
          <p className="text-gray-500 text-sm font-medium">Credits, purchases, and your activity trail.</p>
        </div>
        <Badge variant="protocol" className="w-fit">
          <ShieldCheck className="w-3 h-3 mr-1" /> SECURE SESSION
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BALANCE */}
        <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2rem] border border-gray-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-700" />

          <div className="flex items-center space-x-3 mb-4 text-cyan-500">
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Credits</span>
          </div>

          <div className="flex items-baseline space-x-2 mb-8">
            <span className="text-5xl font-black text-white italic tracking-tighter">
              {(profile?.credits ?? 0).toLocaleString()}
            </span>
            <span className="text-gray-500 font-bold uppercase text-xs">Available</span>
          </div>

          <div className="flex space-x-4 relative z-10">
            <Link href="/payments" className="flex-1">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black h-12 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Zap className="w-4 h-4 mr-2 fill-black" /> REFUEL
              </Button>
            </Link>

            <Button
              onClick={() => alert('Transfer is coming soon.')}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-gray-800 hover:bg-white/5 text-gray-300 font-bold"
            >
              TRANSFER
            </Button>
          </div>
        </div>

        {/* RULES */}
        <div className="bg-gray-900/20 p-8 rounded-[2rem] border border-gray-800 flex flex-col justify-center space-y-4">
          <div className="flex items-center space-x-2 text-yellow-500">
            <Ticket className="w-5 h-5" />
            <h3 className="font-black text-xs uppercase tracking-widest">Vault Notes</h3>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed font-medium">
            Credits are used to unlock cycle access and single jackpot predictions.
            <br />
            You&apos;ll always see whether you had Variant A, B, or A+B when results are locked.
          </p>
          <p className="text-[10px] text-gray-600 italic">
            “Manual top-ups are supported while payments are being integrated.”
          </p>
        </div>
      </div>

      {/* ACTIVITY */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center px-2">
          <History className="w-4 h-4 mr-2" /> Recent Activity
        </h3>

        <div className="space-y-2">
          {mergedActivity.length > 0 ? (
            mergedActivity.map((log, i) => (
              <div
                key={i}
                className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex items-center justify-between hover:border-gray-800 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center border border-gray-800">
                    {log.kind === 'cycle' ? (
                      <Layers className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ShoppingBag className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">{log.title}</p>
                    <p className="text-[10px] text-gray-500 font-mono italic">
                      {fmtDate(log.when)} • {log.subtitle}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={cn('text-sm font-black', log.delta < 0 ? 'text-white' : 'text-gray-400')}>
                    {log.delta < 0 ? `${log.delta}` : '—'}
                  </p>
                  <p className="text-[9px] text-gray-600 font-bold uppercase">
                    {log.kind === 'cycle' ? 'Cycle Access' : 'Purchase'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-dashed border-gray-800 rounded-3xl p-16 text-center space-y-3">
              <TrendingDown className="w-8 h-8 text-gray-800 mx-auto" />
              <p className="text-xs text-gray-600 font-bold uppercase italic tracking-widest">
                “No activity yet. Pick a cycle and join.”
              </p>
            </div>
          )}
        </div>
      </div>

      {/* LEDGER PREVIEW */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center px-2">
          <History className="w-4 h-4 mr-2" /> Credit Ledger (Preview)
        </h3>

        <div className="bg-gray-900/20 border border-gray-800 rounded-2xl p-4">
          {ledger.length > 0 ? (
            <div className="space-y-2">
              {ledger.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-[12px]">
                  <div className="text-gray-400">
                    <span className="text-white font-bold">{l.reason}</span> • {fmtDate(l.created_at)}
                  </div>
                  <div className={cn('font-black', l.delta >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {l.delta >= 0 ? `+${l.delta}` : `${l.delta}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-600 italic">No ledger entries yet.</div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="pt-4 flex flex-wrap gap-2">
        <Link href="/support?category=Credits%20%26%20Billing">
          <Badge
            variant="outline"
            className="bg-gray-900/50 border-gray-800 py-2 px-4 cursor-pointer hover:border-cyan-500/50 transition-colors"
          >
            Support Ticket
          </Badge>
        </Link>

        <Badge
          onClick={() => alert('CSV export coming soon.')}
          variant="outline"
          className="bg-gray-900/50 border-gray-800 py-2 px-4 cursor-pointer hover:border-cyan-500/50 transition-colors"
        >
          Transaction CSV
        </Badge>
      </div>
    </div>
  );
}
