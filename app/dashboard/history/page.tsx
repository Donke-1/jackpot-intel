'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setTransactions(data);
      setLoading(false);
    }
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-3xl font-bold">Transaction Log</h1>

      <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
           <div className="p-8 text-center text-gray-500">Loading ledger...</div>
        ) : transactions.length === 0 ? (
           <div className="p-12 text-center">
             <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
             <p className="text-gray-500">No transactions recorded yet.</p>
           </div>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-gray-800">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-900/30">
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                        tx.type === 'deposit' || tx.type === 'winnings' 
                          ? 'bg-green-900/20 text-green-500' 
                          : 'bg-red-900/20 text-red-500'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'winnings' 
                          ? <ArrowDownLeft className="w-5 h-5" /> 
                          : <ArrowUpRight className="w-5 h-5" />
                        }
                      </div>
                      <div>
                        <div className="font-bold capitalize text-sm text-gray-200">{tx.type}</div>
                        <div className="text-xs text-gray-500">{tx.description || 'System Transaction'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className={`font-mono font-bold ${
                       tx.type === 'deposit' || tx.type === 'winnings' ? 'text-green-400' : 'text-white'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'winnings' ? '+' : '-'} 
                      KES {tx.amount}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}