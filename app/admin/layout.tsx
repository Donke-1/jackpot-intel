'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';

type AdminState = 'loading' | 'authorized' | 'denied';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AdminState>('loading');

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

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      try {
        setState('loading');

        const { data, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          // If auth is misconfigured or session expired, treat as logged out.
          if (!cancelled) router.push('/login');
          return;
        }

        const user = data?.user;
        if (!user) {
          if (!cancelled) router.push('/login');
          return;
        }

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (profileErr) {
          // If profile is missing (common after DB reset), deny with a safe path.
          if (!cancelled) setState('denied');
          return;
        }

        if (!cancelled) {
          setState(profile?.is_admin ? 'authorized' : 'denied');
        }
      } catch {
        if (!cancelled) setState('denied');
      }
    }

    checkAdmin();

    // Keep state in sync if user logs in/out while on /admin
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, [router]);

  if (state === 'loading') {
    return <div className="min-h-screen bg-black" />;
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h1>
        <p className="text-gray-500 mb-6">This area is restricted to administrators.</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  // Authorized
  return (
    <div className="flex h-screen bg-black">
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
