import { Suspense } from 'react';
import SupportClient from './SupportClient';

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SupportClient />
    </Suspense>
  );
}
