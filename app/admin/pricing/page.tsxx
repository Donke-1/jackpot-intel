'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Search, Ticket, Save, Loader2, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Row = {
  group_id: string;
  site: string;
  type: string;
  lock_time: string | null;
  status: string;
  variantA?: { id: string; price_credits: number | null };
  variantB?: { id: string; price_credits: number | null };
};

const DEFAULT_PRICE_A = 10;
const DEFAULT_PRICE_B = 10;
const BUNDLE_DISCOUNT_PCT = 0.1;

function fmt(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function normalizePrice(n: number | null | undefined, fallback: number) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function bundlePrice(a: number, b: number) {
  const raw = (a + b) * (1 - BUNDLE_DISCOUNT_PCT);
  return Math.max(1, Math.round(raw));
}

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({}); // variant_id -> text

  async function fetchRows() {
    setLoading(true);

    const { data, error } = await supabase
      .from('jackpot_groups')
      .select(
        `
        id,status,lock_time,
        sites:site_id(name),
        jackpot_types:jackpot_type_id(name),
        jackpot_variants(id,variant,price_credits)
      `
      )
      .neq('status', 'archived')
      .order('lock_time', { ascending: true })
      .limit(200);

    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const r: Row[] = (data as any[]).map((g) => {
      const va = (g.jackpot_variants || []).find((v: any) => v.variant === 'A');
      const vb = (g.jackpot_variants || []).find((v: any) => v.variant === 'B');
      return {
        group_id: g.id,
        status: g.status,
        lock_time: g.lock_time,
        site: g.sites?.name || 'Site',
        type: g.jackpot_types?.name || 'Jackpot',
        variantA: va ? { id: va.id, price_credits: va.price_credits } : undefined,
        variantB: vb ? { id: vb.id, price_credits: vb.price_credits } : undefined,
      };
    });

    // init draft inputs
    const draft: Record<string, string> = {};
    for (const row of r) {
      if (row.variantA) draft[row.variantA.id] = String(row.variantA.price_credits ?? '');
      if (row.variantB) draft[row.variantB.id] = String(row.variantB.price_credits ?? '');
    }
    setDraftPrices(draft);

    setRows(r);
    setLoading(false);
  }

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.site.toLowerCase().includes(s) ||
        r.type.toLowerCase().includes(s) ||
        r.group_id.toLowerCase().includes(s)
    );
  }, [rows, q]);

  function getDraftNumber(variantId?: string, fallback: number = 0) {
    if (!variantId) return fallback;
    const raw = (draftPrices[variantId] ?? '').trim();
    if (raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  async function saveVariantPrice(variantId: string) {
    const raw = (draftPrices[variantId] ?? '').trim();
    const n = raw === '' ? null : Number(raw);

    if (raw !== '' && !Number.isFinite(n)) {
      alert('Enter a number or leave blank.');
      return;
    }
    if (Number.isFinite(n as any) && (n as number) < 0) {
      alert('Price cannot be negative.');
      return;
    }

    setSaving(variantId);

    const { error } = await supabase.from('jackpot_variants').update({ price_credits: n }).eq('id', variantId);

    if (error) {
      alert(error.message);
      setSaving(null);
      return;
    }

    // Update local rows
    setRows((prev) =>
      prev.map((row) => {
        if (row.variantA?.id === variantId) return { ...row, variantA: { ...row.variantA, price_credits: n } };
        if (row.variantB?.id === variantId) return { ...row, variantB: { ...row.variantB, price_credits: n } };
        return row;
      })
    );

    setSaving(null);
  }

  return (
    <div className="space-y-8 text-white animate-in fade-in p-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center">
            <Ticket className="mr-3 text-cyan-500 w-8 h-8" /> Pricing Control
          </h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
            Set per-variant credit prices (A/B). The shop computes A+B as a discounted bundle.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative group">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search site / type / group id…"
              className="pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-2xl focus:border-cyan-500 outline-none w-full md:w-80 text-sm transition-all"
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchRows}
            className="border-gray-800 hover:border-cyan-500 text-gray-300"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="bg-gray-900/20 border border-gray-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-black tracking-[0.2em]">
                <tr>
                  <th className="p-6">Jackpot</th>
                  <th className="p-6">Lock</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Variant A Price</th>
                  <th className="p-6">Variant B Price</th>
                  <th className="p-6">A+B Preview</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800/50">
                {filtered.map((r) => {
                  const aStored = normalizePrice(r.variantA?.price_credits ?? null, DEFAULT_PRICE_A);
                  const bStored = normalizePrice(r.variantB?.price_credits ?? null, DEFAULT_PRICE_B);

                  const aDraft = r.variantA ? getDraftNumber(r.variantA.id, aStored) : aStored;
                  const bDraft = r.variantB ? getDraftNumber(r.variantB.id, bStored) : bStored;

                  const ab = bundlePrice(aDraft, bDraft);

                  return (
                    <tr key={r.group_id} className="hover:bg-cyan-500/[0.02] transition-colors">
                      <td className="p-6">
                        <div className="font-black text-white">
                          {r.site} — {r.type}
                        </div>
                        <div className="text-[10px] text-gray-600 font-mono">{r.group_id}</div>
                      </td>

                      <td className="p-6 text-gray-400 text-sm">{fmt(r.lock_time)}</td>

                      <td className="p-6">
                        <Badge variant="outline" className="border-gray-800 text-gray-300 text-[10px]">
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>

                      <td className="p-6">
                        {r.variantA ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={draftPrices[r.variantA.id] ?? ''}
                              onChange={(e) =>
                                setDraftPrices((p) => ({ ...p, [r.variantA!.id]: e.target.value }))
                              }
                              className="w-28 bg-black border border-gray-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                              placeholder={`${DEFAULT_PRICE_A}`}
                            />
                            <Button
                              variant="outline"
                              onClick={() => saveVariantPrice(r.variantA!.id)}
                              disabled={saving === r.variantA.id}
                              className={cn(
                                'border-gray-800 hover:border-cyan-500',
                                saving === r.variantA.id && 'opacity-60'
                              )}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-sm">Missing</span>
                        )}
                      </td>

                      <td className="p-6">
                        {r.variantB ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={draftPrices[r.variantB.id] ?? ''}
                              onChange={(e) =>
                                setDraftPrices((p) => ({ ...p, [r.variantB!.id]: e.target.value }))
                              }
                              className="w-28 bg-black border border-gray-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                              placeholder={`${DEFAULT_PRICE_B}`}
                            />
                            <Button
                              variant="outline"
                              onClick={() => saveVariantPrice(r.variantB!.id)}
                              disabled={saving === r.variantB.id}
                              className={cn(
                                'border-gray-800 hover:border-cyan-500',
                                saving === r.variantB.id && 'opacity-60'
                              )}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-sm">Missing</span>
                        )}
                      </td>

                      <td className="p-6">
                        <div className="text-sm font-black text-cyan-300">{ab} credits</div>
                        <div className="text-[10px] text-gray-600">
                          Uses {Math.round(BUNDLE_DISCOUNT_PCT * 100)}% bundle discount
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-800 text-[11px] text-gray-600">
            Leave blank to fall back to default pricing in the app (A={DEFAULT_PRICE_A}, B={DEFAULT_PRICE_B}, A+B computed with {Math.round(BUNDLE_DISCOUNT_PCT * 100)}% discount).
          </div>
        </div>
      )}
    </div>
  );
}
