import React from 'react';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
        
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <Zap className="h-5 w-5 text-cyan-500" />
          <span className="font-bold text-white tracking-tight">JACKPOT INTEL</span>
        </div>

        <div className="text-sm text-gray-600 font-mono">
          &copy; {new Date().getFullYear()} HUNTER PROTOCOL. SYSTEM ONLINE.
        </div>

        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Terms</a>
          <a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Privacy</a>
          <a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Intel Guide</a>
        </div>
      </div>
    </footer>
  );
}