'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Lock, Unlock, Trophy, Calendar, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function MyPredictions() {
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUnlocks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Unlocks + Joined Cycle Data
      const { data } = await supabase
        .from('unlocks')
        .select(`
          *,
          cycles (
            id,
            name,
            status,
            current_week,
            target_desc,
            end_date
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setUnlocks(data);
      setLoading(false);
    }
    fetchUnlocks();
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-500">Decrypting purchase history...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">My Intel</h1>
          <p className="text-gray-400">Active and archived unlock keys.</p>
        </div>
        <Badge variant="neon">{unlocks.length} UNLOCKS</Badge>
      </div>

      {unlocks.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
           <Lock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-gray-500">No Active Intel</h3>
           <p className="text-gray-600 mb-6">You haven't unlocked any prediction cycles yet.</p>
           <Link href="/dashboard" className="text-cyan-500 hover:underline">View Live Targets &rarr;</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {unlocks.map((item) => {
             const cycle = item.cycles;
             if (!cycle) return null; // Safety check

             return (
               <Link key={item.id} href={`/dashboard/cycle/${cycle.id}`}>
                 <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl flex items-center justify-between hover:bg-gray-900/60 transition-colors group cursor-pointer">
                   
                   <div className="flex items-center space-x-4">
                     <div className={`p-3 rounded-lg ${cycle.status === 'active' ? 'bg-cyan-900/20 text-cyan-500' : 'bg-gray-800 text-gray-500'}`}>
                        {cycle.status === 'success' ? <Trophy className="w-6 h-6 text-yellow-500" /> : <Unlock className="w-6 h-6" />}
                     </div>
                     <div>
                       <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">{cycle.name}</h3>
                       <p className="text-xs text-gray-500 flex items-center">
                         <Calendar className="w-3 h-3 mr-1" /> 
                         Unlocked on {new Date(item.created_at).toLocaleDateString()}
                       </p>
                     </div>
                   </div>

                   <div className="text-right">
                      {cycle.status === 'active' && (
                        <span className="flex items-center text-yellow-500 text-xs font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3 mr-1" /> LIVE
                        </span>
                      )}
                      {cycle.status === 'success' && <Badge variant="neon">WINNER</Badge>}
                      {cycle.status === 'failed' && <Badge variant="outline" className="border-red-900 text-red-500">LOSS</Badge>}
                   </div>

                 </div>
               </Link>
             );
          })}
        </div>
      )}
    </div>
  );
}