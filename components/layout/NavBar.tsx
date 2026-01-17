'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Menu, X, Zap, LogOut, Wallet, LayoutDashboard, Home, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface NavLink {
  name: string;
  href: string;
  requiredAuth?: boolean;
  hidden?: boolean;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user ?? null;
      setUser(u);

      if (u) {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', u.id).single();
        setCredits(profile?.credits ?? 0);
      } else {
        setCredits(0);
      }
    }

    getUser();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        setCredits(0);
      } else {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', u.id).single();
        setCredits(profile?.credits ?? 0);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const homeHref = user ? '/home' : '/';

  // ✅ add Support here so it appears on mobile menu too
  const navLinks: NavLink[] = useMemo(
    () => [
      { name: 'Home', href: homeHref },
      { name: 'Live Intel', href: '/dashboard', requiredAuth: true },
      { name: 'Results', href: '/results' },
      { name: 'Support', href: '/support' }, // ✅ added
      { name: 'Admin', href: '/admin', requiredAuth: true, hidden: true },
    ],
    [homeHref]
  );

  // Keep navbar hidden inside app shells (dashboard/admin) where Sidebar handles nav
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={homeHref} className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-white fill-current" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter text-white">
              JACKPOT<span className="text-cyan-500">INTEL</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => {
                if (link.requiredAuth && !user) return null;
                if (link.hidden) return null;

                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive ? 'text-cyan-400 bg-cyan-900/10' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    )}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-1 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                  <Wallet className="w-3 h-3 text-green-400" />
                  <span className="text-xs font-bold text-white">{credits} CR</span>
                </div>

                <Link href="/home">
                  <Button className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-9 text-xs">
                    <Home className="w-3 h-3 mr-2" />
                    HOME
                  </Button>
                </Link>

                <Link href="/dashboard">
                  <Button variant="outline" className="border-gray-800 text-gray-200 font-bold h-9 text-xs">
                    <LayoutDashboard className="w-3 h-3 mr-2" />
                    LIVE INTEL
                  </Button>
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white font-medium text-sm">
                  Login
                </Link>
                <Link
                  href="/login"
                  className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(22,163,74,0.4)] transition-all hover:scale-105"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
            >
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-black border-b border-gray-800 animate-in slide-in-from-top-5">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              if (link.requiredAuth && !user) return null;
              if (link.hidden) return null;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  {link.name}
                </Link>
              );
            })}

            {!user ? (
              <div className="mt-4 space-y-2 px-3">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center py-3 border border-gray-700 rounded-lg text-gray-300 font-bold"
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center py-3 bg-green-600 rounded-lg text-white font-bold"
                >
                  Create Account
                </Link>
              </div>
            ) : (
              <div className="mt-4 px-3 border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between text-white font-bold mb-3">
                  <div className="flex items-center">
                    <Wallet className="w-4 h-4 text-green-400 mr-2" />
                    <span>{credits} CR</span>
                  </div>
                  <Link href="/support" onClick={() => setIsOpen(false)} className="text-cyan-300 flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4" />
                    Support
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Link href="/home" onClick={() => setIsOpen(false)}>
                    <Button size="sm" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
                      Home
                    </Button>
                  </Link>
                  <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button size="sm" variant="outline" className="w-full border-gray-800 text-gray-200">
                      Live Intel
                    </Button>
                  </Link>
                </div>

                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full text-left py-2 text-red-400 font-medium hover:bg-gray-800 rounded-md flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
