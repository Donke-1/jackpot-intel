import { redirect } from 'next/navigation';
import LandingClient from './LandingClient';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase.auth.getUser();

    if (!error && data?.user) {
      redirect('/home');
    }
  } catch {
    // If auth check fails, treat as guest and show landing (prevents hard hangs)
  }

  return <LandingClient />;
}
