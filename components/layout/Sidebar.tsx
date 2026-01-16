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
  UserCog,
  Menu,
  X,
  LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

export default function Sidebar() {
  const pathname = usePathname();
  
  // STATE
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isRealAdmin, setIsRealAdmin] = useState(false); // The actual DB permission
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // 1. Load User & Permissions
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        
        // CHECK IF ACTUALLY ADMIN IN DB
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (profile?.is_admin) {
          setIsRealAdmin(true);
          
          // Restore toggle state ONLY if they are real admin
          const savedMode = localStorage.getItem('jackpot_admin_mode');
          if (savedMode === 'true') setIsAdminMode(true);
        }
      }
    }
    init();
  }, []);

  // 2. Auto-close mobile menu on nav
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleAdminMode = () => {
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    localStorage.setItem('jackpot_admin_mode', String(newMode));
  };

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

  // Logic: If in Admin Mode (and allowed), show Admin Links. Otherwise User Links.
  const currentLinks = (isRealAdmin && isAdminMode) ? adminLinks : userLinks;

  return (
    <>
      {/* MOBILE TRIGGER */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 border border-gray-700 rounded-lg text-white shadow-lg hover:bg-gray-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* MOBILE BACKDROP */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
        />
      )}

      {/* SIDEBAR */}
      <div className={cn(
        "w-64 h-screen bg-black border-r border-gray-800 flex flex-col justify-between fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        
        {/* HEADER */}
        <div className="p-6 relative">
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 md:hidden text-gray-500 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <Link href="/" className="flex items-center space-x-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-black text-white text-lg">J</span>
            </div>
            <span className="font-bold text-xl tracking-tighter text-white">
              JACKPOT<span className="text-cyan-500">INTEL</span>
            </span>
          </Link>

          {/* NAV */}
          <nav className="space-y-1">
            {isRealAdmin && isAdminMode && (
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

        {/* FOOTER */}
        <div className="p-4 bg-gray-900/30 border-t border-gray-800">
          
          {/* 🔒 ADMIN TOGGLE: ONLY VISIBLE IF ACTUALLY ADMIN */}
          {isRealAdmin && (
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
                  <p className="text-[10px] text-gray-500">Switch Context</p>
                </div>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 text-gray-600 transition-transform duration-300",
                isAdminMode && "rotate-90 text-red-500"
              )} />
            </div>
          )}

          {/* USER INFO / LOGIN */}
          {user ? (
            <div className="flex items-center justify-between px-2">
               <div className="text-xs text-gray-500 truncate max-w-[120px]">
                 {user.email}
               </div>
               <Link href="/login" className="text-gray-500 hover:text-white transition-colors" title="Logout">
                 <LogOut className="w-4 h-4" />
               </Link>
            </div>
          ) : (
            <Link href="/login">
              <div className="flex items-center justify-center p-3 rounded-lg bg-cyan-900/20 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/40 transition-colors cursor-pointer font-bold text-xs">
                 <LogIn className="w-4 h-4 mr-2" /> Login / Join
              </div>
            </Link>
          )}

        </div>
      </div>
    </>
  );
}