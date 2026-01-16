'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cycle, Event } from '@/types';
import StatusCard from '@/components/ui/StatusCard';
import SiteAccordion from '@/components/SiteAccordion';
import DailyDrops from '@/components/DailyDrops'; // <--- NEW IMPORT
import { Badge } from '@/components/ui/Badge';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [cycleEvents, setCycleEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    async function fetchData() {
      // 1. Get User & Profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single();
        if (profile) setCredits(profile.credits);
      }

      // 2. Get Active Cycle
      const { data: cycle } = await supabase
        .from('cycles')
        .select('*')
        .eq('status', 'active')
        .single();
      
      if (cycle) {
        setActiveCycle(cycle);

        // 3. Get Events AND Predictions
        const { data: events } = await supabase
          .from('events')
          .select('*, predictions(*)')
          .eq('cycle_id', cycle.id)
          .eq('is_active', true)
          .order('id', { ascending: true });

        if (events) {
           const sortedEvents = events.map((e: any) => ({
             ...e,
             predictions: e.predictions.sort((a: any, b: any) => a.match_id - b.match_id)
           }));
           setCycleEvents(sortedEvents);
        }
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-500">No Active Cycles Detected.</h2>
        <p className="text-gray-600">The Hunter Protocol is sleeping. Check back later.</p>
      </div>
    );
  }

  const earliestDeadline = cycleEvents.length > 0 
    ? cycleEvents.reduce((earliest, current) => {
        return new Date(current.deadline) < new Date(earliest) ? current.deadline : earliest;
      }, cycleEvents[0].deadline)
    : new Date().toISOString();

  return (
    <div className="space-y-8 px-4 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center">
            {activeCycle.name}
            {activeCycle.category === 'Hunter' && (
              <span className="ml-3 px-2 py-0.5 rounded text-xs bg-cyan-900/50 text-cyan-400 border border-cyan-700/50">
                HUNTER PROTOCOL
              </span>
            )}
          </h1>
          <div className="flex items-center space-x-3 mt-2 text-sm text-gray-400">
             <span>Week {activeCycle.current_week}</span>
             <span className="text-gray-700">•</span>
             <span className="text-white font-bold">{activeCycle.target_desc}</span>
          </div>
        </div>
        
        <div className="w-full md:w-auto min-w-[300px]">
          <StatusCard deadline={earliestDeadline} status={activeCycle.status} />
        </div>
      </div>

      {!user && (
         <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 p-4 rounded-xl flex items-center justify-between">
           <div className="flex items-center space-x-3">
             <AlertCircle className="text-cyan-500 w-5 h-5" />
             <div>
               <p className="text-sm text-white font-bold">You are viewing in Guest Mode.</p>
               <p className="text-xs text-gray-500">Data is restricted. Login to unlock the full protocol.</p>
             </div>
           </div>
           <Link href="/login" className="text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-3 py-2 rounded transition-colors">
             LOGIN
           </Link>
         </div>
      )}

      {/* DAILY DROPS WIDGET */}
      <DailyDrops />

      {/* THE MAIN ACCORDION */}
      <div className="space-y-2">
        <div className="flex justify-between items-end px-1">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Target Sites</h3>
          <div className="flex items-center space-x-3">
             {/* Show Credit Balance Badge */}
             {user && (
               <Badge variant="neon" className="bg-purple-900/50 border-purple-500/50 text-purple-300">
                 {credits} Credits Available
               </Badge>
             )}
             <Badge variant="outline">{cycleEvents.length} Active</Badge>
          </div>
        </div>
        
        <SiteAccordion 
          events={cycleEvents} 
          isSubscribed={!!user} 
          cycleId={activeCycle.id}
          userId={user?.id}
          userCredits={credits}
        />
      </div>
    </div>
  );
}