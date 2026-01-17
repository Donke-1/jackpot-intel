'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Zap, Lock, User, Mail, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    // If already logged in, go to dashboard
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        router.push('/dashboard');
        router.refresh();
      }
    });
  }, [router]);

  async function upsertUsername(userId: string, emailValue: string, usernameValue: string) {
    const name = usernameValue.trim();
    if (!name) return;

    // Profiles RLS allows user to update own row.
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: emailValue,
          username: name,
        },
        { onConflict: 'id' }
      );

    if (error) {
      // Not fatal for login; just log.
      // eslint-disable-next-line no-console
      console.error('Profile username upsert failed:', error);
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username }, // kept (useful if you later read auth metadata)
          },
        });

        if (error) throw error;

        // If email confirmation is ON, session may be null.
        // If it's OFF, session may exist immediately.
        const createdUser = data?.user;

        if (createdUser) {
          await upsertUsername(createdUser.id, email, username);
        }

        setInfo(
          'Account created. If email confirmation is enabled, check your inbox to verify before signing in.'
        );
        setMode('signin');
        setPassword('');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        const signedInUser = data?.user;
        if (signedInUser) {
          // If user had chosen a username before, keep it; if not, this is harmless.
          // Also ensures a profile row exists after DB resets.
          await upsertUsername(signedInUser.id, email, username);
        }

        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-900/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-gray-900/50 border border-gray-800 p-8 rounded-2xl backdrop-blur-md relative z-10 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gray-800 rounded-xl mb-4 shadow-inner">
            <Zap className="w-8 h-8 text-cyan-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'signin' ? 'Welcome Back, Hunter.' : 'Initialize Identity'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {mode === 'signin' ? 'Access the protocol dashboard.' : 'Create an account to unlock cycles and predictions.'}
          </p>
        </div>

        {/* Info Message */}
        {info && (
          <div className="mb-6 bg-cyan-900/20 border border-cyan-900/50 p-3 rounded-lg">
            <p className="text-sm text-cyan-200">{info}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Codename / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Neo, Maverick, Shadow"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] mt-2 disabled:opacity-60"
          >
            {loading ? 'AUTHENTICATING...' : mode === 'signin' ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setInfo(null);
              }}
              className="ml-2 text-cyan-400 hover:text-cyan-300 font-bold underline decoration-cyan-500/30 underline-offset-4"
            >
              {mode === 'signin' ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
