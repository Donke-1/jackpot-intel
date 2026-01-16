'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check Profile for is_admin flag
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profile && profile.is_admin) {
        setAuthorized(true);
      } else {
        // Not admin
        setAuthorized(false);
      }
      setLoading(false);
    }
    checkAdmin();
  }, [router]);

  if (loading) return <div className="min-h-screen bg-black" />;

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h1>
        <p className="text-gray-500 mb-6">This area is restricted to High Command.</p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}