'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // 1. SMART HIDE: Don't show this footer inside the Dashboard/Admin
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-gray-900 bg-black py-12 relative overflow-hidden">
      {/* Background Glow (Optional subtle effect) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1 bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent blur-sm" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* LEFT: Logo */}
        <div className="flex items-center space-x-2">
          <div className="bg-gray-900 p-1.5 rounded-lg border border-gray-800">
            <Zap className="h-4 w-4 text-cyan-500 fill-current" />
          </div>
          <span className="font-black text-white tracking-tighter text-lg">
            JACKPOT<span className="text-cyan-600">INTEL</span>
          </span>
        </div>

        {/* CENTER: The "Green Live Thingy" (Status Beacon) */}
        <div className="flex items-center space-x-3 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] text-green-500 font-mono font-bold tracking-widest uppercase">
            System Online
          </span>
        </div>

        {/* RIGHT: Links */}
        <div className="flex space-x-6">
          <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors text-xs font-bold uppercase tracking-wide">Terms</a>
          <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors text-xs font-bold uppercase tracking-wide">Privacy</a>
          <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors text-xs font-bold uppercase tracking-wide">Intel Guide</a>
        </div>

      </div>
      
      {/* Bottom Copyright */}
      <div className="text-center mt-8 text-[10px] text-gray-700 font-mono">
        &copy; {new Date().getFullYear()} HUNTER PROTOCOL. ALL RIGHTS RESERVED.
      </div>
    </footer>
  );
}