'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Mail, MessageSquare, Send, Tag } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const CATEGORY_OPTIONS = [
  'General',
  'Credits & Billing',
  'Cycle Access',
  'Results / Settlement',
  'Bug Report',
  'Suggestion',
] as const;

type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

export default function SupportClient() {
  const searchParams = useSearchParams();

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<CategoryOption>('General');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    const qCat = searchParams.get('category');
    if (!qCat) return;
    if ((CATEGORY_OPTIONS as readonly string[]).includes(qCat)) {
      setCategory(qCat as CategoryOption);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user ?? null;
      setUser(u);
      if (u?.email) setEmail(u.email);
      setLoadingUser(false);
    });
  }, []);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const m = message.trim();
    return e.length > 3 && e.includes('@') && m.length >= 10;
  }, [email, message]);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);

    if (!canSubmit) {
      setError('Please enter a valid email and a message (10+ characters).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: user?.id ?? null,
        email: email.trim(),
        category,
        subject: subject.trim() || null,
        message: message.trim(),
        status: 'open',
      };

      const { data, error: insErr } = await supabase
        .from('support_tickets')
        .insert(payload)
        .select('id')
        .single();

      if (insErr) throw insErr;

      setSuccessId(data.id);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Support</h1>
            <p className="text-gray-500 text-sm">Send a message to the admin. We’ll respond via email.</p>
          </div>
          <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 font-bold text-sm">
            Back to Dashboard →
          </Link>
        </div>

        <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-6">
          {successId && (
            <div className="mb-5 bg-green-900/20 border border-green-900/40 rounded-2xl p-4 text-green-200">
              <div className="font-black">Ticket submitted ✅</div>
              <div className="text-[12px] text-green-200/80 mt-1">
                Reference ID: <span className="font-mono">{successId}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 bg-red-900/20 border border-red-900/40 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div className="text-red-200 text-sm">{error}</div>
            </div>
          )}

          <form onSubmit={submitTicket} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full bg-black border border-gray-800 text-white pl-10 pr-4 py-3 rounded-xl outline-none focus:border-cyan-500 transition-all"
                />
              </div>
              {!loadingUser && user?.email && (
                <div className="text-[11px] text-gray-600">
                  Logged in as <span className="text-gray-400 font-bold">{user.email}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Category</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryOption)}
                    className="w-full bg-black border border-gray-800 text-white pl-10 pr-4 py-3 rounded-xl outline-none focus:border-cyan-500 transition-all"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary (optional)"
                  className="w-full bg-black border border-gray-800 text-white px-4 py-3 rounded-xl outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Message</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  placeholder="Describe the issue. Include cycle name, site/type, and what you expected vs what happened."
                  className="w-full bg-black border border-gray-800 text-white pl-10 pr-4 py-3 rounded-xl outline-none focus:border-cyan-500 transition-all resize-none"
                />
              </div>
              <div className="text-[11px] text-gray-600">
                Tip: If this is about a cycle/jackpot, include the exact name you saw on the dashboard.
              </div>
            </div>

            <button
              type="submit"
              disabled={!(email.trim().includes('@') && message.trim().length >= 10) || submitting}
              className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'SENDING…' : 'SEND TO SUPPORT'}
              <Send className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-gray-600 text-center">
              This form is for support requests only. Abuse may be blocked.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
