'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Shield, Trophy, History, Wallet, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // 1. Get Profile (Credits)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // 2. Get Participation History
        const { data: historyData } = await supabase
          .from('participants')
          .select(`
            *,
            cycles (name, target_desc, status)
          `)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });
        
        setHistory(historyData || []);
      }
      setLoading(false);
    }
    getData();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading Intel...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Shield className="w-16 h-16 text-gray-700" />
        <h2 className="text-2xl font-bold text-gray-500">Access Restricted</h2>
        <Link href="/login" className="px-6 py-2 bg-cyan-600 text-black font-bold rounded">Login Required</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      
      {/* HEADER & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="md:col-span-2 bg-gradient-to-r from-gray-900 to-black border border-gray-800 p-6 rounded-2xl flex items-center space-x-6">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-2 border-cyan-500/30">
            <span className="text-3xl">🪖</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.email?.split('@')[0]}</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Operative Active</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">{user.id}</p>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-cyan-900/10 border border-cyan-500/30 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
          <Wallet className="w-8 h-8 text-cyan-400 mb-2" />
          <h3 className="text-gray-400 text-sm uppercase tracking-widest font-bold">Rollover Credits</h3>
          <div className="text-4xl font-extrabold text-white mt-1">
            {profile?.credits || 0}
          </div>
          <p className="text-xs text-gray-500 mt-2">Available for next cycle</p>
        </div>
      </div>

      {/* HISTORY LIST */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <History className="mr-2" /> Mission Log
        </h2>
        
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl">
              <p className="text-gray-500">No missions on record.</p>
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="bg-gray-900/40 border border-gray-800 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Left: Cycle Info */}
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-lg font-bold text-white">{entry.cycles?.name || 'Unknown Cycle'}</span>
                    <Badge variant={entry.cycles?.status === 'active' ? 'neon' : 'outline'}>
                      {entry.cycles?.status?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center space-x-2">
                    <span>Bundle: <span className="text-white">{entry.sites_selected?.join(', ')}</span></span>
                    <span>•</span>
                    <span>{new Date(entry.joined_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right: Outcome */}
                <div className="flex items-center space-x-4">
                  {entry.personal_outcome === 'pending' && (
                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-500">IN PROGRESS</Badge>
                  )}
                  
                  {entry.personal_outcome === 'won' && (
                    <div className="flex items-center text-green-400 font-bold bg-green-900/20 px-4 py-2 rounded-lg border border-green-500/30">
                      <Trophy className="w-4 h-4 mr-2" /> MISSION SUCCESS
                    </div>
                  )}

                  {entry.personal_outcome === 'missed_opportunity' && (
                    <div className="text-right">
                       <div className="flex items-center text-gray-400 font-bold">
                         <AlertTriangle className="w-4 h-4 mr-2" /> MISSED TARGET
                       </div>
                       {entry.rollover_credit && (
                         <span className="text-xs text-cyan-400 font-mono">+1 CREDIT ISSUED</span>
                       )}
                    </div>
                  )}

                  {entry.personal_outcome === 'lost' && (
                    <Badge variant="outline" className="border-red-500/30 text-red-500">FAILED</Badge>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}