'use client';

import React from 'react';
import { Wallet, CreditCard, ArrowUpRight, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function WalletPage() {
  return (
    <div className="space-y-8 text-white">
      <h1 className="text-3xl font-bold">Wallet & Credits</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BALANCE CARD */}
        <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
          
          <div className="flex items-center space-x-3 mb-2 text-gray-400">
            <Wallet className="w-5 h-5" />
            <span className="text-sm uppercase tracking-widest">Current Balance</span>
          </div>
          
          <div className="text-5xl font-black text-white mb-8">
            KES 0.00
          </div>
          
          <div className="flex space-x-4">
             <Button className="flex-1 bg-green-600 hover:bg-green-500 font-bold h-12">
               <ArrowUpRight className="w-4 h-4 mr-2" /> DEPOSIT
             </Button>
             <Button variant="outline" className="flex-1 h-12">
               WITHDRAW
             </Button>
          </div>
        </div>

        {/* INFO CARD */}
        <div className="bg-gray-900/30 p-8 rounded-2xl border border-gray-800 flex flex-col justify-center">
           <h3 className="font-bold text-lg mb-2">How Credits Work</h3>
           <p className="text-gray-400 text-sm leading-relaxed">
             1 Credit = 1 KES. Credits are used to unlock prediction cycles. 
             Winnings from "Objective Cycles" are deposited back here automatically.
           </p>
        </div>
      </div>

      {/* TRANSACTIONS PLACEHOLDER */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <History className="w-5 h-5 mr-2 text-gray-500" /> Recent Transactions
        </h3>
        <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center">
           <p className="text-gray-500">No transactions found.</p>
        </div>
      </div>
    </div>
  );
}