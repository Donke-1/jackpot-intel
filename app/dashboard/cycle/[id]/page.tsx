'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Unlock, Shield, AlertTriangle, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useParams, useRouter } from 'next/navigation';

export default function CycleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const cycleId = params.id as string;

  const [cycle, setCycle] = useState<any>(null);
  const [jackpots, setJackpots] = useState<any[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [userId, setUserId] = useState('');

  // 1. Fetch Cycle Data & Check Access
  useEffect(() => {
    async function loadData() {
      // A. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      // B. Get User Credits
      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      if (profile) setUserCredits(profile.credits || 0);

      // C. Check if already unlocked
      const { data: unlock } = await supabase
        .from('unlocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('cycle_id', cycleId)
        .single();
      
      if (unlock) setIsUnlocked(true);

      // D. Fetch Cycle Details
      const { data: cycleData } = await supabase.from('cycles').select('*').eq('id', cycleId).single();
      setCycle(cycleData);

      // E. Fetch Linked Jackpots & Matches
      // This is a complex join: Cycle -> CycleJackpots -> Jackpots -> Events -> Predictions
      // For simplicity, we fetch Jackpots first, then their events.
      
      // Get Jackpot IDs for this cycle
      const { data: links } = await supabase.from('cycle_jackpots').select('jackpot_id').eq('cycle_id', cycleId);
      const jackpotIds = links?.map(l => l.jackpot_id) || [];

      if (jackpotIds.length > 0) {
        // Fetch full Jackpot objects with Events & Predictions
        const { data: fullJackpots } = await supabase
          .from('jackpots')
          .select(`
            *,
            events (
              *,
              predictions (*)
            )
          `)
          .in('id', jackpotIds);
          
        setJackpots(fullJackpots || []);
      }

      setLoading(false);
    }
    loadData();
  }, [cycleId]);

  // 2. Handle Purchase (Credit Deduction)
  const handleUnlock = async () => {
    const PRICE = 50; // Hardcoded price for now
    
    if (userCredits < PRICE) {
      alert("Insufficient Credits! Please deposit.");
      router.push('/dashboard/wallet');
      return;
    }

    setBuying(true);
    try {
      // A. Deduct Credits
      const { error: deductErr } = await supabase.rpc('deduct_credits', { 
        user_uuid: userId, 
        amount: PRICE 
      });
      // Note: We need to create this RPC function, but for now let's assume direct update
      // Fallback: Direct Update (Less secure but works for prototype)
      if (deductErr) {
        // If RPC fails/missing, do manual update
        await supabase.from('profiles').update({ credits: userCredits - PRICE }).eq('id', userId);
      }

      // B. Record Transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        amount: PRICE,
        type: 'purchase',
        description: `Unlocked Cycle: ${cycle.name}`
      });

      // C. Grant Access
      await supabase.from('unlocks').insert({
        user_id: userId,
        cycle_id: cycleId,
        amount_paid: PRICE
      });

      setIsUnlocked(true);
      alert("Cycle Unlocked Successfully!");

    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setBuying(false);
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Decrypting cycle data...</div>;
  if (!cycle) return <div className="p-12 text-center text-red-500">Cycle not found.</div>;

  return (
    <div className="text-white space-y-8 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-center">
        <div>
          <Badge variant="neon" className="mb-2">WEEK {cycle.current_week}</Badge>
          <h1 className="text-3xl font-black uppercase tracking-tight">{cycle.name}</h1>
          <p className="text-gray-400 mt-1">{cycle.target_desc}</p>
        </div>
        
        <div className="mt-6 md:mt-0 text-right">
          {isUnlocked ? (
            <div className="flex flex-col items-end">
              <span className="flex items-center text-green-400 font-bold mb-1">
                <Unlock className="w-5 h-5 mr-2" /> ACCESS GRANTED
              </span>
              <p className="text-xs text-gray-500">Good luck, Agent.</p>
            </div>
          ) : (
            <div className="flex flex-col items-end">
               <div className="text-2xl font-black text-cyan-400 mb-2">50 CREDITS</div>
               <Button 
                 onClick={handleUnlock} 
                 disabled={buying}
                 className="bg-cyan-600 hover:bg-cyan-500 font-bold py-6 px-8 text-lg shadow-[0_0_20px_rgba(8,145,178,0.4)]"
               >
                 {buying ? 'PROCESSING...' : 'UNLOCK NOW'}
               </Button>
               <p className="text-[10px] text-gray-500 mt-2">Balance: {userCredits} CR</p>
            </div>
          )}
        </div>
      </div>

      {/* MATCHES LIST */}
      <div className="space-y-8">
        {jackpots.map((jackpot) => (
          <div key={jackpot.id} className="space-y-4">
            <h3 className="text-xl font-bold flex items-center text-gray-400">
              <Shield className="w-5 h-5 mr-2" /> {jackpot.platform} - {jackpot.variant}
            </h3>

            <div className="grid gap-3">
              {jackpot.events?.map((event: any) => {
                const pred = event.predictions?.[0]; // Assuming 1 prediction row per event for now
                
                return (
                  <div key={event.id} className="bg-black border border-gray-800 p-4 rounded-xl flex items-center justify-between group">
                    {/* Match Info */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(event.start_time).toLocaleString()}
                      </div>
                      <div className="font-bold text-lg text-gray-200">{event.event_name}</div>
                    </div>

                    {/* THE PREDICTION (Blurred if Locked) */}
                    <div className="relative">
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm z-10 flex items-center justify-center rounded border border-gray-700">
                          <Lock className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      
                      <div className={`flex items-center space-x-4 ${!isUnlocked ? 'opacity-20' : ''}`}>
                         <div className="text-center">
                           <div className="text-[10px] text-gray-500 uppercase">Strat A</div>
                           <Badge variant="outline" className="border-cyan-500 text-cyan-400 font-black text-lg w-12 justify-center">
                             {pred?.strat_a_pick || '-'}
                           </Badge>
                         </div>
                         <div className="text-center">
                           <div className="text-[10px] text-gray-500 uppercase">Strat B</div>
                           <Badge variant="outline" className="border-purple-500 text-purple-400 font-black text-lg w-12 justify-center">
                             {pred?.strat_b_pick || '-'}
                           </Badge>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}