'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  LifeBuoy,
  Search,
  Mail,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Ticket = {
  id: string;
  user_id: string | null;
  email: string;
  category: string | null;
  subject: string | null;
  message: string;
  status: 'open' | 'pending' | 'closed';
  created_at: string;
  updated_at: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function AdminSupportInbox() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'open' | 'pending' | 'closed'>('open');

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [updating, setUpdating] = useState(false);

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id,user_id,email,category,subject,message,status,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      alert(`Failed to load tickets: ${error.message}`);
      setTickets([]);
      setLoading(false);
      return;
    }

    setTickets((data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return (
        t.email.toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [tickets, query, status]);

  async function setTicketStatus(ticketId: string, newStatus: Ticket['status']) {
    setUpdating(true);
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      alert(`Update failed: ${error.message}`);
      setUpdating(false);
      return;
    }

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t)));
    setSelected((prev) => (prev && prev.id === ticketId ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : prev));
    setUpdating(false);
  }

  function statusBadge(s: Ticket['status']) {
    if (s === 'open') {
      return <Badge variant="outline" className="border-amber-900 text-amber-300 text-[10px]">OPEN</Badge>;
    }
    if (s === 'pending') {
      return <Badge variant="outline" className="border-cyan-900 text-cyan-300 text-[10px]">PENDING</Badge>;
    }
    return <Badge variant="outline" className="border-gray-800 text-gray-400 text-[10px]">CLOSED</Badge>;
  }

  return (
    <div className="space-y-8 text-white animate-in fade-in p-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center">
            <LifeBuoy className="mr-3 text-cyan-500 w-8 h-8" /> Support Inbox
          </h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Incoming tickets</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative group">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email / subject / id…"
              className="pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-2xl focus:border-cyan-500 outline-none w-full md:w-80 text-sm transition-all"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="bg-black border border-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-200 outline-none focus:border-cyan-500"
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>

          <Button variant="outline" onClick={fetchTickets} className="border-gray-800 hover:border-cyan-500">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 bg-gray-900/20 border border-gray-800 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Inbox className="w-4 h-4" /> Tickets
            </div>
            <Badge variant="outline" className="text-[10px] border-gray-800 text-gray-400">
              {filtered.length}
            </Badge>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-600">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-600">
              No tickets found.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {filtered.map((t) => {
                const active = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={cn(
                      'w-full text-left p-4 border-b border-gray-800/70 hover:bg-gray-900/40 transition-colors',
                      active && 'bg-cyan-900/10'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-white truncate">{t.email}</div>
                      {statusBadge(t.status)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 truncate">
                      {t.subject || '(No subject)'} • {t.category || 'General'}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-2 flex items-center justify-between">
                      <span>{fmtDate(t.created_at)}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 bg-gray-900/20 border border-gray-800 rounded-3xl p-6">
          {!selected ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-gray-600 text-center">
              <AlertTriangle className="w-10 h-10 opacity-30 mb-3" />
              <div className="font-bold uppercase text-xs tracking-widest">Select a ticket</div>
              <div className="text-xs mt-2">Choose a ticket from the left to view details.</div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black text-white">{selected.subject || 'Support Ticket'}</div>
                    {statusBadge(selected.status)}
                  </div>
                  <div className="text-sm text-gray-400">
                    <span className="font-bold text-gray-200">{selected.email}</span>
                    {' • '}
                    {selected.category || 'General'}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Created: {fmtDate(selected.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Updated: {fmtDate(selected.updated_at)}
                    </span>
                    <span className="font-mono">#{selected.id}</span>
                  </div>
                </div>

                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mt-6 bg-black/40 border border-gray-800 rounded-2xl p-5">
                <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">
                  Message
                </div>
                <div className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                  {selected.message}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3">
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent(
                      `Re: ${selected.subject || 'Support Ticket'} (#${selected.id})`
                    )}`}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-black transition-colors"
                    title="Reply via email"
                  >
                    <Mail className="w-4 h-4" /> Reply (Email)
                  </a>

                  <Button
                    variant="outline"
                    disabled={updating}
                    onClick={() => setTicketStatus(selected.id, 'pending')}
                    className="border-gray-800 hover:border-cyan-500"
                  >
                    Set Pending
                  </Button>

                  <Button
                    variant="outline"
                    disabled={updating}
                    onClick={() => setTicketStatus(selected.id, 'closed')}
                    className="border-gray-800 hover:border-gray-600"
                  >
                    Close
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  {selected.status === 'closed' ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-4 h-4" /> Closed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Awaiting reply
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
