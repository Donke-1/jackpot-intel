import React from 'react';
import Link from 'next/link';
import { Shield, Zap, Target, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <div className="py-20 text-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Protocol</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          We don't gamble. We execute algorithmic cycles. Understand the machine before you join.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20 space-y-24">
        
        {/* CONCEPT 1: THE CYCLE */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-6 border border-gray-700">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">1. The Cycle Theory</h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              Most bettors chase single wins. We chase <strong>variance</strong>. A "Cycle" is a campaign of 4-6 weeks where we target specific jackpot pools. We don't care about winning every match; we care about hitting the <strong>12/17 threshold</strong> once per cycle.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                <span>Decouples revenue from weekly results</span>
              </li>
              <li className="flex items-center text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                <span>Mathematically optimized for 13-game pools</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 relative">
             <div className="absolute -top-4 -right-4 bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
               Active
             </div>
             <div className="space-y-4 font-mono text-sm">
               <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                 <span className="text-gray-500">Cycle ID</span>
                 <span className="text-cyan-400">JAN-26-WK03</span>
               </div>
               <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                 <span className="text-gray-500">Status</span>
                 <span className="text-green-400">IN PROGRESS</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-gray-500">Target</span>
                 <span>Hit 12/17 Bonus</span>
               </div>
             </div>
          </div>
        </section>

        {/* CONCEPT 2: DUAL ENGINE */}
        <section>
          <h2 className="text-3xl font-bold mb-12 text-center">2. The Dual-Engine Intelligence</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* STRAT A */}
            <div className="p-8 rounded-2xl border border-cyan-900/30 bg-gray-900/20 relative group hover:border-cyan-500/50 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Shield className="w-32 h-32 text-cyan-500" />
              </div>
              <Shield className="w-10 h-10 text-cyan-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">Strategy A: The Shield</h3>
              <Badge variant="neon" className="mb-4">Petro-Blue v6.5</Badge>
              <p className="text-gray-400 mb-6">
                The anchor. This strategy plays significantly safer, relying on home-favored metrics and low-risk draws. It is designed to keep you in the game long enough for variance to strike.
              </p>
              <div className="bg-black/50 p-4 rounded-lg border border-gray-800 font-mono text-xs text-cyan-300">
                &gt; DETECTING BANKER... <br/>
                &gt; HOME ODDS &lt; 1.55 LOCKED.
              </div>
            </div>

            {/* STRAT B */}
            <div className="p-8 rounded-2xl border border-purple-900/30 bg-gray-900/20 relative group hover:border-purple-500/50 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-32 h-32 text-purple-500" />
              </div>
              <Zap className="w-10 h-10 text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">Strategy B: The Sword</h3>
              <Badge variant="outline" className="text-purple-400 border-purple-500/50 mb-4">OMEGA-7 v2.0</Badge>
              <p className="text-gray-400 mb-6">
                The chaos engine. This strategy deliberately hunts for "Ghost Favorites" (favorites that are statistically weak) and pivots to high-odds draws or away wins. This is where the bonus lives.
              </p>
              <div className="bg-black/50 p-4 rounded-lg border border-gray-800 font-mono text-xs text-purple-300">
                &gt; ENTROPY SPIKE DETECTED... <br/>
                &gt; DEPLOYING DRAW TRAP.
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-10 border-t border-gray-800">
           <h2 className="text-2xl font-bold mb-6">Ready to sync?</h2>
           <div className="flex justify-center gap-4">
             <Link 
               href="/login" 
               className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center"
             >
               Join Cycle #03 <ArrowRight className="ml-2 w-5 h-5" />
             </Link>
           </div>
        </section>

      </div>
    </div>
  );
}