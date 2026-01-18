'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, RefreshCcw, LogIn } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';

type AdminState = 'loading' | 'authorized' | 'denied';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AdminState>('loading');
  const [softError, setSoftError] = useState<string | null>(null);

  const watermark = useMemo(
    () => (
      <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
        <span className="text-[80px] font-black text-gray-900/30 leading-none select-none">ADMIN</span>
      </div>
    ),
    []
  );

  async function checkAdmin() {
    setState('loading');
    setSoftError(null);

    try {
      // Prefer session (more resilient on mobile resume)
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData?.session?.user ?? null;

      // If user missing, try refreshing session once
      if (!user) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        user = refreshed?.session?.user ?? null;
      }

      if (!user) {
        // Not logged in
        setState('denied');
        return;
      }

      // Check admin flag
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileErr) {
        setSoftError(profileErr.message);
        setState('denied');
        return;
      }

      setState(profile?.is_admin ? 'authorized' : 'denied');
    } catch (e: any) {
      setSoftError(e?.message || 'Authorization check failed.');
      setState('denied');
    }
  }

  useEffect(() => {
    let cancelled = false;

    const safeCheck = async () => {
      if (cancelled) return;
      await checkAdmin();
    };

    safeCheck();

    // Re-check on auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      safeCheck();
    });

    // ✅ Critical for mobile: re-check when tab comes back
    const onFocus = () => safeCheck();
    const onVis = () => {
      if (document.visibilityState === 'visible') safeCheck();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
          <span className="text-sm font-mono">Authorizing admin session…</span>
        </div>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h1>
        <p className="text-gray-500 mb-6">
          {softError ? `Auth check error: ${softError}` : 'This area is restricted to administrators.'}
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

  // Authorized
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black p-6 md:p-12 relative">
          {watermark}
          <div className="relative z-10 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
