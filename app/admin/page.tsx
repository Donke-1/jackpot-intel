'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fn()
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export default function AdminRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        // Stabilize auth (mobile resume / refresh spam)
        const { data: sess } = await supabase.auth.getSession();
        let user = sess?.session?.user ?? null;

        if (!user) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          user = refreshed?.session?.user ?? null;
        }

        if (!user) {
          if (!cancelled) router.replace('/login');
          return;
        }

        // Prevent endless spinner on slow networks
        const result = await withTimeout(
          () =>
            supabase
              .from('jackpot_groups')
              .select('id,status,end_time')
              .neq('status', 'archived')
              .order('end_time', { ascending: false })
              .limit(25),
          6000
        );

        if (cancelled) return;

        const { data, error } = result as any;

        if (error || !data) {
          router.replace('/admin/cycles');
          return;
        }

        const now = Date.now();
        const hasSettlingWork = (data as any[]).some((g) => {
          const end = g.end_time ? new Date(g.end_time).getTime() : NaN;
          const ended = Number.isFinite(end) ? end <= now : false;
          return g.status === 'locked' || g.status === 'settling' || ended;
        });

        router.replace(hasSettlingWork ? '/admin/settling' : '/admin/cycles');
      } catch {
        if (!cancelled) router.replace('/admin/cycles');
      }
    }

    go();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-gray-500 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
      <p className="text-sm font-mono animate-pulse">Initializing Command Interface...</p>
    </div>
  );
}
