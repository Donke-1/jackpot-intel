import { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}
