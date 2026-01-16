'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cycle, Event } from '@/types';
import StatusCard from '@/components/ui/StatusCard';
import SiteAccordion from '@/components/SiteAccordion';
import DailyDrops from '@/components/DailyDrops'; 
import BoastFeed from './BoastFeed'; // ✅ FIXED: Now pointing to local folder
import SuccessModal from './SuccessModal'; // ✅ NEW: Celebration logic
import { Badge } from '@/components/ui/Badge';
import { Loader2, AlertCircle, LayoutGrid, Zap, TrendingUp, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [availableCycles, setAvailableCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleEvents, setCycleEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    async function fetchData() {
      // 1. User Auth & Profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
        if (profile) setCredits(profile.credits);
      }

      // 2. FETCH ALL RELEVANT CYCLES
      // We pull Active, Pending Extension, AND Success (to trigger the modal)
      const { data: cycles } = await supabase
        .from('cycles')
        .select('*')
        .in('status', ['active', 'pending_extension', 'success'])
        .order('created_at', { ascending: false });
      
      if (cycles && cycles.length > 0) {
        setAvailableCycles(cycles);
        
        // Logic: Focus on an 'active' one first, or just the latest
        const primaryCycle = cycles.find(c => c.status === 'active') || cycles[0];
        setSelectedCycleId(primaryCycle.id);
        fetchCycleData(primaryCycle.id);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  async function fetchCycleData(id: string) {
    const { data: events } = await supabase
      .from('events')
      .select('*, predictions(*)')
      .eq('cycle_id', id)
      .order('id', { ascending: true });

    if (events) {
      const sortedEvents = events.map((e: any) => ({
        ...e,
        predictions: e.predictions.sort((a: any, b: any) => a.match_id - b.match_id)
      }));
      setCycleEvents(sortedEvents);
    }
  }

  const activeCycle = availableCycles.find(c => c.id === selectedCycleId);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
    </div>
  );

  return (
    <div className="space-y-8 px-4 pb-20 animate-in fade-in">
      
      {/* 🎉 SUCCESS MODAL: Fires if any cycle status is 'success' */}
      <SuccessModal cycles={availableCycles} />

      {/* 1. TOP SECTION: THE "BOAST" & THE "DROP" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BoastFeed />
        </div>
        <div className="lg:col-span-1">
          <DailyDrops />
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-800"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-black px-4 text-sm font-black text-gray-600 uppercase tracking-[0.3em]">
            Protocol Marketplace
          </span>
        </div>
      </div>

      {/* 2. CYCLE SELECTOR (The Hunter Marketplace) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
            <LayoutGrid className="w-3 h-3 mr-2" /> Select Active Deployment
          </h3>
          <Badge variant="outline" className="text-cyan-500 border-cyan-500/30 text-[10px]">
            {availableCycles.filter(c => c.status === 'active').length} Live Opportunities
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableCycles.map((cycle) => (
            <button 
              key={cycle.id}
              onClick={() => {
                setSelectedCycleId(cycle.id);
                fetchCycleData(cycle.id);
              }}
              className={cn(
                "relative text-left p-5 rounded-2xl border-2 transition-all duration-300 group",
                selectedCycleId === cycle.id 
                  ? "bg-cyan-900/10 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.15)] scale-[1.02]" 
                  : "bg-gray-900/20 border-gray-800 hover:border-gray-700 hover:bg-gray-900/40"
              )}
            >
              {cycle.status === 'pending_extension' && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-amber-600 text-white border-none text-[9px] animate-pulse">
                    RESCUE IN PROGRESS
                  </Badge>
                </div>
              )}

              {cycle.status === 'success' && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-green-600 text-white border-none text-[9px]">
                    GOAL REACHED 🏆
                  </Badge>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-black text-white text-sm uppercase tracking-tight">{cycle.name}</h4>
                {selectedCycleId === cycle.id ? (
                  <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-pulse" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-gray-700 group-hover:text-gray-500" />
                )}
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Badge className="bg-gray-800 text-gray-400 border-none text-[9px] font-bold">WEEK {cycle.current_week}</Badge>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter line-clamp-1">{cycle.target_desc}</span>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800/50">
                 <span className="text-[9px] text-gray-600 font-black uppercase">Volatility: {cycle.category === 'Hunter' ? 'Extreme' : 'Moderate'}</span>
                 <div className="flex items-center text-cyan-500 text-[10px] font-bold">
                   DETAILS <Sparkles className="w-3 h-3 ml-1" />
                 </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. ACTIVE DEPLOYMENT VIEW */}
      {activeCycle && (
        <div className="space-y-6 pt-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-900/20 p-6 rounded-3xl border border-gray-800">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className={cn("w-2 h-2 rounded-full animate-ping", 
                  activeCycle.status === 'success' ? "bg-green-500" : "bg-cyan-500")} 
                />
                <span className={cn("text-[10px] font-black uppercase tracking-widest",
                  activeCycle.status === 'success' ? "text-green-500" : "text-cyan-500")}>
                  {activeCycle.status === 'success' ? "Target Secured" : "Active Connection"}
                </span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter">{activeCycle.name}</h2>
              <p className="text-gray-500 text-xs font-medium mt-1 uppercase tracking-tight">
                {activeCycle.status === 'success' ? 'Analysis finalized - Goal Achieved' : `Analyzing ${cycleEvents.length} High-Variance Events`}
              </p>
            </div>
            <div className="min-w-[280px]">
              <StatusCard deadline={activeCycle.end_date} status={activeCycle.status} />
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
      )}

      {/* GUEST CALL TO ACTION */}
      {!user && (
        <div className="bg-gradient-to-r from-cyan-950/40 to-black border border-cyan-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <Zap className="text-cyan-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-black text-white tracking-tight">PROTOCOL LOCKED</p>
              <p className="text-sm text-gray-500 font-medium">Create an account to track ROI estimates and live hit rates.</p>
            </div>
          </div>
          <Link href="/login" className="w-full md:w-auto text-center bg-cyan-500 hover:bg-cyan-400 text-black font-black px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            INITIALIZE ACCESS
          </Link>
        </div>
      )}
    </div>
  );
}