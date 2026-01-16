'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, Banknote, Target } from 'lucide-react';
import CosmicHero from '@/components/landing/CosmicHero';
import LiveIntel from '@/components/landing/LiveIntel';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* --- HERO SECTION (SPLIT SCREEN) --- */}
      <section className="relative pt-24 pb-12 min-h-screen flex items-center overflow-hidden">
        
        {/* Background FX */}
        <div className="absolute inset-0 bg-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* LEFT: THE VISUALS & HERO TEXT */}
            <div className="lg:col-span-7 relative order-2 lg:order-1">
              
              {/* Mobile Heading */}
              <div className="lg:hidden text-center mb-8">
                <h1 className="text-4xl font-black text-white mb-4 uppercase leading-tight">
                  Jackpot <br />
                  <span className="text-cyan-400">Win Strategy.</span>
                </h1>
              </div>

              {/* The Rotating Logos Component */}
              <CosmicHero />
              
              {/* Desktop CTA (Below visual) */}
              <div className="hidden lg:flex flex-col items-center mt-[-50px] relative z-20 text-center">
                 <h1 className="text-6xl font-black text-white leading-none mb-6 uppercase">
                  JACKPOT <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-500">
                    WIN STRATEGY.
                  </span>
                 </h1>
                 <p className="text-gray-300 text-xl mb-8 max-w-xl mx-auto font-medium">
                   <strong>Hit Bonuses or Win the Full Jackpot Prize.</strong><br/>
                   We use advanced predictions and strategies to guarantee you the best possible slip.
                 </p>
                 <Link 
                   href="/dashboard" 
                   className="px-10 py-5 bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-full text-xl flex items-center shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-105 transition-transform"
                 >
                   GET THIS WEEK'S SLIP <ArrowRight className="ml-2 w-6 h-6" />
                 </Link>
                 <p className="mt-4 text-sm text-gray-500">
                   *If our tips lose, your next week is FREE.
                 </p>
              </div>
            </div>

            {/* RIGHT: THE LIVE FEED */}
            <div className="lg:col-span-5 relative order-1 lg:order-2 h-full">
              {/* Mobile CTA Button */}
              <div className="lg:hidden mb-8 flex justify-center">
                <Link href="/dashboard" className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg w-full text-center shadow-lg border border-green-500">
                  SEE PREDICTIONS
                </Link>
              </div>

              {/* The Live Data Component */}
              <LiveIntel />
            </div>

          </div>
        </div>
      </section>

      {/* --- VALUE PROPS (Direct Language) --- */}
      <section className="py-20 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white uppercase">Why Use Our Systems?</h2>
            <p className="text-gray-400">Stop donating money to the bookies. Use a strategy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <FeatureCard 
              icon={<Target className="w-10 h-10 text-cyan-400" />}
              title="Expert Predictions"
              desc="We don't guess. We calculate the Weekly & Mega Jackpot combinations with the highest chance of hitting 12/13 or 15/17."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-10 h-10 text-green-400" />}
              title="Bonus Guarantee"
              desc="Our goal is the Grand Prize, but our systems are designed to secure a Bonus Win even if we miss the big one."
            />
            <FeatureCard 
              icon={<Banknote className="w-10 h-10 text-yellow-400" />}
              title="Refund Protection"
              desc="If our jackpot prediction fails to win a bonus, we give you a FREE credit for the next week. No risk."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (Simplified) */}
      <section className="py-20 bg-gray-900/30">
        <div className="container mx-auto px-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
             <div>
               <h2 className="text-4xl font-bold text-white mb-6 uppercase">How to Win</h2>
               <ul className="space-y-6">
                 <li className="flex items-start">
                   <span className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center font-bold text-white mt-1">1</span>
                   <div className="ml-4">
                     <h4 className="text-xl font-bold text-white">Create Free Account</h4>
                     <p className="text-gray-400">Sign up in seconds to access the dashboard.</p>
                   </div>
                 </li>
                 <li className="flex items-start">
                   <span className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center font-bold text-white mt-1">2</span>
                   <div className="ml-4">
                     <h4 className="text-xl font-bold text-white">Get The Slip</h4>
                     <p className="text-gray-400">Unlock the "Target Cycle" for SportPesa or SportyBet.</p>
                   </div>
                 </li>
                 <li className="flex items-start">
                   <span className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center font-bold text-white mt-1">3</span>
                   <div className="ml-4">
                     <h4 className="text-xl font-bold text-white">Place Your Bet</h4>
                     <p className="text-gray-400">Copy our exact predictions to your betting app.</p>
                   </div>
                 </li>
                 <li className="flex items-start">
                   <span className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-white mt-1 shadow-lg shadow-green-500/50">4</span>
                   <div className="ml-4">
                     <h4 className="text-xl font-bold text-green-400">Collect Winnings</h4>
                     <p className="text-gray-300">Wait for the matches to finish and check your bonus.</p>
                   </div>
                 </li>
               </ul>
             </div>
             <div className="bg-black border border-gray-800 p-8 rounded-2xl relative">
               <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase">
                 Recent Result
               </div>
               <h3 className="text-gray-500 uppercase text-xs font-bold mb-2">Last Week's Target</h3>
               <div className="text-3xl font-black text-white mb-1">SPORTPESA MEGA</div>
               <div className="text-green-400 font-mono text-xl mb-6">15/17 CORRECT</div>
               
               <div className="space-y-2">
                 <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                   <span className="text-gray-400">Total Bonus Paid</span>
                   <span className="text-white font-bold">KES 2,450,000</span>
                 </div>
                 <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                   <span className="text-gray-400">Members Who Won</span>
                   <span className="text-white font-bold">342</span>
                 </div>
               </div>
               
               <Link href="/dashboard" className="block mt-6 bg-white hover:bg-gray-200 text-black text-center font-bold py-3 rounded uppercase transition-colors">
                 View Full History
               </Link>
             </div>
           </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="py-20 text-center bg-gradient-to-b from-black to-green-900/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase">
            Ready to hit the <span className="text-green-500">Jackpot?</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            The next Mega Jackpot starts soon. Don't miss the winning slip.
          </p>
          <Link 
            href="/login" 
            className="inline-block px-12 py-5 bg-green-500 text-black font-black text-xl rounded-lg hover:bg-green-400 hover:scale-105 transition-all shadow-[0_0_40px_rgba(34,197,94,0.4)]"
          >
            JOIN NOW - IT'S FREE
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-6 bg-gray-900/30 border border-gray-800 rounded-xl hover:border-green-500/50 transition-colors group">
      <div className="mb-4 inline-block p-3 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}