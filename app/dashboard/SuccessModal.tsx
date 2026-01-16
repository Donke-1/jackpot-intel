'use client';

import React, { useState, useEffect } from 'react';
import { PartyPopper, X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function SuccessModal({ cycles }: { cycles: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [winningCycle, setWinningCycle] = useState<any>(null);

  useEffect(() => {
    // Check if any cycle in the list just hit 'success'
    const winner = cycles.find(c => c.status === 'success');
    if (winner) {
      setWinningCycle(winner);
      setIsOpen(true);
    }
  }, [cycles]);

  if (!isOpen || !winningCycle) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-gray-900 border-2 border-yellow-500 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden">
        
        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="space-y-6">
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Trophy className="w-10 h-10 text-black" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">BOOM! 🎯</h2>
            <p className="text-yellow-500 font-bold uppercase text-xs tracking-widest">Protocol Goal Achieved</p>
          </div>

          <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Target Cleared:</p>
            <p className="text-white font-bold">{winningCycle.name}</p>
          </div>

          <p className="text-gray-400 text-xs italic leading-relaxed px-2">
            "Your bank account is about to get a lot more popular. Don't forget us when you're buying that private island! 🏝️"
          </p>

          <Button 
            onClick={() => setIsOpen(false)}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-6 rounded-2xl text-lg"
          >
            <PartyPopper className="w-5 h-5 mr-2" /> LET'S GOOOO!
          </Button>
        </div>
      </div>
    </div>
  );
}