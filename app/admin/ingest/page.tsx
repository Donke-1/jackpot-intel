'use client';

import React, { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ArrowRight,
  BrainCircuit,
  ClipboardCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type StrategyChoice = 'A' | 'B';

type ParsedMatch = {
  match_id: number; // 1..N (used as seq)
  match_name: string;
  home_team: string;
  away_team: string;
  kickoff: string; // ISO
  prediction: string; // '1'|'X'|'2'
  confidence?: number; // 1-100
  reason?: string;
};

const BOOKIE_CONFIG: Record<string, { name: string; games: number; typeCode: string }[]> = {
  SportPesa: [
    { name: 'Mega Jackpot Pro', games: 17, typeCode: 'mega' },
    { name: 'Midweek Jackpot', games: 13, typeCode: 'midweek' },
  ],
  Mozzart: [
    { name: 'Super Grand Jackpot', games: 20, typeCode: 'grand' },
    { name: 'Super Daily Jackpot', games: 16, typeCode: 'daily' },
  ],
  SportyBet: [{ name: 'Jackpot 12', games: 12, typeCode: 'jackpot12' }],
  Shabiki: [
    { name: 'Power 17', games: 17, typeCode: 'power17' },
    { name: 'Power 13', games: 13, typeCode: 'power13' },
  ],
  Betika: [
    { name: 'Grand Jackpot', games: 17, typeCode: 'grand' },
    { name: 'Midweek Jackpot', games: 15, typeCode: 'midweek' },
    { name: 'Sababisha', games: 10, typeCode: 'sababisha' },
  ],
};

function cleanGeminiJson(input: string) {
  return input.replace(/```json/g, '').replace(/```/g, '').trim();
}

function parseMaybeNumber(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function IntelligenceIngest() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [platform, setPlatform] = useState('SportPesa');
  const [variantIndex, setVariantIndex] = useState(0);

  // Strategy A/B (variant code)
  const [strategyCode, setStrategyCode] = useState<StrategyChoice>('A');
  const strategyLabel =
    strategyCode === 'A' ? 'Strategy A (Variance Shield)' : 'Strategy B (Aggressive Sword)';

  // Optional ingestion metadata
  const [externalRef, setExternalRef] = useState('');
  const [drawDate, setDrawDate] = useState(''); // ISO date/time or date
  const [prizePoolKes, setPrizePoolKes] = useState(''); // numeric text

  const [rawInput, setRawInput] = useState('');
  const [geminiJson, setGeminiJson] = useState('');
  const [parsedGames, setParsedGames] = useState<ParsedMatch[]>([]);

  const currentVariant = BOOKIE_CONFIG[platform][variantIndex];

  const prompt = useMemo(() => {
    return `
I have a list of matches for the ${platform} ${currentVariant.name} (${currentVariant.games} Games).
Please analyze them using "${strategyLabel}".

INPUT MATCHES:
${rawInput}

INSTRUCTIONS:
Return a RAW JSON object (no markdown) with a "matches" array.
Each object must have:
- "match_id" (1 to ${currentVariant.games})
- "match_name"
- "home_team"
- "away_team"
- "kickoff" (ISO 8601)
- "prediction" (1/X/2)
- "confidence" (1-100)
- "reason" (short)
`.trim();
  }, [platform, currentVariant.name, currentVariant.games, rawInput, strategyLabel]);

  const generatePrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    alert('AI Intelligence Prompt Copied! Paste this into Gemini.');
    setStep(2);
  };

  const handleParse = () => {
    try {
      const cleanJson = cleanGeminiJson(geminiJson);
      const data = JSON.parse(cleanJson);
      if (!data?.matches || !Array.isArray(data.matches)) {
        alert('JSON Format Error. Expected { "matches": [...] }');
        return;
      }
      setParsedGames(data.matches);
      setStep(3);
    } catch {
      alert('JSON Format Error. Please ensure Gemini returned valid JSON.');
    }
  };

  /**
   * Ensures a site row exists for the given platform string.
   * - code will be normalized lowercase slug.
   */
  async function ensureSite(platformName: string) {
    const code = platformName.trim().toLowerCase().replace(/\s+/g, '-');

    const { data: existing } = await supabase
      .from('sites')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('sites')
      .insert({ code, name: platformName, is_active: true })
      .select('*')
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Ensures a jackpot_type exists for that site.
   */
  async function ensureJackpotType(siteId: string, typeCode: string, typeName: string) {
    const { data: existing } = await supabase
      .from('jackpot_types')
      .select('*')
      .eq('site_id', siteId)
      .eq('code', typeCode)
      .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('jackpot_types')
      .insert({
        site_id: siteId,
        code: typeCode,
        name: typeName,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Finds or creates a jackpot_group for this site/type + (external_ref/draw_date).
   * We try to match on external_ref if provided, else on draw_date if provided, else always create.
   */
  async function getOrCreateJackpotGroup(args: {
    site_id: string;
    jackpot_type_id: string;
    external_ref?: string | null;
    draw_date?: string | null;
    lock_time: string;
    end_time: string;
    prize_pool?: number | null;
  }) {
    const { site_id, jackpot_type_id, external_ref, draw_date, lock_time, end_time, prize_pool } = args;

    // Attempt to find existing group if we have an identifier
    if (external_ref) {
      const { data: existing } = await supabase
        .from('jackpot_groups')
        .select('*')
        .eq('site_id', site_id)
        .eq('jackpot_type_id', jackpot_type_id)
        .eq('external_ref', external_ref)
        .maybeSingle();

      if (existing) {
        // Update lock/end/prize if needed
        const { data: updated, error: updErr } = await supabase
          .from('jackpot_groups')
          .update({
            lock_time,
            end_time,
            ...(prize_pool != null ? { prize_pool } : {}),
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (updErr) throw updErr;
        return updated;
      }
    } else if (draw_date) {
      const { data: existing } = await supabase
        .from('jackpot_groups')
        .select('*')
        .eq('site_id', site_id)
        .eq('jackpot_type_id', jackpot_type_id)
        .eq('draw_date', draw_date)
        .maybeSingle();

      if (existing) {
        const { data: updated, error: updErr } = await supabase
          .from('jackpot_groups')
          .update({
            lock_time,
            end_time,
            ...(prize_pool != null ? { prize_pool } : {}),
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (updErr) throw updErr;
        return updated;
      }
    }

    // Create new group
    const { data: created, error } = await supabase
      .from('jackpot_groups')
      .insert({
        site_id,
        jackpot_type_id,
        external_ref: external_ref || null,
        draw_date: draw_date || null,
        lock_time,
        end_time,
        status: 'draft',
        currency: 'KES',
        prize_pool: prize_pool ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Ensures variant A/B exists for the group.
   */
  async function ensureVariant(groupId: string, variant: StrategyChoice, strategyTag: string) {
    const { data: existing } = await supabase
      .from('jackpot_variants')
      .select('*')
      .eq('group_id', groupId)
      .eq('variant', variant)
      .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('jackpot_variants')
      .insert({
        group_id: groupId,
        variant,
        strategy_tag: strategyTag,
      })
      .select('*')
      .single();

    if (error) throw error;
    return created;
  }

  const handleSaveToInventory = async () => {
    setLoading(true);
    try {
      if (!parsedGames.length) {
        alert('No parsed games to save.');
        return;
      }

      // Compute lock/end times from kickoff list
      const kickoffMs = parsedGames.map((g) => new Date(g.kickoff).getTime());
      const minKickoff = Math.min(...kickoffMs);
      const maxKickoff = Math.max(...kickoffMs);

      if (!Number.isFinite(minKickoff) || !Number.isFinite(maxKickoff)) {
        alert('Invalid kickoff times in parsed data.');
        return;
      }

      const lock_time = new Date(minKickoff).toISOString();
      const end_time = new Date(maxKickoff + 3 * 3600_000).toISOString();

      const prizePool = prizePoolKes.trim() ? parseMaybeNumber(prizePoolKes.trim()) : null;
      if (prizePoolKes.trim() && prizePool == null) {
        alert('Prize pool must be a number (KES).');
        return;
      }

      // 1) Ensure site + jackpot type exist
      const site = await ensureSite(platform);
      const jt = await ensureJackpotType(site.id, currentVariant.typeCode, currentVariant.name);

      // 2) Find or create jackpot group
      const group = await getOrCreateJackpotGroup({
        site_id: site.id,
        jackpot_type_id: jt.id,
        external_ref: externalRef.trim() || null,
        draw_date: drawDate.trim() ? new Date(drawDate).toISOString() : null,
        lock_time,
        end_time,
        prize_pool: prizePool,
      });

      // 3) Ensure variant A or B exists (depending on selected strategy)
      const variant = await ensureVariant(group.id, strategyCode, strategyLabel);

      // 4) Upsert fixtures for the group (by seq)
      //    We insert/update by unique(group_id, seq). Since Supabase upsert conflict needs constraint name
      //    or columns, we use "group_id,seq" (works when a unique constraint exists).
      const fixtureRows = parsedGames.map((g) => ({
        group_id: group.id,
        seq: g.match_id,
        match_name: g.match_name || null,
        home_team: g.home_team || null,
        away_team: g.away_team || null,
        kickoff_time: g.kickoff,
        status: 'scheduled',
      }));

      const { data: fixtures, error: fxErr } = await supabase
        .from('fixtures')
        .upsert(fixtureRows, { onConflict: 'group_id,seq' })
        .select('id,group_id,seq');

      if (fxErr) throw fxErr;
      if (!fixtures || fixtures.length === 0) {
        alert('Failed to create fixtures.');
        return;
      }

      // Map seq -> fixture_id
      const fixtureBySeq = new Map<number, string>();
      for (const f of fixtures) {
        fixtureBySeq.set(Number((f as any).seq), (f as any).id);
      }

      // 5) Upsert predictions for this variant (by unique(variant_id, fixture_id))
      const predictionRows = parsedGames.map((g) => {
        const fixtureId = fixtureBySeq.get(g.match_id);
        if (!fixtureId) {
          throw new Error(`Missing fixture created for match_id=${g.match_id}`);
        }
        return {
          variant_id: variant.id,
          fixture_id: fixtureId,
          pick: g.prediction,
          confidence: g.confidence ?? null,
          rationale: g.reason ?? null,
        };
      });

      const { error: prErr } = await supabase
        .from('predictions')
        .upsert(predictionRows, { onConflict: 'variant_id,fixture_id' });

      if (prErr) throw prErr;

      alert(
        `Committed successfully!\n\nGroup: ${platform} / ${currentVariant.name}\nVariant: ${strategyCode}\nFixtures: ${parsedGames.length}`
      );

      // Reset
      setStep(1);
      setRawInput('');
      setGeminiJson('');
      setParsedGames([]);
      // keep platform selections as-is for speed
    } catch (err: any) {
      alert(err?.message || 'Failed to commit inventory.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 animate-in fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <BrainCircuit className="w-8 h-8 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              Intelligence Ingest
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
              Jackpot Inventory Loader (Variant {strategyCode})
            </p>
          </div>
        </div>
        <Link href="/admin/cycles">
          <Button variant="outline" className="border-gray-800 text-gray-400 hover:text-white">
            GO TO CYCLE MANAGER <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* STEP HUD */}
      <div className="flex items-center space-x-4 bg-gray-900/20 p-4 rounded-2xl border border-gray-800/50">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center space-x-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all',
                step >= s ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-600'
              )}
            >
              {step > s ? <ClipboardCheck className="w-4 h-4" /> : s}
            </div>
            <span
              className={cn(
                'text-[10px] font-black uppercase tracking-widest',
                step === s ? 'text-white' : 'text-gray-600'
              )}
            >
              {s === 1 ? 'Configure' : s === 2 ? 'AI Parse' : 'Commit'}
            </span>
            {s < 3 && <div className="w-8 h-[1px] bg-gray-800 mx-2" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6 bg-gray-900/40 p-8 rounded-[2rem] border border-gray-800 shadow-2xl">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Platform (Site)
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                >
                  {Object.keys(BOOKIE_CONFIG).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Jackpot Type
                </label>
                <select
                  value={variantIndex}
                  onChange={(e) => setVariantIndex(parseInt(e.target.value, 10))}
                  className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                >
                  {BOOKIE_CONFIG[platform].map((v, i) => (
                    <option key={i} value={i}>
                      {v.name} ({v.games}G)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Prediction Variant
                </label>
                <select
                  value={strategyCode}
                  onChange={(e) => setStrategyCode(e.target.value as StrategyChoice)}
                  className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                >
                  <option value="A">Variant A — Strategy A (Variance Shield)</option>
                  <option value="B">Variant B — Strategy B (Aggressive Sword)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    External Ref (Optional)
                  </label>
                  <input
                    value={externalRef}
                    onChange={(e) => setExternalRef(e.target.value)}
                    placeholder="e.g. SP-Week-03"
                    className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    Draw Date (Optional)
                  </label>
                  <input
                    value={drawDate}
                    onChange={(e) => setDrawDate(e.target.value)}
                    placeholder="2026-01-20 or ISO"
                    className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Prize Pool (KES) (Optional)
                </label>
                <input
                  value={prizePoolKes}
                  onChange={(e) => setPrizePoolKes(e.target.value)}
                  placeholder="e.g. 2450000"
                  className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <Button
              onClick={generatePrompt}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-8 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              <Sparkles className="w-4 h-4 mr-2" /> GENERATE AI COMMAND
            </Button>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
              Raw Fixture Data
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste match list with dates/times here..."
              className="flex-1 bg-black border-2 border-gray-800 p-6 rounded-[2rem] text-xs font-mono text-cyan-500/70 focus:border-cyan-500/40 outline-none resize-none"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in slide-in-from-right-4">
          <textarea
            value={geminiJson}
            onChange={(e) => setGeminiJson(e.target.value)}
            placeholder="Paste the RAW JSON output from Gemini here..."
            className="h-96 w-full bg-black border-2 border-gray-800 p-6 rounded-[2rem] text-xs font-mono text-green-500 outline-none focus:border-green-500/30"
          />
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 py-6 rounded-2xl"
            >
              RE-CONFIGURE
            </Button>
            <Button
              onClick={handleParse}
              className="flex-[2] bg-green-600 hover:bg-green-500 font-black py-6 rounded-2xl"
            >
              VALIDATE INTELLIGENCE
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95">
          <div className="bg-cyan-900/10 border border-cyan-500/20 p-8 rounded-[2.5rem] text-center space-y-4">
            <Zap className="w-12 h-12 text-cyan-500 mx-auto animate-pulse" />
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
              Ready for Deployment
            </h2>
            <p className="text-gray-400 text-sm">
              Parsed <span className="text-white font-bold">{parsedGames.length} matches</span>{' '}
              for the {platform} {currentVariant.name}. Variant{' '}
              <span className="text-white font-bold">{strategyCode}</span>.
            </p>
          </div>
          <Button
            onClick={handleSaveToInventory}
            disabled={loading}
            className="w-full bg-cyan-600 py-8 font-black rounded-[2rem] text-xl shadow-2xl"
          >
            {loading ? 'STORING DATA...' : 'COMMIT TO INVENTORY'}
          </Button>
        </div>
      )}
    </div>
  );
}
