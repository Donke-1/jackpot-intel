'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreditCard, Zap, LifeBuoy, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function PaymentsComingSoonPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email ?? null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10 pb-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/wallet" className="text-cyan-400 hover:text-cyan-300 font-bold text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Wallet
          </Link>
          <Badge variant="protocol" className="w-fit">
            <ShieldCheck className="w-3 h-3 mr-1" /> SECURE
          </Badge>
        </div>

        <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <CreditCard className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">Payments</h1>
              <p className="text-gray-500 text-sm mt-1">
                M-Pesa / Card checkout is coming soon. For now, you can top up manually.
              </p>
            </div>
          </div>

          <div className="bg-black/40 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 uppercase font-black tracking-widest">
              <Zap className="w-4 h-4 text-yellow-400" /> Manual Top-up
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              Send payment to the admin and include your account email. The admin will award credits to your wallet.
            </p>

            <div className="flex items-center justify-between bg-black/40 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail className="w-4 h-4" />
                <span>Your email:</span>
              </div>
              <div className="text-white font-mono font-bold">
                {userEmail ?? 'Login to show email'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link href="/support" className="w-full">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl py-6">
                  <LifeBuoy className="w-4 h-4 mr-2" /> Contact Admin
                </Button>
              </Link>

              <Link href="/dashboard/wallet" className="w-full">
                <Button variant="outline" className="w-full border-gray-800 text-gray-200 rounded-xl py-6">
                  Return to Vault
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-gray-600">
              Tip: In the support message, include the amount paid and preferred credit quantity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
