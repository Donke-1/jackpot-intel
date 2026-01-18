'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AdminRootRedirect() {
  const router = useRouter();

  // Protect against out-of-order async results
  const reqIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const myReqId = ++reqIdRef.current;

    // If something stalls (network hiccup), don’t hang forever
    const hardFallback = setTimeout(() => {
      if (!cancelled && myReqId === reqIdRef.current) {
        router.replace('/admin/cycles');
      }
    }, 6000);

    async function go() {
      try {
        // Pull a small recent window of groups and decide where to route.
        // Keeping it simple avoids brittle SQL/or() logic and still works with your current schema.
        const { data, error } = await supabase
          .from('jackpot_groups')
          .select('id,status,end_time')
          .neq('status', 'archived')
          .order('end_time', { ascending: false })
          .limit(30);

        if (cancelled || myReqId !== reqIdRef.current) return;

        if (error || !data) {
          router.replace('/admin/cycles');
          return;
        }

        const now = Date.now();

        const hasSettlingWork = data.some((g: any) => {
          const t = g?.end_time ? new Date(g.end_time).getTime() : NaN;
          const ended = Number.isFinite(t) ? t <= now : false;

          // If it’s locked/settling OR already past end_time, route to settling
          return g?.status === 'locked' || g?.status === 'settling' || ended;
        });

        router.replace(hasSettlingWork ? '/admin/settling' : '/admin/cycles');
      } catch {
        if (!cancelled && myReqId === reqIdRef.current) {
          router.replace('/admin/cycles');
        }
      }
    }

    go();

    return () => {
      cancelled = true;
      clearTimeout(hardFallback);
    };
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-gray-500 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      <p className="text-sm font-mono animate-pulse">Initializing Command Interface…</p>
    </div>
  );
}
