'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, RefreshCcw, LogIn } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [softError, setSoftError] = useState<string | null>(null);

  async function checkAdmin() {
    setLoading(true);
    setSoftError(null);

    try {
      // 1) Try session first (more reliable on mobile resume)
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData?.session?.user ?? null;

      // 2) If missing user, attempt refresh session once
      if (!user) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        user = refreshed?.session?.user ?? null;
      }

      // 3) If still no user -> go login
      if (!user) {
        setAuthorized(false);
        setLoading(false);
        router.push('/login');
        return;
      }

      // 4) Check profile.is_admin
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profErr) {
        // RLS or temporary network error. Don’t hang—show recover UI.
        setAuthorized(false);
        setSoftError(profErr.message);
        setLoading(false);
        return;
      }

      if (profile?.is_admin === true) {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }

      setLoading(false);
    } catch (e: any) {
      setAuthorized(false);
      setSoftError(e?.message || 'Authorization check failed.');
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAdmin();

    // Re-check when auth state changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    // Mobile browsers suspend tabs; re-check on resume
    const onFocus = () => checkAdmin();
    const onVis = () => {
      if (document.visibilityState === 'visible') checkAdmin();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sub?.subscription?.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading state: show something visible + retry option
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-gray-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <div className="text-sm font-mono">Authorizing admin session…</div>
        </div>
      </div>
    );
  }

  // Access denied or error
  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h1>
        <p className="text-gray-500 mb-6">
          {softError ? `Auth check error: ${softError}` : 'This area is restricted to admins.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={checkAdmin} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry
          </Button>

          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="border-gray-800 text-gray-200"
          >
            <LogIn className="w-4 h-4 mr-2" /> Go to Login
          </Button>

          <Button
            onClick={() => router.push('/home')}
            variant="outline"
            className="border-gray-800 text-gray-200"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Authorized admin layout
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black p-6 md:p-12 relative">
          <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
            <span className="text-[80px] font-black text-gray-900/30 leading-none select-none">ADMIN</span>
          </div>
          <div className="relative z-10 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
