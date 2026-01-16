'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Zap, Shield, Lock, User, Mail, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Only for Sign Up

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // --- SIGN UP LOGIC ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username }, // Sending username to DB trigger
          },
        });
        if (error) throw error;
        // Check if auto-confirm is on or off (Supabase default is usually confirm email)
        alert('Account created! You can now log in.');
        setMode('signin');
      } else {
        // --- SIGN IN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Success -> Redirect
        router.push('/dashboard');
        router.refresh(); // Ensure Navbar updates
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      {/* Background Ambience */}
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
            {mode === 'signin' ? 'Access the protocol dashboard.' : 'Join the variance protection syndicate.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Username Field (Sign Up Only) */}
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

          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email Coordinates</label>
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

          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Security Key</label>
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
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] mt-2"
          >
            {loading ? 'AUTHENTICATING...' : (mode === 'signin' ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT')}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {mode === 'signin' ? "Don't have an identity?" : "Already an operative?"}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
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