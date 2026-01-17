'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        const nowIso = new Date().toISOString();

        // If there are items to settle, go straight to Settling Queue.
        const { data, error } = await supabase
          .from('jackpot_groups')
          .select('id,status,end_time')
          .neq('status', 'archived')
          .order('end_time', { ascending: false })
          .limit(25);

        if (error || !data) {
          if (!cancelled) router.replace('/admin/cycles');
          return;
        }

        const now = Date.now();
        const hasSettlingWork = data.some((g: any) => {
          const ended =
            g.end_time && !Number.isNaN(new Date(g.end_time).getTime())
              ? new Date(g.end_time).getTime() <= now
              : false;
          return g.status === 'locked' || g.status === 'settling' || ended;
        });

        if (!cancelled) {
          router.replace(hasSettlingWork ? '/admin/settling' : '/admin/cycles');
        }
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
