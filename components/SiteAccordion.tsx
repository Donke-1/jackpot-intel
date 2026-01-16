'use client';

import React, { useState } from 'react';
import { Event } from '@/types';
import { ChevronDown, ChevronUp, Shield, Zap, Package, MousePointer2, Ticket, Lock, Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import PredictionTable from '@/components/ui/PredictionTable';
import { Badge } from '@/components/ui/Badge';
import { joinCycle } from '@/app/actions';
import Image from 'next/image';

interface SiteAccordionProps {
  events: Event[];
  isSubscribed: boolean;
  cycleId: string;
  userId?: string;
  userCredits?: number;
}

// 💰 The "Pot of Gold" Data
const JACKPOT_POOLS: Record<string, { amount: string; funnyNote: string }> = {
  'SportPesa Mega': { amount: '250,000,000', funnyNote: 'Enough to buy a helicopter and a small mountain. 🚁' },
  'SportPesa Midweek': { amount: '15,000,000', funnyNote: 'Time to upgrade from that rusty bike! 🚲' },
  'Betika Grand': { amount: '100,000,000', funnyNote: 'Your landlord will finally start calling you "Sir". 🎩' },
  'Mozzart Super': { amount: '20,000,000', funnyNote: 'Vacation? No, we are buying the whole hotel. 🏨' },
  'SportyBet Jackpot': { amount: '5,000,000', funnyNote: 'Steak dinners for the next 5 years? Yes please. 🥩' }
};

const getLogo = (platform: string) => {
  const map: any = {
    'SportPesa': '/logos/sp.jpeg',
    'SportyBet': '/logos/sb.png',
    'Mozzart': '/logos/mz.jpg',
    'Shabiki': '/logos/sk.svg'
  };
  return map[platform] || null;
};

export default function SiteAccordion({ events, isSubscribed, cycleId, userId, userCredits = 0 }: SiteAccordionProps) {
  const [openEventId, setOpenEventId] = useState<string | null>(events[0]?.id || null);
  
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <AccordionItem 
          key={event.id} 
          event={event} 
          isOpen={openEventId === event.id} 
          onToggle={() => setOpenEventId(openEventId === event.id ? null : event.id)}
          isSubscribed={isSubscribed}
          cycleId={cycleId}
          userId={userId}
          userCredits={userCredits}
        />
      ))}
    </div>
  );
}

function AccordionItem({ event, isOpen, onToggle, isSubscribed, cycleId, userId, userCredits }: any) {
  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'strat_a' | 'strat_b'>('strat_a');
  const [loading, setLoading] = useState(false);
  const [bundleMode, setBundleMode] = useState<'full' | 'custom'>('full');

  const logo = getLogo(event.platform);

  // 🧠 Logic: Find the payout hype for this specific platform/variant
  const getHype = () => {
    const key = event.event_name.includes('Mega') ? `${event.platform} Mega` : 
                event.event_name.includes('Midweek') ? `${event.platform} Midweek` : 
                `${event.platform} Jackpot`;
    return JACKPOT_POOLS[key] || { amount: 'Millions', funnyNote: 'Enough to make your ex text you "Hey". 📱' };
  };

  const hype = getHype();

  const handleCommit = async () => {
    if (!userId) { window.location.href = '/login'; return; }
    setLoading(true);
    const result = await joinCycle(cycleId, userId, bundleMode, event.platform);
    setLoading(false);
    if (result.success) { setHasJoined(true); } else { alert(result.message); }
  };

  const isUnlocked = isSubscribed && hasJoined;

  return (
    <div className={cn(
      "border rounded-2xl transition-all duration-500 overflow-hidden",
      isOpen ? "border-cyan-500/30 bg-gray-900/50" : "border-gray-800 bg-gray-900/20"
    )}>
      
      {/* HEADER */}
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-gray-700 shadow-xl">
            {logo ? <Image src={logo} alt={event.platform} width={48} height={48} className="object-contain" /> : <span className="text-black font-black">{event.platform[0]}</span>}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-black text-white tracking-tight">{event.platform}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{event.event_name}</span>
              <Badge variant="outline" className="text-[9px] py-0 h-4 border-gray-700">{event.predictions?.length} Games</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {!isUnlocked && <Badge variant="neon" className="animate-pulse">LOCKED</Badge>}
          {isOpen ? <ChevronUp className="w-5 h-5 text-cyan-500" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
        </div>
      </button>

      {/* CONTENT */}
      {isOpen && (
        <div className="p-5 border-t border-gray-800 animate-in slide-in-from-top-2">
          
          {/* 💰 PAYOUT ESTIMATOR WIDGET */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 p-4 rounded-2xl mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <Coins className="text-yellow-500 w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] text-yellow-500 font-black uppercase tracking-widest flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" /> Estimated Jackpot Pool
                </p>
                <p className="text-xl font-black text-white italic tracking-tighter">KES {hype.amount}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 italic text-right max-w-[120px] leading-tight">
              {hype.funnyNote}
            </p>
          </div>

          {!isUnlocked ? (
            <div className="space-y-6">
              {/* TEASER TABLE */}
              <div className="bg-black/40 rounded-xl p-3 border border-gray-800/50">
                {event.predictions?.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex justify-between p-3 border-b border-gray-800/50 last:border-0 opacity-50">
                    <span className="text-xs font-bold text-gray-400">{p.match_name}</span>
                    <Lock className="w-3 h-3 text-gray-600" />
                  </div>
                ))}
                <p className="text-center text-[10px] text-gray-600 py-2 italic font-bold uppercase">Unlock to view full protocol breakdown</p>
              </div>

              {/* UNLOCK CARD */}
              <div className="bg-black border border-gray-800 rounded-2xl p-6 shadow-2xl">
                <h4 className="font-black text-white uppercase text-sm mb-4 flex items-center">
                  <Ticket className="w-4 h-4 mr-2 text-cyan-500" /> Select Unlock Mode
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div onClick={() => setBundleMode('full')} className={cn("cursor-pointer p-4 rounded-xl border-2 transition-all", bundleMode === 'full' ? "bg-cyan-900/20 border-cyan-500" : "bg-gray-900/50 border-gray-800 opacity-40")}>
                    <Package className="w-5 h-5 mb-2 text-cyan-400" />
                    <div className="text-xs font-black text-white uppercase">Full Cycle</div>
                  </div>
                  <div onClick={() => setBundleMode('custom')} className={cn("cursor-pointer p-4 rounded-xl border-2 transition-all", bundleMode === 'custom' ? "bg-purple-900/20 border-purple-500" : "bg-gray-900/50 border-gray-800 opacity-40")}>
                    <MousePointer2 className="w-5 h-5 mb-2 text-purple-400" />
                    <div className="text-xs font-black text-white uppercase">Single List</div>
                  </div>
                </div>
                <button onClick={handleCommit} disabled={loading} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
                  {loading ? 'SYNCING PROTOCOL...' : userCredits > 0 ? `REDEEM 1 CREDIT` : 'JOIN HUNTER CYCLE'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex p-1 bg-black/60 rounded-xl border border-gray-800">
                <button onClick={() => setActiveTab('strat_a')} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center", activeTab === 'strat_a' ? "bg-cyan-600 text-black" : "text-gray-500 hover:text-gray-300")}>
                  <Shield className="w-3 h-3 mr-2" /> SHIELD (SAFE)
                </button>
                <button onClick={() => setActiveTab('strat_b')} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center", activeTab === 'strat_b' ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300")}>
                  <Zap className="w-3 h-3 mr-2" /> SWORD (AGGR)
                </button>
              </div>
              <PredictionTable predictions={event.predictions || []} isSubscribed={true} strategyMode={activeTab} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}