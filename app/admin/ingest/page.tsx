'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Layers, Plus, RefreshCcw, CheckCircle2, AlertCircle, Clock, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function CycleManager() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [extendingCycles, setExtendingCycles] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetCycleId, setTargetCycleId] = useState<string | null>(null);
  
  const [cycleName, setCycleName] = useState('');
  const [goalType, setGoalType] = useState('1 Bonus Target');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Fetch Inventory & Failed Cycles
  useEffect(() => {
    async function fetchData() {
      // Fetch Jackpots (Available for bundling)
      const { data: inv } = await supabase
        .from('jackpots')
        .select('*')
        .in('status', ['pending', 'active']) 
        .gt('end_date', new Date().toISOString()) 
        .order('start_date', { ascending: true });
      
      // Fetch Cycles needing rescue
      const { data: ext } = await supabase
        .from('cycles')
        .select('*')
        .eq('status', 'pending_extension');
      
      if (inv) setInventory(inv);
      if (ext) setExtendingCycles(ext);
      setLoading(false);
    }
    fetchData();
  }, []);

  // 2. Smart Date Calculation
  const getCycleWindow = () => {
    if (selectedIds.length === 0) return null;
    const selected = inventory.filter(j => selectedIds.includes(j.id));
    const endDates = selected.map(j => new Date(j.end_date).getTime());
    return new Date(Math.max(...endDates));
  };

  const cycleEnd = getCycleWindow();

  // 3. Handle Publishing NEW Cycle
  const handlePublish = async () => {
    if (!cycleName || selectedIds.length === 0) return alert("Name and Selection required");
    setSaving(true);
    try {
      const { data: cycle, error: cycleError } = await supabase
        .from('cycles')
        .insert({
          id: crypto.randomUUID(),
          name: cycleName,
          category: 'Hunter',
          target_desc: goalType,
          status: 'active',
          current_week: inventory.find(j => j.id === selectedIds[0])?.week_number || 0,
          end_date: cycleEnd?.toISOString()
        })
        .select().single();

      if (cycleError) throw cycleError;

      const links = selectedIds.map(jId => ({ cycle_id: cycle.id, jackpot_id: jId }));
      await supabase.from('cycle_jackpots').insert(links);
      await supabase.from('jackpots').update({ status: 'active' }).in('id', selectedIds);

      alert("Cycle Published Successfully!");
      window.location.reload();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  };

  // 4. Handle ROLLOVER (Extension)
  const handleExtendCycle = async () => {
    if (!targetCycleId || selectedIds.length === 0) return alert("Select a Cycle and Jackpots");
    setSaving(true);
    try {
      const links = selectedIds.map(jId => ({ cycle_id: targetCycleId, jackpot_id: jId }));
      await supabase.from('cycle_jackpots').insert(links);

      await supabase
        .from('cycles')
        .update({ status: 'active', end_date: cycleEnd?.toISOString() })
        .eq('id', targetCycleId);

      alert("Cycle Extended! Users access maintained.");
      window.location.reload();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div className="text-white space-y-8 p-8 animate-in fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black uppercase flex items-center">
             <Layers className="mr-3 text-cyan-500" /> Cycle Manager
           </h1>
           <p className="text-gray-400">Construct & Rescue investment cycles.</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/admin/ingest"><Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Ingest</Button></Link>
          {!targetCycleId && (
            <Button onClick={handlePublish} disabled={saving || selectedIds.length === 0} className="bg-green-600 hover:bg-green-500 font-bold px-8">
              {saving ? 'PROCESSING...' : 'PUBLISH NEW CYCLE'}
            </Button>
          )}
        </div>
      </div>

      {/* 🚩 ROLLOVER SECTION */}
      {extendingCycles.length > 0 && (
        <div className="bg-red-900/10 border border-red-500/30 p-6 rounded-2xl space-y-4">
          <h2 className="text-red-500 font-black text-xs uppercase tracking-widest flex items-center">
            <RefreshCcw className="w-4 h-4 mr-2" /> Pending Extensions (Failed Goals)
          </h2>
          <div className="flex flex-wrap gap-3">
            {extendingCycles.map(c => (
              <button key={c.id} onClick={() => setTargetCycleId(targetCycleId === c.id ? null : c.id)}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left min-w-[220px] ${targetCycleId === c.id ? 'border-red-500 bg-red-500/20' : 'border-gray-800 bg-black'}`}>
                <div className="text-sm font-bold">{c.name}</div>
                <div className="text-[10px] text-gray-500">{c.target_desc}</div>
              </button>
            ))}
          </div>
          {targetCycleId && (
            <div className="pt-4 border-t border-red-500/20 flex items-center justify-between">
              <p className="text-xs text-red-300">Select new jackpots from the inventory below to extend this cycle.</p>
              <Button onClick={handleExtendCycle} disabled={saving || selectedIds.length === 0} className="bg-red-600 hover:bg-red-500">CONFIRM ROLLOVER</Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SETTINGS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 space-y-6 sticky top-6">
            {!targetCycleId ? (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Cycle Name</label>
                <input type="text" value={cycleName} onChange={(e) => setCycleName(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-cyan-500 outline-none" placeholder="e.g. Aggressive Strategy A" />
              </div>
            ) : (
              <div className="p-3 bg-red-950/30 border border-red-900 rounded text-red-200 text-xs font-bold">RESCUE MODE ACTIVE</div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Success Goal</label>
              <select value={goalType} onChange={(e) => setGoalType(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-cyan-500 outline-none">
                <option>1 Bonus Target</option>
                <option>2 Bonus Target</option>
                <option>Profit ROI 150%</option>
              </select>
            </div>
            {cycleEnd && (
              <div className="p-4 bg-cyan-950/20 border border-cyan-900/50 rounded-lg">
                <div className="flex items-center text-cyan-400 text-xs font-bold mb-1"><Clock className="w-3 h-3 mr-2" /> AUTO-CALCULATED END</div>
                <div className="text-xl font-mono">{cycleEnd.toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* INVENTORY */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {inventory.map((jackpot) => {
            const isSelected = selectedIds.includes(jackpot.id);
            return (
              <div key={jackpot.id} onClick={() => setSelectedIds(prev => isSelected ? prev.filter(x => x !== jackpot.id) : [...prev, jackpot.id])}
                className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${isSelected ? 'bg-cyan-900/10 border-cyan-500' : 'bg-gray-900/40 border-gray-800 hover:border-gray-600'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{jackpot.platform}</h3>
                  <Badge variant="outline" className="text-[10px]">{jackpot.variant}</Badge>
                </div>
                <div className="text-xs text-gray-500 flex items-center mb-4">
                  <Calendar className="w-3 h-3 mr-1" /> Starts: {new Date(jackpot.start_date).toLocaleDateString()}
                </div>
                <div className="flex justify-between items-center">
                  <Badge className="bg-gray-800">{jackpot.total_games} Games</Badge>
                  <span className="text-[10px] text-gray-600 font-bold uppercase">Strategy: {jackpot.strategy_tag || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}