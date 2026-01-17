'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CycleDetailsRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    const cycleId = Array.isArray(id) ? id[0] : id;

    // Redirect to dashboard and let the dashboard select the cycle.
    // We include a query param so later we can read it and auto-select.
    router.replace(cycleId ? `/dashboard?cycle=${cycleId}` : '/dashboard');
  }, [params, router]);

  return (
    <div className="flex h-[70vh] items-center justify-center bg-black text-gray-500">
      Redirecting…
    </div>
  );
}
