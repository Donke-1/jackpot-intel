'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function SiteAccordion() {
  return (
    <div className="border border-amber-500/30 bg-amber-900/10 rounded-2xl p-5 text-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-300" />
        <div>
          <div className="font-black uppercase text-sm tracking-widest">
            This component is deprecated
          </div>
          <div className="text-sm text-amber-200/80 mt-1">
            The app moved from the old <code>events/predictions</code> schema to{" "}
            <code>jackpot_groups + A/B variants</code>. Use the new dashboard cycle view instead.
          </div>
          <div className="mt-3">
            <Link href="/dashboard" className="text-cyan-300 font-black hover:text-cyan-200">
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
