'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Database, 
  Layers, 
  Users, 
  Trophy, 
  Wallet, 
  History, 
  ShieldAlert,
  LogOut,
  ChevronRight,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // 1. Load Persisted State & User Info
  useEffect(() => {
    async function init() {
      // A. Check User
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || '');

      // B. Check Local Storage for Admin Mode Preference
      const savedMode = localStorage.getItem('jackpot_admin_mode');
      if (savedMode === 'true') {
        setIsAdminMode(true);
      }
    }
    init();
  }, []);

  // 2. Toggle Handler (Saves to Storage)
  const toggleAdminMode = () => {
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    localStorage.setItem('jackpot_admin_mode', String(newMode));
  };

  // --- NAVIGATION CONFIG ---
  
  const userLinks = [
    { name: 'Live Intel', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Predictions', href: '/dashboard/predictions', icon: Trophy },
    { name: 'Wallet & Credits', href: '/dashboard/wallet', icon: Wallet },
    { name: 'History', href: '/dashboard/history', icon: History },
  ];

  const adminLinks = [
    { name: 'Data Ingestion', href: '/admin/ingest', icon: Database, badge: 'AI' },
    { name: 'Cycle Manager', href: '/admin/cycles', icon: Layers, badge: 'NEW' },
    { name: 'User Base', href: '/admin/users', icon: Users },
    { name: 'System Health', href: '/admin/system', icon: ShieldAlert },
  ];

  const currentLinks = isAdminMode ? adminLinks : userLinks;

  return (
    <div className="w-64 h-screen bg-black border-r border-gray-800 flex flex-col justify-between fixed left-0 top-0 z-50">
      
      {/* 1. HEADER */}
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="font-black text-white text-lg">J</span>
          </div>
          <span className="font-bold text-xl tracking-tighter text-white">
            JACKPOT<span className="text-cyan-500">INTEL</span>
          </span>
        </Link>

        {/* 2. NAVIGATION LINKS */}
        <nav className="space-y-1">
          {isAdminMode && (
            <div className="mb-4 px-2 text-xs font-bold text-red-500 uppercase tracking-widest flex items-center animate-pulse">
              <ShieldAlert className="w-3 h-3 mr-2" /> Admin Console
            </div>
          )}

          {currentLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-gray-900 text-white border border-gray-800" 
                    : "text-gray-400 hover:text-white hover:bg-gray-900/50"
                )}
              >
                <div className="flex items-center">
                  <item.icon className={cn(
                    "w-5 h-5 mr-3 transition-colors",
                    isActive ? "text-cyan-500" : "text-gray-500 group-hover:text-gray-300"
                  )} />
                  {item.name}
                </div>
                
                {/* Optional Badge */}
                {/* @ts-ignore */}
                {item.badge && (
                  <Badge variant="neon" className="text-[10px] h-5 px-1.5">
                    {/* @ts-ignore */}
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 3. FOOTER & SWITCHER */}
      <div className="p-4 bg-gray-900/30 border-t border-gray-800">
        
        {/* THE GOD MODE SWITCH */}
        <div 
          onClick={toggleAdminMode}
          className="cursor-pointer mb-4 flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-black hover:border-gray-700 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              isAdminMode ? "bg-red-900/30 text-red-500" : "bg-gray-800 text-gray-400"
            )}>
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <p className={cn("text-xs font-bold", isAdminMode ? "text-red-400" : "text-gray-300")}>
                {isAdminMode ? "Admin Console" : "User View"}
              </p>
              <p className="text-[10px] text-gray-500">Click to switch</p>
            </div>
          </div>
          <ChevronRight className={cn(
            "w-4 h-4 text-gray-600 transition-transform duration-300",
            isAdminMode && "rotate-90 text-red-500"
          )} />
        </div>

        {/* User Info */}
        <div className="flex items-center justify-between px-2">
           <div className="text-xs text-gray-500 truncate max-w-[120px]">
             {userEmail || 'Guest'}
           </div>
           <Link href="/login" className="text-gray-500 hover:text-white transition-colors">
             <LogOut className="w-4 h-4" />
           </Link>
        </div>
      </div>

    </div>
  );
}