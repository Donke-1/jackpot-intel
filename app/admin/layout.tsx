'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, RefreshCcw, LogIn, AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';

type AdminState = 'loading' | 'authorized' | 'denied' | 'error';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [state, setState] = useState<AdminState>('loading');
  const [softError, setSoftError] = useState<string | null>(null);

  // Protect against race conditions/out-of-order updates
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const watermark = useMemo(
    () => (
      <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
        <span className="text-[80px] font-black text-gray-900/30 leading-none select-none">
          ADMIN
        </span>
      </div>
    ),
    []
  );

  const checkAdmin = useCallback(async () => {
    // De-dupe concurrent checks
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const myReqId = ++requestIdRef.current;

    setState('loading');
    setSoftError(null);

    try {
      // Cookie-based auth model: getUser is the most reliable "am I logged in?"
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (myReqId !== requestIdRef.current) return;

      if (userErr) {
        // Auth check failed (transient network / cookie issue)
        setSoftError(userErr.message);
        setState('error');
        return;
      }

      const user = userData?.user ?? null;
      if (!user) {
        setState('denied');
        return;
      }

      // Check admin flag
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (myReqId !== requestIdRef.current) return;

      if (profileErr) {
        // This is often a transient/RLS/config issue: don't hard "deny" permanently
        setSoftError(profileErr.message);
        setState('error');
        return;
      }

      setState(profile?.is_admin ? 'authorized' : 'denied');
    } catch (e: any) {
      if (myReqId !== requestIdRef.current) return;
      setSoftError(e?.message || 'Authorization check failed.');
      setState('error');
    } finally {
      if (myReqId === requestIdRef.current) {
        inFlightRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const safeCheck = async () => {
      if (cancelled) return;
      await checkAdmin();
    };

    safeCheck();

    // Re-check on auth changes (sign in/out, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      safeCheck();
    });

    // Re-check when tab comes back (avoid spamming with a tiny delay)
    let focusTimer: any = null;
    const schedule = () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => safeCheck(), 150);
    };

    const onFocus = () => schedule();
    const onVis = () => {
      if (document.visibilityState === 'visible') schedule();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [checkAdmin]);

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

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">AUTH CHECK FAILED</h1>
        <p className="text-gray-500 mb-6">
          {softError
            ? `Temporary auth/profile issue: ${softError}`
            : 'Temporary auth/profile issue. Please retry.'}
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

  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h1>
        <p className="text-gray-500 mb-6">
          This area is restricted to administrators.
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
