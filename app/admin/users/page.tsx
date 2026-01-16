'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trophy, Wallet, Shield, User, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
    // We fetch profiles and order by created_at
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (data) setUsers(data);
    setLoading(false);
  }

  const handleAddCredits = async () => {
    if (!selectedUser) return;
    setProcessing(true);

    const amount = parseInt(creditAmount);
    const newTotal = (selectedUser.credits || 0) + amount;

    const { error } = await supabase
      .from('profiles')
      .update({ credits: newTotal })
      .eq('id', selectedUser.id);

    if (!error) {
      // Update local state immediately for UI snap
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, credits: newTotal } : u));
      setSelectedUser(null);
      alert(`Successfully added ${amount} CR to ${selectedUser.username}`);
    } else {
      alert("Error: " + error.message);
    }
    setProcessing(false);
  };

  const filteredUsers = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.id || '').includes(search)
  );

  return (
    <div className="space-y-6 text-white animate-in fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Shield className="mr-3 text-cyan-500" /> User Base
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search username or ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-cyan-500 outline-none w-64 text-sm text-white"
          />
        </div>
      </div>

      <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4">User Identity</th>
              <th className="p-4">Wallet</th>
              <th className="p-4">Performance</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
               <tr><td colSpan={5} className="p-8 text-center text-gray-500">Scanning database...</td></tr>
            ) : filteredUsers.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-gray-500">No operatives found.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-900/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{user.username || 'Anonymous'}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{user.id.slice(0,8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-green-400 font-mono text-sm">
                      <Wallet className="w-3 h-3 mr-2" />
                      KES {user.credits || 0}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-yellow-500 font-bold text-sm">
                      <Trophy className="w-3 h-3 mr-2" />
                      {user.total_wins || 0} Wins
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="success">Active</Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button 
                      variant="outline" 
                      className="text-xs h-8 hover:bg-cyan-900/20 hover:text-cyan-400 hover:border-cyan-500"
                      onClick={() => setSelectedUser(user)}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MANAGE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{selectedUser.username || 'Operative'}</h3>
              <p className="text-xs text-gray-500 font-mono">{selectedUser.id}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-black p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                <span className="text-gray-500 text-xs uppercase">Current Balance</span>
                <span className="text-green-400 font-mono font-bold">{selectedUser.credits} CR</span>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Add Credits</label>
                <div className="flex space-x-2">
                  <input 
                    type="number" 
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="flex-1 bg-black border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                  />
                  <Button 
                    onClick={handleAddCredits} 
                    disabled={processing}
                    className="bg-cyan-600 hover:bg-cyan-500"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}