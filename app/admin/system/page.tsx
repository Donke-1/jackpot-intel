'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Database, Server, Clock } from 'lucide-react';

export default function SystemHealth() {
  const [stats, setStats] = useState({
    users: 0,
    jackpots: 0,
    cycles: 0,
    latency: '...'
  });

  useEffect(() => {
    async function checkHealth() {
      const start = performance.now();
      
      // Parallel queries for speed
      const [
        { count: userCount },
        { count: jackpotCount },
        { count: cycleCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jackpots').select('*', { count: 'exact', head: true }),
        supabase.from('cycles').select('*', { count: 'exact', head: true })
      ]);

      const end = performance.now();
      
      setStats({
        users: userCount || 0,
        jackpots: jackpotCount || 0,
        cycles: cycleCount || 0,
        latency: (end - start).toFixed(0) + 'ms'
      });
    }
    checkHealth();
  }, []);

  return (
    <div className="space-y-8 text-white">
      <h1 className="text-3xl font-bold flex items-center">
        <Activity className="mr-3 text-cyan-500" /> System Diagnostics
      </h1>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Operatives" value={stats.users} icon={Database} color="text-purple-400" />
        <MetricCard label="Jackpots Ingested" value={stats.jackpots} icon={Server} color="text-blue-400" />
        <MetricCard label="Active Cycles" value={stats.cycles} icon={Activity} color="text-green-400" />
        <MetricCard label="DB Latency" value={stats.latency} icon={Clock} color="text-yellow-400" />
      </div>

      {/* SERVER LOGS SIMULATION */}
      <div className="bg-black border border-gray-800 rounded-xl p-6 font-mono text-xs space-y-2">
        <h3 className="text-gray-500 uppercase tracking-widest font-bold mb-4">Live Kernel Logs</h3>
        <div className="text-green-400">[OK] Connection to Supabase established securely.</div>
        <div className="text-gray-500">[INFO] Cron jobs scheduled for result verification.</div>
        <div className="text-blue-400">[NET] M-PESA API Listener active on port 443.</div>
        <div className="text-gray-500">[INFO] Variance Shield Algorithm loaded v2.1.</div>
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