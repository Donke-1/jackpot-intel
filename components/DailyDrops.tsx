'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DailyTip } from '@/types';
import { Flame, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DailyDrops() {
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTips() {
      // Calculate 24 hours ago
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data } = await supabase
        .from('daily_tips')
        .select('*')
        .gt('created_at', yesterday.toISOString()) // Only fresh tips
        .order('created_at', { ascending: false });

      if (data) setTips(data);
      setLoading(false);
    }
    fetchTips();
  }, []);

  if (loading) return null; // Don't show anything while loading to avoid layout shift
  if (tips.length === 0) return null; // Hide widget if no active tips

  return (
    <div className="space-y-3 mb-8 animate-in slide-in-from-top-4 duration-700">
      <div className="flex items-center space-x-2 px-1">
        <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
        <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest">
          Daily Intel <span className="text-gray-600 text-[10px] ml-2 normal-case border border-gray-800 px-2 py-0.5 rounded-full">Expires in 24h</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tips.map((tip) => (
          <div key={tip.id} className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-4 rounded-xl relative overflow-hidden group hover:border-orange-500/30 transition-all">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all"></div>

            <div className="flex justify-between items-start mb-3">
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                tip.confidence === 'High' ? "bg-green-900/20 text-green-400 border-green-900" :
                tip.confidence === 'Medium' ? "bg-yellow-900/20 text-yellow-400 border-yellow-900" :
                "bg-red-900/20 text-red-400 border-red-900"
              )}>
                {tip.confidence} Conf.
              </span>
              <span className="text-xs font-mono text-gray-500 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(tip.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>

            <h4 className="font-bold text-white text-sm truncate">{tip.match_name}</h4>
            
            <div className="flex items-end justify-between mt-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Prediction</p>
                <p className="text-lg font-bold text-orange-400">{tip.tip}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Odds</p>
                <div className="flex items-center text-white font-mono font-bold bg-gray-800 px-2 py-1 rounded">
                  <TrendingUp className="w-3 h-3 mr-1 text-gray-400" />
                  {tip.odds}
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}