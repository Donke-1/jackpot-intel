'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trophy, Wallet, Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filteredUsers = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.id || '').includes(search)
  );

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <UsersIcon className="mr-3 text-cyan-500" /> User Base
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search username or ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-cyan-500 outline-none w-64 text-sm"
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
                    <Button variant="outline" className="text-xs h-8">Manage</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersIcon({className}: {className?: string}) {
  return <Shield className={className} />;
}