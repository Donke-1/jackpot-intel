import { redirect } from 'next/navigation';
import LandingClient from './LandingClient';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data?.user) redirect('/home');

  return <LandingClient />;
}
