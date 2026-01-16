'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 🚦 Traffic Control
    // Instead of showing the old monolithic console, send them to the new Cycle Manager
    router.replace('/admin/cycles');
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-gray-500 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
      <p className="text-sm font-mono animate-pulse">Initializing Command Interface...</p>
    </div>
  );
}