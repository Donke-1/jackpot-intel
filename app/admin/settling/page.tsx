'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Save, Loader2, Search, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type GroupRow = {
  id: string;
  status: string;
  lock_time: string | null;
  end_time: string | null;
  created_at: string | null;
  prize_pool: number | null;
  currency: string | null;
  site_id: string;
  jackpot_type_id: string;
  sites?: { name: string; code: string } | null;
  jackpot_types?: { name: string; code: string } | null;
};

type FixtureRow = {
  id: string;
  group_id: string;
  seq: number;
  match_name: string | null;
  home_team: string | null;
  away_team: string | null;
  kickoff_time: string;
  status: 'scheduled' | 'finished' | 'void' | 'postponed' | 'abandoned';
  result: string | null; // '1'|'X'|'2'
  final_score: string | null;
};

type VariantRow = {
  id: string;
  group_id: string;
  variant: 'A' | 'B';
  strategy_tag: string | null;
};

type PredRow = {
  variant_id: string;
  fixture_id: string;
  pick: string;
};

function formatDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString();
}

function inferLabel(f: FixtureRow) {
  if (f.match_name) return f.match_name;
  if (f.home_team && f.away_team) return `${f.home_team} vs ${f.away_team}`;
  return `Match ${f.seq}`;
}

// Very simple tier resolver.
// Expected tiers object shape (examples):
// { "12": 20000, "13": {"kind":"percent","pct":0.03}, "17": {"kind":"full"} }
// If no exact key, uses the highest numeric key <= correctCount.
function computeTierAndPayout(args: {
  correctCount: number;
  prizePool: number | null;
  tiers: any;
}): { tier_hit: string | null; payout_estimated: number | null } {
  const { correctCount, prizePool, tiers } = args;
  if (!tiers || typeof tiers !== 'object') return { tier_hit: null, payout_estimated: null };

  const keys = Object.keys(tiers)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (keys.length === 0) return { tier_hit: null, payout_estimated: null };

  const exact = tiers[String(correctCount)];
  let chosenKey: number | null = Number.isFinite(Number(correctCount)) ? correctCount : null;

  if (exact === undefined) {
    const fallback = keys.filter((k) => k <= correctCount);
    chosenKey = fallback.length ? fallback[fallback.length - 1] : null;
  }

  if (chosenKey == null) return { tier_hit: null, payout_estimated: null };

  const entry = tiers[String(chosenKey)];
  const tier_hit =
    (entry && typeof entry === 'object' && typeof entry.label === 'string' && entry.label) ||
    `${chosenKey}_correct`;

  if (entry == null) return { tier_hit, payout_estimated: null };
  if (typeof entry === 'number') return { tier_hit, payout_estimated: entry };

  if (typeof entry === 'string') {
    const n = Number(entry);
    return Number.isFinite(n) ? { tier_hit, payout_estimated: n } : { tier_hit, payout_estimated: null };
  }

  if (typeof entry === 'object') {
    const kind = entry.kind;
    if (kind === 'fixed') {
      const amt = Number(entry.amount);
      return Number.isFinite(amt) ? { tier_hit, payout_estimated: amt } : { tier_hit, payout_estimated: null };
    }
    if (kind === 'percent') {
      if (prizePool == null) return { tier_hit, payout_estimated: null };
      const pct = Number(entry.pct);
      return Number.isFinite(pct) ? { tier_hit, payout_estimated: prizePool * pct } : { tier_hit, payout_estimated: null };
    }
    if (kind === 'full') {
      return { tier_hit, payout_estimated: prizePool ?? null };
    }
  }

  return { tier_hit, payout_estimated: null };
}

export default function SettlingQueuePage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);

  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [preds, setPreds] = useState<PredRow[]>([]);
  const [tiers, setTiers] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    async function fetchGroups() {
      setLoading(true);

      const { data, error } = await supabase
        .from('jackpot_groups')
        .select(
          `
          id,status,lock_time,end_time,created_at,prize_pool,currency,site_id,jackpot_type_id,
          sites:site_id(name,code),
          jackpot_types:jackpot_type_id(name,code)
        `
        )
        .neq('status', 'archived')
        .order('end_time', { ascending: false })
        .limit(50);

      if (error) {
        console.error(error);
        setGroups([]);
        setLoading(false);
        return;
      }

      const now = Date.now();
      const filtered = ((data as any[]) || []).filter((g) => {
        const end = g.end_time ? new Date(g.end_time).getTime() : null;
        const ended = typeof end === 'number' && Number.isFinite(end) ? end <= now : false;
        return ['locked', 'settling'].includes(g.status) || ended;
      });

      setGroups(filtered as any);
      setLoading(false);
    }

    fetchGroups();
  }, []);

  const computedScores = useMemo(() => {
    const fixtureResult = new Map<string, { status: string; result: string | null }>();
    fixtures.forEach((f) => fixtureResult.set(f.id, { status: f.status, result: f.result }));

    const byVariant = new Map<string, number>();
    for (const p of preds) {
      const fr = fixtureResult.get(p.fixture_id);
      if (!fr) continue;
      if (fr.status !== 'finished') continue;
      if (!fr.result) continue;
      if (p.pick === fr.result) {
        byVariant.set(p.variant_id, (byVariant.get(p.variant_id) || 0) + 1);
      }
    }

    const out: Record<'A' | 'B', number> = { A: 0, B: 0 };
    for (const v of variants) {
      out[v.variant] = byVariant.get(v.id) || 0;
    }
    return out;
  }, [fixtures, preds, variants]);

  async function loadGroup(group: GroupRow) {
    setLoading(true);
    setSelectedGroup(group);

    if (group.status === 'locked') {
      await supabase.from('jackpot_groups').update({ status: 'settling' }).eq('id', group.id);
    }

    const { data: fx, error: fxErr } = await supabase
      .from('fixtures')
      .select('id,group_id,seq,match_name,home_team,away_team,kickoff_time,status,result,final_score')
      .eq('group_id', group.id)
      .order('seq', { ascending: true });

    if (fxErr) {
      console.error(fxErr);
      setFixtures([]);
    } else {
      setFixtures((fx as any) || []);
    }

    const { data: vs, error: vsErr } = await supabase
      .from('jackpot_variants')
      .select('id,group_id,variant,strategy_tag')
      .eq('group_id', group.id)
      .order('variant', { ascending: true });

    if (vsErr) {
      console.error(vsErr);
      setVariants([]);
      setPreds([]);
      setLoading(false);
      return;
    }

    setVariants((vs as any) || []);

    const variantIds = ((vs as any[]) || []).map((v) => v.id);
    if (variantIds.length) {
      const { data: ps, error: psErr } = await supabase
        .from('predictions')
        .select('variant_id,fixture_id,pick')
        .in('variant_id', variantIds);

      if (psErr) {
        console.error(psErr);
        setPreds([]);
      } else {
        setPreds((ps as any) || []);
      }
    } else {
      setPreds([]);
    }

    if ((group as any).payout_tiers_override) {
      setTiers((group as any).payout_tiers_override);
    } else {
      const { data: rule } = await supabase
        .from('payout_rules')
        .select('tiers')
        .eq('site_id', group.site_id)
        .eq('jackpot_type_id', group.jackpot_type_id)
        .maybeSingle();

      setTiers(rule?.tiers ?? null);
    }

    setLoading(false);
  }

  function setFixtureResult(fixtureId: string, result: '1' | 'X' | '2') {
    setFixtures((prev) =>
      prev.map((f) =>
        f.id === fixtureId
          ? { ...f, result, status: f.status === 'void' || f.status === 'postponed' ? f.status : 'finished' }
          : f
      )
    );
  }

  function setFixtureStatus(fixtureId: string, status: FixtureRow['status']) {
    setFixtures((prev) =>
      prev.map((f) =>
        f.id === fixtureId
          ? { ...f, status, result: status === 'void' || status === 'postponed' ? null : f.result }
          : f
      )
    );
  }

  const missingResultsCount = useMemo(() => {
    return fixtures.filter((f) => f.status === 'finished' && !f.result).length;
  }, [fixtures]);

  const handleSaveProgress = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const updates = fixtures.map((f) => ({
        id: f.id,
        status: f.status,
        result: f.result,
        final_score: f.final_score,
      }));

      const { error } = await supabase.from('fixtures').upsert(updates);
      if (error) throw error;

      await supabase.from('jackpot_groups').update({ status: 'settling' }).eq('id', selectedGroup.id);
      alert('Progress saved.');
    } catch (err: any) {
      alert(err?.message || 'Failed to save progress.');
    } finally {
      setSaving(false);
    }
  };

  const handleLockResults = async () => {
    if (!selectedGroup) return;

    if (missingResultsCount > 0) {
      alert('Some finished fixtures are missing results. Set result or mark fixture void/postponed.');
      return;
    }

    setLocking(true);
    try {
      // 1) Persist fixtures
      const updates = fixtures.map((f) => ({
        id: f.id,
        status: f.status,
        result: f.result,
        final_score: f.final_score,
      }));
      const { error: fxErr } = await supabase.from('fixtures').upsert(updates);
      if (fxErr) throw fxErr;

      // 2) Compute and write variant settlements
      const { data: auth } = await supabase.auth.getUser();
      const adminId = auth?.user?.id ?? null;

      const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
      const predByVariant = new Map<string, PredRow[]>();
      preds.forEach((p) => {
        if (!predByVariant.has(p.variant_id)) predByVariant.set(p.variant_id, []);
        predByVariant.get(p.variant_id)!.push(p);
      });

      const settlements = variants.map((v) => {
        const ps = predByVariant.get(v.id) || [];
        let correct = 0;

        for (const p of ps) {
          const fx = fixtureById.get(p.fixture_id);
          if (!fx) continue;
          if (fx.status !== 'finished') continue;
          if (!fx.result) continue;
          if (p.pick === fx.result) correct += 1;
        }

        const tierInfo = computeTierAndPayout({
          correctCount: correct,
          prizePool: selectedGroup.prize_pool ?? null,
          tiers,
        });

        return {
          variant_id: v.id,
          correct_count: correct,
          tier_hit: tierInfo.tier_hit,
          payout_estimated: tierInfo.payout_estimated,
          payout_actual: null,
          settled_at: new Date().toISOString(),
          settled_by: adminId,
        };
      });

      const { error: setErr } = await supabase.from('variant_settlements').upsert(settlements);
      if (setErr) throw setErr;

      // 3) Mark group settled
      const { error: grpErr } = await supabase
        .from('jackpot_groups')
        .update({ status: 'settled' })
        .eq('id', selectedGroup.id);

      if (grpErr) throw grpErr;

      // 4) Update cycles based on this group settlement (BEST-OF included variants)
      const { data: settleData, error: settleErr } = await supabase.rpc('settle_group_and_update_cycles', {
        p_group_id: selectedGroup.id,
      });

      if (settleErr) {
        alert(`Results locked, but cycle update failed: ${settleErr.message}`);
      } else {
        alert(
          `Results locked.\nCycles updated: ${settleData?.cycles_updated ?? 0}\nCycles won now: ${settleData?.cycles_won_now ?? 0}`
        );
      }

      window.location.reload();
    } catch (err: any) {
      alert(err?.message || 'Failed to lock results.');
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="space-y-8 text-white p-4 md:p-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center uppercase tracking-tighter italic">
            <Trophy className="mr-3 text-yellow-500 w-8 h-8" /> Settlement War Room
          </h1>
          <p className="text-gray-400 text-sm">
            Enter outcomes per fixture, then lock results. Cycles update automatically after settlement.
          </p>
        </div>

        {selectedGroup && (
          <div className="flex gap-3">
            <Button
              onClick={handleSaveProgress}
              disabled={saving || locking}
              className="bg-gray-200 hover:bg-white text-black py-6 px-6 font-black"
            >
              {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
              SAVE
            </Button>
            <Button
              onClick={handleLockResults}
              disabled={saving || locking}
              className="bg-yellow-600 hover:bg-yellow-500 text-black py-6 px-8 font-black shadow-[0_0_20px_rgba(234,179,8,0.25)]"
            >
              {locking ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
              LOCK RESULTS
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
            <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Settling Queue</h3>

            {loading && (
              <div className="text-gray-600 text-xs font-bold uppercase flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}

            <div className="space-y-2">
              {groups.map((g) => {
                const active = selectedGroup?.id === g.id;
                const site = g.sites?.name || 'Site';
                const type = g.jackpot_types?.name || 'Jackpot';

                return (
                  <div
                    key={g.id}
                    onClick={() => loadGroup(g)}
                    className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                      active ? 'bg-yellow-500/10 border-yellow-500' : 'bg-black border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="font-bold text-sm">{site}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                      {type} • {g.status}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">Ends: {formatDate(g.end_time)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedGroup && (
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] uppercase font-black text-gray-500 tracking-widest">A/B Score (live)</div>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-black">
                  A: {computedScores.A}
                </Badge>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-black">
                  B: {computedScores.B}
                </Badge>
              </div>
              {missingResultsCount > 0 ? (
                <div className="flex items-center gap-2 text-[11px] text-amber-300">
                  <AlertTriangle className="w-4 h-4" /> Missing results: {missingResultsCount}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> Ready to lock
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selectedGroup ? (
            <div className="h-96 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-600">
              <Search className="w-12 h-12 mb-4 opacity-10" />
              <p className="uppercase tracking-widest text-xs font-bold">Select a jackpot group from the sidebar</p>
            </div>
          ) : (
            <div className="bg-gray-900/20 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-black/50 text-[10px] uppercase font-black text-gray-500">
                  <tr>
                    <th className="p-5">#</th>
                    <th className="p-5">Fixture</th>
                    <th className="p-5 text-center">Status</th>
                    <th className="p-5 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {fixtures.map((f) => (
                    <tr key={f.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-5 font-mono text-gray-500 text-sm">{f.seq}</td>

                      <td className="p-5">
                        <div className="font-bold text-white text-sm">{inferLabel(f)}</div>
                        <div className="text-[10px] text-gray-500 uppercase mt-1 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(f.kickoff_time)}
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex justify-center gap-2">
                          {(['finished', 'void', 'postponed'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => setFixtureStatus(f.id, st)}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border-2 ${
                                f.status === st
                                  ? st === 'finished'
                                    ? 'bg-green-500 border-green-400 text-black'
                                    : st === 'void'
                                    ? 'bg-red-500 border-red-400 text-black'
                                    : 'bg-amber-500 border-amber-400 text-black'
                                  : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex justify-center space-x-2">
                          {(['1', 'X', '2'] as const).map((res) => (
                            <button
                              key={res}
                              onClick={() => setFixtureResult(f.id, res)}
                              disabled={f.status !== 'finished'}
                              className={`w-12 h-12 rounded-xl text-sm font-black transition-all border-2 disabled:opacity-30 ${
                                f.result === res
                                  ? 'bg-yellow-500 border-yellow-400 text-black shadow-lg scale-110'
                                  : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'
                              }`}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                        {f.status !== 'finished' && (
                          <div className="text-[9px] text-gray-600 text-center mt-1">Result disabled</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
