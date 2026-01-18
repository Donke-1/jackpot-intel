'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Database,
  Layers,
  Users,
  ShieldAlert,
  LogOut,
  ChevronRight,
  UserCog,
  Menu,
  X,
  LogIn,
  ClipboardList,
  LifeBuoy,
  Ticket,
  ShoppingBag,
  Wallet,
  History,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: string;
};

type RoleState = 'loading' | 'ready' | 'error';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [isRealAdmin, setIsRealAdmin] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [roleState, setRoleState] = useState<RoleState>('loading');
  const [softError, setSoftError] = useState<string | null>(null);

  // Race protection / de-dupe
  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const readAdminMode = useCallback(() => {
    try {
      return localStorage.getItem('jackpot_admin_mode') === 'true';
    } catch {
      return false;
    }
  }, []);

  const writeAdminMode = useCallback((value: boolean) => {
    try {
      localStorage.setItem('jackpot_admin_mode', String(value));
    } catch {
      // ignore
    }
  }, []);

  const loadUserAndRole = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const myReqId = ++reqIdRef.current;

    setRoleState('loading');
    setSoftError(null);

    try {
      // Cookie-based auth model: getUser is the reliable source of truth
      const { data: authData, error: authErr } = await supabase.auth.getUser();

      if (myReqId !== reqIdRef.current) return;

      if (authErr) {
        // Don’t wipe admin/user state on transient errors; show soft error
        setSoftError(authErr.message);
        setRoleState('error');
        return;
      }

      const u = authData?.user ?? null;
      setUser(u);

      if (!u) {
        setIsRealAdmin(false);
        setIsAdminMode(false);
        setRoleState('ready');
        return;
      }

      // Read admin flag from profiles (requires RLS to allow user read own profile)
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', u.id)
        .single();

      if (myReqId !== reqIdRef.current) return;

      if (profileErr) {
        // KEY FIX: don’t “fail closed” to non-admin permanently.
        // Keep user loaded; show error state so UI doesn’t randomly drop admin links.
        setSoftError(profileErr.message);
        setRoleState('error');
        return;
      }

      const admin = Boolean(profile?.is_admin);
      setIsRealAdmin(admin);

      if (admin) {
        setIsAdminMode(readAdminMode());
      } else {
        setIsAdminMode(false);
      }

      setRoleState('ready');
    } catch (e: any) {
      if (myReqId !== reqIdRef.current) return;
      setSoftError(e?.message || 'Role check failed.');
      setRoleState('error');
    } finally {
      if (myReqId === reqIdRef.current) {
        inFlightRef.current = false;
      }
    }
  }, [readAdminMode]);

  useEffect(() => {
    loadUserAndRole();

    // Re-check on auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadUserAndRole();
    });

    return () => sub?.subscription?.unsubscribe();
  }, [loadUserAndRole]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleAdminMode = () => {
    if (!isRealAdmin) return;
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    writeAdminMode(newMode);
  };

  const userLinks: NavItem[] = useMemo(
    () => [
      { name: 'Home', href: '/home', icon: Home },
      { name: 'Live Intel', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Jackpot Shop', href: '/jackpots', icon: ShoppingBag, badge: 'NEW' },
      { name: 'My Intel', href: '/dashboard/predictions', icon: Trophy },
      { name: 'Wallet & Credits', href: '/dashboard/wallet', icon: Wallet },
      { name: 'History', href: '/dashboard/history', icon: History },
      { name: 'Support', href: '/support', icon: LifeBuoy },
    ],
    []
  );

  const adminLinks: NavItem[] = useMemo(
    () => [
      { name: 'Data Ingestion', href: '/admin/ingest', icon: Database, badge: 'AI' },
      { name: 'Cycle Manager', href: '/admin/cycles', icon: Layers },
      { name: 'Settling Queue', href: '/admin/settling', icon: ClipboardList },
      { name: 'Pricing', href: '/admin/pricing', icon: Ticket, badge: '$' },
      { name: 'User Base', href: '/admin/users', icon: Users },
      { name: 'Support Inbox', href: '/admin/support', icon: LifeBuoy, badge: 'NEW' },
      { name: 'System Health', href: '/admin/system', icon: ShieldAlert },
    ],
    []
  );

  const isInAdminRoute = pathname?.startsWith('/admin') ?? false;

  // If in /admin/* show admin links; AdminLayout protects access.
  // Otherwise show admin links only when verified admin + admin mode enabled.
  const currentLinks = isInAdminRoute ? adminLinks : isRealAdmin && isAdminMode ? adminLinks : userLinks;

  const onLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdminMode(false);
    setIsRealAdmin(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 border border-gray-700 rounded-lg text-white shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
        />
      )}

      <div
        className={cn(
          'w-64 h-screen bg-black border-r border-gray-800 flex flex-col justify-between fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-6 relative">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 md:hidden text-gray-500 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>

          <Link
            href="/home"
            className="flex items-center space-x-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-black text-white text-lg">J</span>
            </div>
            <span className="font-bold text-xl tracking-tighter text-white">
              JACKPOT<span className="text-cyan-500">INTEL</span>
            </span>
          </Link>

          {user && (
            <div className="mb-4 flex items-center justify-between px-2 gap-2">
              <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest truncate max-w-[160px]">
                {user.email}
              </div>
              {isRealAdmin && (
                <Badge variant="outline" className="text-[9px] border-purple-900 text-purple-300">
                  ADMIN VERIFIED
                </Badge>
              )}
            </div>
          )}

          {/* Soft error banner: don’t hide links, just show warning */}
          {roleState === 'error' && (
            <div className="mb-4 mx-2 p-2 rounded-lg border border-amber-900/40 bg-amber-950/20 text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-[10px] leading-snug">
                <div className="font-black uppercase tracking-widest">Role check issue</div>
                <div className="text-amber-200/80">{softError || 'Temporary problem.'}</div>
                <button
                  onClick={loadUserAndRole}
                  className="mt-1 text-[10px] font-black text-amber-300 underline underline-offset-2 hover:text-amber-200"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

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
                    'flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gray-900 text-white border border-gray-800'
                      : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon
                      className={cn(
                        'w-5 h-5 mr-3 transition-colors',
                        isActive ? 'text-cyan-500' : 'text-gray-500 group-hover:text-gray-300'
                      )}
                    />
                    {item.name}
                  </div>

                  {item.badge && (
                    <Badge variant="neon" className="text-[10px] h-5 px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 bg-gray-900/30 border-t border-gray-800">
          {isRealAdmin && (
            <div
              onClick={toggleAdminMode}
              className="cursor-pointer mb-4 flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-black hover:border-gray-700 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                    isAdminMode ? 'bg-red-900/30 text-red-500' : 'bg-gray-800 text-gray-400'
                  )}
                >
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <p className={cn('text-xs font-bold', isAdminMode ? 'text-red-400' : 'text-gray-300')}>
                    {isAdminMode ? 'Admin Console' : 'User View'}
                  </p>
                  <p className="text-[10px] text-gray-500">Switch Context</p>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-gray-600 transition-transform duration-300',
                  isAdminMode && 'rotate-90 text-red-500'
                )}
              />
            </div>
          )}

          {user ? (
            <div className="flex items-center justify-between px-2">
              <div className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</div>
              <button
                onClick={onLogout}
                className="text-gray-500 hover:text-white transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
