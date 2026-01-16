'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, Activity, Target, Crown } from 'lucide-react';
import { cn } from '@/lib/utils'; // <--- THIS WAS MISSING

export default function LiveIntel() {
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [topAgents, setTopAgents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      // 1. Get Active AND Successful Cycles
      const { data: cycles } = await supabase
        .from('cycles')
        .select('*')
        .in('status', ['active', 'success'])
        .order('id', { ascending: false })
        .limit(4);
      
      if (cycles && cycles.length > 0) {
        setFeedItems(cycles);
      } else {
        setFeedItems([]); 
      }

      // 2. Get "Top Agents" - RANKED BY TOTAL WINS
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, total_wins')
        .neq('username', null)
        .order('total_wins', { ascending: false })
        .limit(5);

      if (profiles) setTopAgents(profiles);
    }
    fetchData();
  }, []);

  return (
    <div className="h-full flex flex-col justify-center space-y-6 max-w-md mx-auto">
      
      {/* HEADER */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <h3 className="text-sm font-bold text-green-400 tracking-widest uppercase">Live Network Feed</h3>
      </div>

      {/* CARD 1: CYCLE FEED */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3 mb-4 text-cyan-400">
          <Target className="w-5 h-5" />
          <h4 className="font-bold">Protocol Activity</h4>
        </div>
        
        {feedItems.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-xs italic">
            Waiting for cycle injection...
          </div>
        ) : (
          <div className="space-y-4">
            {feedItems.map((cycle, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-white font-bold text-sm">{cycle.name}</p>
                    {cycle.status === 'active' && (
                       <span className="bg-yellow-900/30 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded border border-yellow-900 animate-pulse">
                         LIVE
                       </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{cycle.target_desc}</p>
                </div>
                
                <div className="text-right">
                  {cycle.status === 'success' ? (
                    <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded border border-green-900 font-bold">
                      WON
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-mono">
                      Tracking...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD 2: TOP AGENTS (RANKED BY WINS) */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3 mb-4 text-purple-400">
          <Crown className="w-5 h-5 text-yellow-400" />
          <h4 className="font-bold">Elite Operatives</h4>
        </div>
        <div className="space-y-3">
          {topAgents.map((agent, i) => {
            const codename = agent.username || 'Unknown';
            const wins = agent.total_wins || 0;
            
            return (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  {/* Rank Badge */}
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border",
                    i === 0 ? "bg-yellow-500 text-black border-yellow-400" :
                    i === 1 ? "bg-gray-400 text-black border-gray-300" :
                    i === 2 ? "bg-orange-700 text-white border-orange-500" :
                    "bg-gray-800 text-gray-500 border-gray-700"
                  )}>
                    {i + 1}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-300 font-mono group-hover:text-white transition-colors">Agent {codename}</p>
                    <p className="text-[10px] text-gray-500">Rank {i + 1}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm font-bold text-white">
                    <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
                    {wins} Wins
                  </div>
                </div>
              </div>
            );
          })}
          {topAgents.length === 0 && <p className="text-xs text-gray-500">Scanning for operatives...</p>}
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 text-center">
          <p className="text-2xl font-black text-white">98.4%</p>
          <p className="text-[10px] text-gray-400 uppercase">System Accuracy</p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 text-center">
          <p className="text-2xl font-black text-white">12.5x</p>
          <p className="text-[10px] text-gray-400 uppercase">Avg. Multiplier</p>
        </div>
      </div>

    </div>
  );
}