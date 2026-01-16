'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Trophy, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function BoastFeed() {
  const [wins, setWins] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTopHits() {
      // Logic: Find cycles where current hit rate is high
      // For this demo, we'll fetch recently settled successful cycles
      const { data } = await supabase
        .from('cycles')
        .select('*')
        .eq('status', 'success')
        .order('updated_at', { ascending: false })
        .limit(3);
      
      if (data) setWins(data);
    }
    fetchTopHits();
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6 h-full relative overflow-hidden group">
      {/* Background Glow Effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[100px] group-hover:bg-cyan-500/20 transition-all duration-700" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-cyan-500 uppercase tracking-widest flex items-center">
            <Zap className="w-4 h-4 mr-2 fill-cyan-500" /> Live Intel Feed
          </h3>
          <span className="flex items-center text-[10px] text-gray-500 font-bold uppercase">
            <Users className="w-3 h-3 mr-1" /> 1.2k Online
          </span>
        </div>

        <div className="space-y-3">
          {wins.length > 0 ? wins.map((win, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-gray-800/50 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <Trophy className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white line-clamp-1">{win.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-mono">Cycle Cleared • {win.target_desc}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-green-400">SUCCESS</div>
                <div className="text-[9px] text-gray-600">32m ago</div>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 opacity-50">
               <TrendingUp className="w-8 h-8 text-gray-700" />
               <p className="text-[10px] text-gray-600 font-bold uppercase">Scanning for active winners...</p>
            </div>
          )}
        </div>

        {/* Promo Stat */}
        <div className="pt-2 border-t border-gray-800/50 flex justify-between items-center">
           <div className="text-[10px] text-gray-500">
             Avg. Prediction Accuracy
           </div>
           <div className="text-sm font-black text-white">84.2%</div>
        </div>
      </div>
    </div>
  );
}