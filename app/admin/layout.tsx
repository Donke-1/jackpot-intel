'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, RefreshCcw, LogIn, AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';

type AdminState = 'booting' | 'authorized' | 'denied' | 'error';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [state, setState] = useState<AdminState>('booting');
  const [softError, setSoftError] = useState<string | null>(null);

  // When already authorized, we do “silent” rechecks and show a small overlay instead of unmounting children.
  const [isRechecking, setIsRechecking] = useState(false);

  // Race / out-of-order protection
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  // Remember if we were authorized before (prevents unmount resets)
  const wasAuthorizedRef = useRef(false);

  const watermark = useMemo(
    () => (
      <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
        <span className="text-[80px] font-black text-gray-900/30 leading-none select-none">ADMIN</span>
      </div>
    ),
    []
  );

  const checkAdmin = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);

    // de-dupe concurrent checks
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const myReqId = ++requestIdRef.current;

    if (silent && wasAuthorizedRef.current) {
      setIsRechecking(true);
    } else {
      setState('booting');
    }
    setSoftError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (myReqId !== requestIdRef.current) return;

      if (userErr) {
        setSoftError(userErr.message);
        setState('error');
        wasAuthorizedRef.current = false;
        return;
      }

      const user = userData?.user ?? null;
      if (!user) {
        setState('denied');
        wasAuthorizedRef.current = false;
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (myReqId !== requestIdRef.current) return;

      if (profileErr) {
        setSoftError(profileErr.message);
        setState('error');
        wasAuthorizedRef.current = false;
        return;
      }

      const ok = Boolean(profile?.is_admin);
      setState(ok ? 'authorized' : 'denied');
      wasAuthorizedRef.current = ok;
    } catch (e: any) {
      if (myReqId !== requestIdRef.current) return;
      setSoftError(e?.message || 'Authorization check failed.');
      setState('error');
      wasAuthorizedRef.current = false;
    } finally {
      if (myReqId === requestIdRef.current) {
        inFlightRef.current = false;
        setIsRechecking(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const safeCheck = async (silent?: boolean) => {
      if (cancelled) return;
      await checkAdmin({ silent });
    };

    // Initial boot check
    safeCheck(false);

    // Only re-check on meaningful auth events (avoid TOKEN_REFRESHED spam)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        safeCheck(true);
      }
    });

    // When tab returns, do a silent re-check (DO NOT unmount children)
    let t: any = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => safeCheck(true), 200);
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
      if (t) clearTimeout(t);
    };
  }, [checkAdmin]);

  // Booting screen only when we are NOT previously authorized
  if (state === 'booting' && !wasAuthorizedRef.current) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
          <span className="text-sm font-mono">Authorizing admin session…</span>
        </div>
      </div>
    );
  }

  if (state === 'error' && !wasAuthorizedRef.current) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">AUTH CHECK FAILED</h1>
        <p className="text-gray-500 mb-6">
          {softError ? `Temporary auth/profile issue: ${softError}` : 'Temporary auth/profile issue. Please retry.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => checkAdmin({ silent: false })} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry
          </Button>

          <Button onClick={() => router.push('/login')} variant="outline" className="border-gray-800 text-gray-200">
            <LogIn className="w-4 h-4 mr-2" /> Go to Login
          </Button>

          <Button onClick={() => router.push('/home')} variant="outline" className="border-gray-800 text-gray-200">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'denied' && !wasAuthorizedRef.current) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h1>
        <p className="text-gray-500 mb-6">This area is restricted to administrators.</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => checkAdmin({ silent: false })} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry
          </Button>

          <Button onClick={() => router.push('/login')} variant="outline" className="border-gray-800 text-gray-200">
            <LogIn className="w-4 h-4 mr-2" /> Go to Login
          </Button>

          <Button onClick={() => router.push('/home')} variant="outline" className="border-gray-800 text-gray-200">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Authorized (or previously authorized)
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Silent recheck overlay (does NOT unmount children) */}
        {isRechecking && (
          <div className="pointer-events-none absolute top-4 right-4 z-50">
            <div className="flex items-center gap-2 bg-black/70 border border-gray-800 rounded-xl px-3 py-2 text-gray-300">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
              <span className="text-[11px] font-mono">Refreshing admin session…</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black p-6 md:p-12 relative">
          {watermark}
          <div className="relative z-10 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
