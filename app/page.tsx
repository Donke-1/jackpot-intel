import { redirect } from 'next/navigation';
import LandingClient from './LandingClient';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // Logged-in users (including admin) go to the real home console
  if (data?.user) {
    redirect('/home');
  }

  // Guests see marketing landing page
  return <LandingClient />;
}
