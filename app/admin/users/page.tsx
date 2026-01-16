'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trophy, Wallet, Shield, User, Plus, X, ShieldAlert, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // MODAL STATE
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState('100');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (data) setUsers(data);
    setLoading(false);
  }

  const handleUpdateUser = async (updates: any) => {
    if (!selectedUser) return;
    setProcessing(true);

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', selectedUser.id);

    if (!error) {
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...updates } : u));
      // Update selected user locally so modal reflects changes
      setSelectedUser({ ...selectedUser, ...updates });
    } else {
      alert("System Error: " + error.message);
    }
    setProcessing(false);
  };

  const handleAddCredits = () => {
    const amount = parseInt(creditAmount);
    const newTotal = (selectedUser.credits || 0) + amount;
    handleUpdateUser({ credits: newTotal });
  };

  const toggleAdmin = () => {
    const newRole = !selectedUser.is_admin;
    if (confirm(`Promote ${selectedUser.username || 'this user'} to Admin?`)) {
      handleUpdateUser({ is_admin: newRole });
    }
  };

  const filteredUsers = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.id || '').includes(search)
  );

  return (
    <div className="space-y-8 text-white animate-in fade-in p-4 pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center">
            <ShieldAlert className="mr-3 text-cyan-500 w-8 h-8" /> Operative Database
          </h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Global Hunter Personnel</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by Alias, Email, or ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-2xl focus:border-cyan-500 outline-none w-full md:w-80 text-sm transition-all"
          />
        </div>
      </div>

      {/* USER TABLE */}
      <div className="bg-gray-900/20 border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-black tracking-[0.2em]">
              <tr>
                <th className="p-6">Operative Identity</th>
                <th className="p-6">Wallet Balance</th>
                <th className="p-6">Hits</th>
                <th className="p-6">Role</th>
                <th className="p-6 text-right">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                 <tr><td colSpan={5} className="p-20 text-center"><LoaderPulse /></td></tr>
              ) : filteredUsers.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-gray-600 font-bold uppercase italic tracking-widest">No operatives detected in this sector.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-cyan-500/[0.02] transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", 
                          user.is_admin ? "bg-purple-500/10 border-purple-500/30" : "bg-gray-800 border-gray-700")}>
                          {user.is_admin ? <ShieldCheck className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-gray-500" />}
                        </div>
                        <div>
                          <div className="font-black text-sm text-white flex items-center">
                            {user.username || 'Ghost Operative'}
                            {user.is_admin && <Badge variant="protocol" className="ml-2 py-0 h-4 scale-75">ADMIN</Badge>}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center text-cyan-400 font-black text-sm italic">
                        <Wallet className="w-3 h-3 mr-2" />
                        {user.credits?.toLocaleString() || 0} <span className="text-[10px] ml-1 opacity-50">CR</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center text-yellow-500 font-black text-sm italic">
                        <Star className="w-3 h-3 mr-2 fill-yellow-500/20" />
                        {user.total_wins || 0}
                      </div>
                    </td>
                    <td className="p-6">
                      <Badge variant={user.is_admin ? "protocol" : "outline"} className="uppercase text-[9px]">
                        {user.is_admin ? 'Commander' : 'Operative'}
                      </Badge>
                    </td>
                    <td className="p-6 text-right">
                      <Button 
                        variant="outline" 
                        className="text-[10px] font-black uppercase h-9 rounded-xl border-gray-800 hover:border-cyan-500 hover:text-cyan-500 transition-all"
                        onClick={() => setSelectedUser(user)}
                      >
                        Settings
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANAGE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-gray-900 border-2 border-gray-800 rounded-[2.5rem] p-8 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />

            <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 shadow-xl",
                selectedUser.is_admin ? "bg-purple-950/30 border-purple-500/50" : "bg-gray-800 border-gray-700")}>
                {selectedUser.is_admin ? <ShieldAlert className="w-10 h-10 text-purple-400" /> : <User className="w-10 h-10 text-gray-400" />}
              </div>
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{selectedUser.username || 'Operative'}</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-1 select-all">{selectedUser.id}</p>
            </div>

            <div className="space-y-6">
              {/* BALANCE INFO */}
              <div className="bg-black/50 p-5 rounded-2xl border border-gray-800 flex justify-between items-center shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Vault Balance</span>
                  <span className="text-2xl font-black text-cyan-400 italic leading-none">{selectedUser.credits?.toLocaleString()} CR</span>
                </div>
                <Zap className="text-cyan-500/20 w-8 h-8" />
              </div>

              {/* ACTION: ADD CREDITS */}
              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Manual Credit Refuel</label>
                <div className="flex space-x-2">
                  <input 
                    type="number" 
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="flex-1 bg-black border-2 border-gray-800 rounded-xl px-4 text-white font-bold focus:border-cyan-500 outline-none transition-all"
                  />
                  <Button onClick={handleAddCredits} disabled={processing} className="bg-cyan-600 hover:bg-cyan-500 px-6 rounded-xl font-black">
                    {processing ? <Zap className="animate-spin w-4 h-4" /> : 'ADD'}
                  </Button>
                </div>
              </div>

              <hr className="border-gray-800" />

              {/* ACTION: CHANGE ROLE */}
              <div className="flex items-center justify-between p-2">
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-tight">Access Level</p>
                  <p className="text-[10px] text-gray-500">Grant administrative protocols</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={toggleAdmin} 
                  disabled={processing}
                  className={cn("text-[10px] font-black px-4 h-8 rounded-lg transition-all", 
                    selectedUser.is_admin ? "border-purple-500 text-purple-400" : "border-gray-700 text-gray-500")}
                >
                  {selectedUser.is_admin ? 'REVOKE ADMIN' : 'PROMOTE ADMIN'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
  )
}

function LoaderPulse() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 opacity-30 italic">
      <Zap className="w-10 h-10 text-cyan-500 animate-pulse" />
      <span className="text-xs font-black uppercase tracking-widest">Scanning Personnel...</span>
    </div>
  )
}