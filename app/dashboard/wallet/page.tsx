'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  History, 
  Loader2, 
  Ticket, 
  ShieldCheck,
  Zap,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    async function fetchWalletData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Fetch Real-time Balance
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);

        // 2. Fetch Recent Deployment Activity (Participants table)
        const { data: activity } = await supabase
          .from('participants')
          .select(`
            *,
            cycles ( name, target_desc )
          `)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(5);

        setHistory(activity || []);
      }
      setLoading(false);
    }
    fetchWalletData();
  }, []);

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 pb-20 animate-in fade-in">
      
      {/* 💳 HEADER & BALANCE */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">The Hunter's Vault</h1>
          <p className="text-gray-500 text-sm font-medium">Manage your intelligence fuel and deployment logs.</p>
        </div>
        <Badge variant="protocol" className="w-fit">
          <ShieldCheck className="w-3 h-3 mr-1" /> SECURE SESSION
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* DYNAMIC BALANCE CARD */}
        <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2rem] border border-gray-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-700" />
          
          <div className="flex items-center space-x-3 mb-4 text-cyan-500">
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Credits</span>
          </div>
          
          <div className="flex items-baseline space-x-2 mb-8">
            <span className="text-5xl font-black text-white italic tracking-tighter">
              {profile?.credits?.toLocaleString() || '0'}
            </span>
            <span className="text-gray-500 font-bold uppercase text-xs">Credits Available</span>
          </div>
          
          <div className="flex space-x-4 relative z-10">
             <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-black font-black h-12 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
               <Zap className="w-4 h-4 mr-2 fill-black" /> REFUEL
             </Button>
             <Button variant="outline" className="flex-1 h-12 rounded-xl border-gray-800 hover:bg-white/5 text-gray-300 font-bold">
               TRANSFER
             </Button>
          </div>
        </div>

        {/* INFO CARD (STYLIZED) */}
        <div className="bg-gray-900/20 p-8 rounded-[2rem] border border-gray-800 flex flex-col justify-center space-y-4">
           <div className="flex items-center space-x-2 text-yellow-500">
              <Ticket className="w-5 h-5" />
              <h3 className="font-black text-xs uppercase tracking-widest">Protocol Rules</h3>
           </div>
           <p className="text-gray-400 text-xs leading-relaxed font-medium">
             <span className="text-white font-bold">1 Credit = 1 KES.</span> Use credits to unlock the Hunter Protocol's deep-intelligence cycles. 
             When a target is hit, bonuses are funneled directly back to this vault. 
           </p>
           <p className="text-[10px] text-gray-600 italic">
             "Don't worry, your credits are safer here than a 1/17 jackpot pick." 🍻
           </p>
        </div>
      </div>

      {/* RECENT ACTIVITY (LOGS) */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center px-2">
          <History className="w-4 h-4 mr-2" /> Recent Deployment Logs
        </h3>
        
        <div className="space-y-2">
          {history.length > 0 ? history.map((log, i) => (
            <div key={i} className="bg-black/40 border border-gray-900 p-4 rounded-2xl flex items-center justify-between hover:border-gray-800 transition-all group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center border border-gray-800">
                  <ArrowUpRight className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-tight">
                    {log.cycles?.name || 'Protocol Access'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono italic">
                    {new Date(log.joined_at).toLocaleDateString()} • {log.cycles?.target_desc || 'Standard Unlock'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">-1.00</p>
                <p className="text-[9px] text-gray-600 font-bold uppercase">Intelligence Cost</p>
              </div>
            </div>
          )) : (
            <div className="border border-dashed border-gray-800 rounded-3xl p-16 text-center space-y-3">
               <TrendingDown className="w-8 h-8 text-gray-800 mx-auto" />
               <p className="text-xs text-gray-600 font-bold uppercase italic tracking-widest">
                 "No deployments found. The field is clear."
               </p>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="pt-4 flex flex-wrap gap-2">
         <Badge variant="outline" className="bg-gray-900/50 border-gray-800 py-2 px-4 cursor-pointer hover:border-cyan-500/50 transition-colors">
            Support Ticket
         </Badge>
         <Badge variant="outline" className="bg-gray-900/50 border-gray-800 py-2 px-4 cursor-pointer hover:border-cyan-500/50 transition-colors">
            Transaction CSV
         </Badge>
      </div>
    </div>
  );
}