'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Trophy, TrendingUp, Users, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function LiveWinFeed() {
  const [liveHits, setLiveHits] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLiveSuccess() {
      // Logic: Query cycles that are hitting high scores
      // We look for cycles where predictions are correct
      const { data, error } = await supabase
        .from('cycles')
        .select(`
          id, 
          name, 
          target_desc, 
          status,
          cycle_jackpots(
            jackpots(
              platform,
              variant
            )
          )
        `)
        .eq('status', 'success') // Show the wins
        .order('updated_at', { ascending: false })
        .limit(3);

      if (data) setLiveHits(data);
    }

    fetchLiveSuccess();
    
    // Real-time subscription so it updates when admin hits 'Commit'
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cycles' }, (payload) => {
        if (payload.new.status === 'success') {
          fetchLiveSuccess();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
      {/* Background Decorative Element */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/10 transition-all" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center">
            <Zap className="w-3 h-3 mr-2 fill-cyan-500" /> Live Protocol Hits
          </h3>
          <div className="flex items-center space-x-1">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
             <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Live Network</span>
          </div>
        </div>

        <div className="space-y-3">
          {liveHits.length > 0 ? liveHits.map((hit, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-gray-800/50 hover:border-cyan-500/30 transition-all animate-in slide-in-from-right-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Trophy className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white line-clamp-1">{hit.name}</p>
                  <p className="text-[9px] text-gray-500 uppercase font-mono">
                    {hit.target_desc} • {hit.cycle_jackpots?.[0]?.jackpots?.platform}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-green-400 flex items-center justify-end">
                  CLEARED <ArrowUpRight className="w-3 h-3 ml-1" />
                </div>
                <div className="text-[9px] text-gray-600 font-mono italic">Just Now</div>
              </div>
            </div>
          )) : (
            <div className="py-8 text-center space-y-2 opacity-30">
               <TrendingUp className="w-6 h-6 text-gray-700 mx-auto" />
               <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Scanning Active Cycles...</p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-800/50 flex justify-between items-center text-[10px]">
           <span className="text-gray-500">Hunter Success Rate (Wk {new Date().getMonth() + 1})</span>
           <span className="text-white font-black">89.4%</span>
        </div>
      </div>
    </div>
  );
}