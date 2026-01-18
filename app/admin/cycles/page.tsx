'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Layers, Calendar, Ticket, Clock, RefreshCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

type VariantCode = 'A' | 'B';

type InventoryGroup = {
  id: string;
  status: string;
  draw_date: string | null;
  lock_time: string | null;
  end_time: string | null;
  prize_pool: number | null;

  sites?: { name: string; code: string } | null;
  jackpot_types?: { name: string; code: string } | null;

  jackpot_variants?: Array<{
    id: string;
    variant: VariantCode;
    strategy_tag: string | null;
  }>;
};

type CycleRow = {
  id: string;
  name: string;
  status: string;
  credit_cost: number | null;
  is_free: boolean | null;
  max_end_at: string | null;
  goal_settings: any;
};

type SelectionMode = 'both' | 'A' | 'B';
type GroupSelection = {
  groupId: string;
  mode: SelectionMode;
};

function formatDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString();
}

export default function CycleManager() {
  const [inventory, setInventory] = useState<InventoryGroup[]>([]);
  const [waitingCycles, setWaitingCycles] = useState<CycleRow[]>([]);
  const [selected, setSelected] = useState<GroupSelection[]>([]);
  const [targetCycleId, setTargetCycleId] = useState<string | null>(null);

  const [cycleName, setCycleName] = useState('');
  const [goalType, setGoalType] = useState('1 Bonus Target');
  const [creditCost, setCreditCost] = useState(1);
  const [isFree, setIsFree] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [softError, setSoftError] = useState<string | null>(null);

  // Race protection
  const reqIdRef = useRef(0);

  const selectedMap = useMemo(() => {
    const m = new Map<string, SelectionMode>();
    for (const s of selected) m.set(s.groupId, s.mode);
    return m;
  }, [selected]);

  const toggleGroup = (groupId: string, mode: SelectionMode) => {
    setSelected((prev) => {
      const existing = prev.find((p) => p.groupId === groupId);
      if (!existing) return [...prev, { groupId, mode }];

      // If same mode clicked again -> remove selection
      if (existing.mode === mode) return prev.filter((p) => p.groupId !== groupId);

      // Otherwise update mode
      return prev.map((p) => (p.groupId === groupId ? { ...p, mode } : p));
    });
  };

  const selectedGroups = useMemo(() => {
    if (selected.length === 0) return [];
    return inventory.filter((g) => selectedMap.has(g.id));
  }, [inventory, selectedMap, selected.length]);

  const cycleEnd = useMemo(() => {
    if (!selectedGroups.length) return null;
    const times = selectedGroups
      .map((g) => (g.end_time ? new Date(g.end_time).getTime() : null))
      .filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
    if (!times.length) return null;
    return new Date(Math.max(...times));
  }, [selectedGroups]);

  const buildGoalSettings = () => {
    return {
      goalType,
      pairedDefault: true,
      notes: 'MVP goal settings; expand later',
    };
  };

  const fetchData = useCallback(async () => {
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setSoftError(null);

    try {
      // Inventory = jackpot groups (not archived).
      const invPromise = supabase
        .from('jackpot_groups')
        .select(
          `
          id,status,draw_date,lock_time,end_time,prize_pool,
          sites:site_id(name,code),
          jackpot_types:jackpot_type_id(name,code),
          jackpot_variants(id,variant,strategy_tag)
        `
        )
        .neq('status', 'archived')
        .order('lock_time', { ascending: true });

      // Waiting cycles
      const cycPromise = supabase
        .from('cycles')
        .select('id,name,status,credit_cost,is_free,max_end_at,goal_settings')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      const [{ data: inv, error: invErr }, { data: cyc, error: cycErr }] = await Promise.all([
        invPromise,
        cycPromise,
      ]);

      if (myReqId !== reqIdRef.current) return;

      if (invErr) {
        console.error(invErr);
        setSoftError(invErr.message);
      }
      if (cycErr) {
        console.error(cycErr);
        setSoftError((prev) => prev || cycErr.message);
      }

      setInventory((inv as any) || []);
      setWaitingCycles((cyc as any) || []);
    } catch (e: any) {
      if (myReqId !== reqIdRef.current) return;
      setSoftError(e?.message || 'Failed to load cycle manager data.');
      setInventory([]);
      setWaitingCycles([]);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchData();
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  async function createCycleAndAttachVariants(cycleId: string) {
    if (!cycleId) throw new Error('Missing cycle id.');
    if (selected.length === 0) throw new Error('Select at least one jackpot group.');

    const links: Array<{
      cycle_id: string;
      group_id: string;
      variant_id: string;
      is_paired: boolean;
    }> = [];

    for (const s of selected) {
      const group = inventory.find((g) => g.id === s.groupId);
      if (!group || !group.jackpot_variants || group.jackpot_variants.length === 0) {
        throw new Error('Selected group has no variants. Ingest A/B first.');
      }

      const varA = group.jackpot_variants.find((v) => v.variant === 'A');
      const varB = group.jackpot_variants.find((v) => v.variant === 'B');

      const wantA = s.mode === 'both' || s.mode === 'A';
      const wantB = s.mode === 'both' || s.mode === 'B';

      if (wantA && !varA) throw new Error('Variant A missing for a selected jackpot group.');
      if (wantB && !varB) throw new Error('Variant B missing for a selected jackpot group.');

      if (wantA && varA) {
        links.push({
          cycle_id: cycleId,
          group_id: group.id,
          variant_id: varA.id,
          is_paired: s.mode === 'both',
        });
      }

      if (wantB && varB) {
        links.push({
          cycle_id: cycleId,
          group_id: group.id,
          variant_id: varB.id,
          is_paired: s.mode === 'both',
        });
      }
    }

    const { error: linkErr } = await supabase.from('cycle_variants').insert(links);
    if (linkErr) throw linkErr;
  }

  const handlePublish = async () => {
    if (!cycleName.trim()) return alert('Cycle name required.');
    if (selected.length === 0) return alert('Select at least one jackpot group.');

    setSaving(true);
    try {
      const { data: cycle, error: cycleErr } = await supabase
        .from('cycles')
        .insert({
          name: cycleName.trim(),
          category: 'Hunter',
          status: 'active',
          goal_settings: buildGoalSettings(),
          credit_cost: isFree ? 0 : Math.max(0, creditCost || 0),
          is_free: isFree,
          max_end_at: cycleEnd ? cycleEnd.toISOString() : null,
        })
        .select('id')
        .single();

      if (cycleErr) throw cycleErr;
      if (!cycle?.id) throw new Error('Cycle insert succeeded but no id returned.');

      await createCycleAndAttachVariants(cycle.id);

      alert('Cycle Published Successfully!');
      // Refresh data without hard reload
      setSelected([]);
      setTargetCycleId(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to publish cycle.');
    } finally {
      setSaving(false);
    }
  };

  const handleExtendCycle = async () => {
    if (!targetCycleId) return alert('Select a waiting cycle to extend.');
    if (selected.length === 0) return alert('Select jackpot groups to attach.');

    setSaving(true);
    try {
      await createCycleAndAttachVariants(targetCycleId);

      const { error: updErr } = await supabase
        .from('cycles')
        .update({
          status: 'active',
          max_end_at: cycleEnd ? cycleEnd.toISOString() : null,
        })
        .eq('id', targetCycleId);

      if (updErr) throw updErr;

      alert('Cycle Extended Successfully!');
      setSelected([]);
      setTargetCycleId(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to extend cycle.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
          <span className="text-sm font-mono">Loading cycle manager…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white space-y-8 animate-in fade-in pb-20 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase flex items-center tracking-tighter italic">
            <Layers className="mr-3 text-cyan-500 w-8 h-8" /> Deployment Center
          </h1>
          <p className="text-gray-400 text-sm">
            Bundle jackpot groups. Choose Variant A/B pairing and set credit cost.
          </p>
          {softError && (
            <div className="mt-3 text-[11px] text-amber-300 bg-amber-950/20 border border-amber-900/40 rounded-xl p-3">
              {softError}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={saving}
            className="border-gray-800"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>

          <Link href="/admin/ingest">
            <Button variant="outline" className="border-gray-800">
              Ingest
            </Button>
          </Link>

          {!targetCycleId && (
            <Button
              onClick={handlePublish}
              disabled={saving || selected.length === 0}
              className="bg-green-600 hover:bg-green-500 px-8 font-black"
            >
              {saving ? 'LAUNCHING...' : 'PUBLISH CYCLE'}
            </Button>
          )}
        </div>
      </div>

      {/* Rescue mode = waiting cycles */}
      {waitingCycles.length > 0 && (
        <div className="bg-amber-900/10 border border-amber-500/30 p-6 rounded-2xl space-y-4">
          <h2 className="text-amber-500 font-black text-xs uppercase tracking-widest flex items-center">
            <RefreshCcw className="w-4 h-4 mr-2" /> Waiting Cycles
          </h2>
          <div className="flex flex-wrap gap-3">
            {waitingCycles.map((c) => (
              <button
                key={c.id}
                onClick={() => setTargetCycleId(targetCycleId === c.id ? null : c.id)}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left min-w-[220px] ${
                  targetCycleId === c.id ? 'border-amber-500 bg-amber-500/20' : 'border-gray-800 bg-black'
                }`}
              >
                <div className="text-sm font-bold">{c.name}</div>
                <div className="text-[10px] text-gray-500">{c.goal_settings?.goalType || '—'}</div>
              </button>
            ))}
          </div>

          {targetCycleId && (
            <div className="pt-4 border-t border-amber-500/20 flex items-center justify-between gap-4">
              <p className="text-xs text-amber-300 italic">
                Select new jackpot groups below to attach and resume this cycle.
              </p>
              <Button
                onClick={handleExtendCycle}
                disabled={saving || selected.length === 0}
                className="bg-amber-600 hover:bg-amber-500 font-black"
              >
                {saving ? 'EXECUTING...' : 'EXECUTE EXTEND'}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left config */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900/40 p-6 rounded-3xl border border-gray-800 space-y-6 sticky top-6">
            {!targetCycleId ? (
              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">
                  Cycle Name
                </label>
                <input
                  type="text"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500"
                  placeholder="e.g. Weekend Mega Hunter"
                />
              </div>
            ) : (
              <div className="p-3 bg-amber-950/30 border border-amber-900 rounded-xl text-amber-200 text-xs font-bold text-center italic">
                RESCUE MODE ACTIVE
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                Free Cycle
              </label>
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5 accent-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">
                Pricing (Credits)
              </label>
              <div className="relative">
                <Ticket className="absolute left-3 top-3 w-4 h-4 text-cyan-500" />
                <input
                  type="number"
                  value={creditCost}
                  disabled={isFree}
                  min={0}
                  onChange={(e) => {
                    const n = parseInt(e.target.value || '0', 10);
                    setCreditCost(Number.isFinite(n) ? Math.max(0, n) : 0);
                  }}
                  className="w-full bg-black border border-gray-800 p-3 pl-10 rounded-xl text-white outline-none focus:border-cyan-500 disabled:opacity-40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">
                Success Goal
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 appearance-none"
              >
                <option>1 Bonus Target</option>
                <option>2 Bonus Target</option>
                <option>Full Jackpot Hit</option>
              </select>
            </div>

            {cycleEnd && (
              <div className="p-4 bg-cyan-950/20 border border-cyan-900/50 rounded-2xl">
                <div className="flex items-center text-cyan-400 text-[10px] font-black mb-1 uppercase tracking-widest">
                  <Clock className="w-3 h-3 mr-2" /> Timeline Maximum
                </div>
                <div className="text-xl font-mono text-white">{cycleEnd.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {inventory.map((g) => {
            const mode = selectedMap.get(g.id);
            const isSelected = Boolean(mode);

            const siteName = g.sites?.name || 'Site';
            const typeName = g.jackpot_types?.name || 'Jackpot';
            const status = g.status;

            const hasA = Boolean(g.jackpot_variants?.some((v) => v.variant === 'A'));
            const hasB = Boolean(g.jackpot_variants?.some((v) => v.variant === 'B'));

            return (
              <div
                key={g.id}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'bg-cyan-900/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'bg-gray-900/20 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-black text-white italic">{siteName}</h3>
                    <div className="text-[11px] text-gray-400">{typeName}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {status}
                  </Badge>
                </div>

                <div className="text-[10px] text-gray-500 flex items-center mb-4 uppercase font-bold">
                  <Calendar className="w-3 h-3 mr-1" /> Locks: {formatDate(g.lock_time)}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="bg-gray-800 border-none">
                    End: {formatDate(g.end_time)}
                  </Badge>
                  {g.prize_pool != null && (
                    <Badge variant="secondary" className="bg-gray-800 border-none">
                      Pool: {Number(g.prize_pool).toLocaleString()} KES
                    </Badge>
                  )}
                </div>

                {/* Variant selector */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={!hasA || saving}
                    onClick={() => toggleGroup(g.id, 'A')}
                    className={`flex-1 border-gray-800 ${
                      mode === 'A' ? 'border-cyan-500 text-white' : 'text-gray-400'
                    }`}
                  >
                    A {hasA ? '' : '(missing)'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!hasB || saving}
                    onClick={() => toggleGroup(g.id, 'B')}
                    className={`flex-1 border-gray-800 ${
                      mode === 'B' ? 'border-cyan-500 text-white' : 'text-gray-400'
                    }`}
                  >
                    B {hasB ? '' : '(missing)'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!hasA || !hasB || saving}
                    onClick={() => toggleGroup(g.id, 'both')}
                    className={`flex-1 border-gray-800 ${
                      mode === 'both' ? 'border-cyan-500 text-white' : 'text-gray-400'
                    }`}
                  >
                    A+B
                  </Button>
                </div>

                {isSelected && (
                  <div className="mt-3 text-[10px] text-cyan-300 font-bold uppercase tracking-widest">
                    Selected: {mode}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
