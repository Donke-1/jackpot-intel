'use client';

import React, { useState } from 'react';
import { Event } from '@/types';
import { ChevronDown, ChevronUp, CheckCircle2, Shield, Zap, Package, MousePointer2, Ticket, Lock } from 'lucide-react';
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

// Helper for logos
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
  const [openEventId, setOpenEventId] = useState<number | null>(events[0]?.id || null);
  
  // Group events by platform to avoid duplicates if any
  // (Assuming API returns distinct events per platform)

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

// --- SUB-COMPONENT ---
function AccordionItem({ event, isOpen, onToggle, isSubscribed, cycleId, userId, userCredits }: any) {
  const [hasJoined, setHasJoined] = useState(false); // Local state for immediate UI update
  const [activeTab, setActiveTab] = useState<'strat_a' | 'strat_b'>('strat_a');
  const [loading, setLoading] = useState(false);
  const [bundleMode, setBundleMode] = useState<'full' | 'custom'>('full');

  const logo = getLogo(event.platform);

  const handleCommit = async () => {
    if (!userId) {
      window.location.href = '/login';
      return;
    }
    
    setLoading(true);
    const result = await joinCycle(cycleId, userId, bundleMode, event.platform);
    setLoading(false);

    if (result.success) {
      setHasJoined(true);
    } else {
      alert("Error joining cycle: " + result.message);
    }
  };

  // Determine if we show the full table or the teaser
  // User sees full table ONLY if they are logged in AND have joined (or if it was a free entry)
  const isUnlocked = isSubscribed && hasJoined;

  return (
    <div className="border border-gray-800 rounded-xl bg-gray-900/30 overflow-hidden transition-all">
      
      {/* HEADER */}
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-4">
          {logo ? (
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-600 shadow-sm">
               <Image src={logo} alt={event.platform} width={40} height={40} className="object-contain" />
             </div>
          ) : (
             <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center font-bold text-gray-400">
               {event.platform.slice(0, 2)}
             </div>
          )}
          
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{event.platform}</h3>
            <p className="text-xs text-gray-400">{event.event_name} • {event.predictions?.length || 0} Matches</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {!isUnlocked && <Badge variant="warning" className="animate-pulse">LOCKED</Badge>}
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </div>
      </button>

      {/* CONTENT BODY */}
      {isOpen && (
        <div className="border-t border-gray-800 p-4 bg-black/20">
          
          {/* STATE 1: TEASER / LOCKED VIEW */}
          {!isUnlocked ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              
              {/* 1A. THE TEASER LIST (Matches Visible, Tips Hidden) */}
              <div className="bg-black/40 border border-gray-800 rounded-lg p-2 space-y-2">
                 <div className="text-[10px] uppercase text-gray-500 font-bold px-2 mb-1 flex justify-between">
                    <span>Match Fixture</span>
                    <span>Prediction</span>
                 </div>
                 {event.predictions?.slice(0, 5).map((p: any) => ( // Show first 5 as teaser
                    <div key={p.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded border border-gray-800/50">
                        <div className="text-sm font-medium text-gray-300">
                            {p.match_name}
                        </div>
                        <div className="flex items-center space-x-1 opacity-60">
                            <span className="text-gray-600 font-mono text-xs">?</span>
                            <Lock className="w-3 h-3 text-yellow-500" />
                            <span className="text-gray-600 font-mono text-xs">?</span>
                        </div>
                    </div>
                 ))}
                 {event.predictions?.length > 5 && (
                    <div className="text-center text-xs text-gray-500 pt-1 italic">
                        + {event.predictions.length - 5} more matches in this slip...
                    </div>
                 )}
              </div>

              {/* 1B. UNLOCK / CONFIGURE ENTRY */}
              <div className="max-w-lg mx-auto bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Lock className="w-24 h-24 text-white" />
                </div>

                <div className="relative z-10">
                    <h4 className="text-xl font-bold text-white mb-1">Unlock This Slip</h4>
                    <p className="text-gray-400 text-xs mb-6">Select your entry bundle to reveal the predictions.</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div 
                        onClick={() => setBundleMode('full')}
                        className={cn(
                            "cursor-pointer p-3 rounded-lg border transition-all",
                            bundleMode === 'full' ? "bg-cyan-900/30 border-cyan-500" : "bg-gray-900 border-gray-800 opacity-50"
                        )}
                        >
                            <Package className={cn("w-6 h-6 mb-2", bundleMode === 'full' ? "text-cyan-400" : "text-gray-500")} />
                            <div className="text-sm font-bold text-white">Full Bundle</div>
                        </div>

                        <div 
                        onClick={() => setBundleMode('custom')}
                        className={cn(
                            "cursor-pointer p-3 rounded-lg border transition-all",
                            bundleMode === 'custom' ? "bg-yellow-900/30 border-yellow-500" : "bg-gray-900 border-gray-800 opacity-50"
                        )}
                        >
                            <MousePointer2 className={cn("w-6 h-6 mb-2", bundleMode === 'custom' ? "text-yellow-400" : "text-gray-500")} />
                            <div className="text-sm font-bold text-white">Single Site</div>
                        </div>
                    </div>

                    <button 
                        onClick={handleCommit}
                        disabled={loading}
                        className={cn(
                        "w-full py-3 font-bold rounded-lg transition-all flex items-center justify-center shadow-lg text-sm",
                        loading 
                            ? "bg-gray-700 cursor-not-allowed" 
                            : !userId 
                            ? "bg-green-600 hover:bg-green-500 text-white" // Guest
                            : userCredits > 0
                                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20" // User with Credit
                                : "bg-cyan-600 hover:bg-cyan-500 text-black shadow-cyan-900/20" // User (Free/Pay)
                        )}
                    >
                        {loading ? 'SYNCING...' : !userId ? 'LOGIN TO UNLOCK' : (
                        <div className="flex items-center">
                            {userCredits > 0 ? <Ticket className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                            <span>
                            {userCredits > 0 
                                ? `REDEEM 1 CREDIT` 
                                : `UNLOCK NOW`}
                            </span>
                        </div>
                        )}
                    </button>
                    {userId && userCredits > 0 && (
                        <p className="text-[10px] text-gray-500 text-center mt-2">Balance: {userCredits} Credits</p>
                    )}
                </div>
              </div>
            </div>
          ) : (
            
            /* STATE 2: THE REVEAL (Unlocked) */
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex p-1 bg-gray-800/50 rounded-lg">
                <button
                  onClick={() => setActiveTab('strat_a')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-md transition-all",
                    activeTab === 'strat_a' ? "bg-cyan-900/50 text-cyan-400 shadow-sm" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Shield className="w-4 h-4 mr-2" /> STRATEGY A (SHIELD)
                </button>
                <button
                  onClick={() => setActiveTab('strat_b')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-md transition-all",
                    activeTab === 'strat_b' ? "bg-purple-900/50 text-purple-400 shadow-sm" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Zap className="w-4 h-4 mr-2" /> STRATEGY B (SWORD)
                </button>
              </div>

              <PredictionTable 
                predictions={event.predictions || []} 
                isSubscribed={true}
                strategyMode={activeTab}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}