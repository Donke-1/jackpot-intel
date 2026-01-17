'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Database, Server, Clock, Layers, LifeBuoy, CheckCircle2 } from 'lucide-react';

type Stats = {
  users: number;
  groups: number;
  variants: number;
  fixtures: number;
  settledGroups: number;
  activeCycles: number;
  openTickets: number;
  latency: string;
};

export default function SystemHealth() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    groups: 0,
    variants: 0,
    fixtures: 0,
    settledGroups: 0,
    activeCycles: 0,
    openTickets: 0,
    latency: '…',
  });

  const [lastCheck, setLastCheck] = useState<string>('—');

  useEffect(() => {
    async function checkHealth() {
      const start = performance.now();

      // Use head:true counts where possible
      const [
        usersRes,
        groupsRes,
        variantsRes,
        fixturesRes,
        settledRes,
        activeCyclesRes,
        openTicketsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jackpot_groups').select('*', { count: 'exact', head: true }),
        supabase.from('jackpot_variants').select('*', { count: 'exact', head: true }),
        supabase.from('fixtures').select('*', { count: 'exact', head: true }),
        supabase.from('jackpot_groups').select('*', { count: 'exact', head: true }).eq('status', 'settled'),
        supabase.from('cycles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      const end = performance.now();

      setStats({
        users: usersRes.count || 0,
        groups: groupsRes.count || 0,
        variants: variantsRes.count || 0,
        fixtures: fixturesRes.count || 0,
        settledGroups: settledRes.count || 0,
        activeCycles: activeCyclesRes.count || 0,
        openTickets: openTicketsRes.count || 0,
        latency: `${Math.max(0, Math.round(end - start))}ms`,
      });

      setLastCheck(new Date().toLocaleString());
    }

    checkHealth();
  }, []);

  return (
    <div className="space-y-8 text-white p-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold flex items-center">
          <Activity className="mr-3 text-cyan-500" /> System Diagnostics
        </h1>
        <div className="text-[11px] text-gray-500 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Last check: <span className="text-gray-300 font-bold">{lastCheck}</span>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={stats.users} icon={Database} color="text-purple-400" />
        <MetricCard label="Jackpot Groups" value={stats.groups} icon={Layers} color="text-blue-400" />
        <MetricCard label="Variants (A/B)" value={stats.variants} icon={Server} color="text-cyan-400" />
        <MetricCard label="Fixtures" value={stats.fixtures} icon={Layers} color="text-gray-300" />

        <MetricCard label="Settled Groups" value={stats.settledGroups} icon={CheckCircle2} color="text-green-400" />
        <MetricCard label="Active Cycles" value={stats.activeCycles} icon={Activity} color="text-green-400" />
        <MetricCard label="Open Tickets" value={stats.openTickets} icon={LifeBuoy} color="text-amber-400" />
        <MetricCard label="DB Latency" value={stats.latency} icon={Clock} color="text-yellow-400" />
      </div>

      {/* REAL STATUS NOTES */}
      <div className="bg-black border border-gray-800 rounded-xl p-6 text-xs space-y-2">
        <h3 className="text-gray-500 uppercase tracking-widest font-bold mb-4">Operational Notes</h3>
        <div className="text-gray-400">
          • Settled Groups are created when an admin locks results in <span className="text-white font-bold">/admin/settling</span>.
        </div>
        <div className="text-gray-400">
          • Prediction visibility is enforced by RLS: users see picks only after joining a cycle or purchasing a jackpot.
        </div>
        <div className="text-gray-400">
          • Credits are currently updated directly in profiles for MVP; ledger-backed atomic adjustments will be hardened next.
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase font-bold">{label}</p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <Icon className={`w-8 h-8 ${color} opacity-80`} />
    </div>
  );
}
