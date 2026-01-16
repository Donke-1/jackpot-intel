'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Layers, Plus, Calendar, Ticket, Target, Clock, RefreshCcw } from 'lucide-react';
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
  const [creditCost, setCreditCost] = useState(1); // 👈 NEW: Dynamic Pricing
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Inventory
      const { data: inv } = await supabase
        .from('jackpots')
        .select('*')
        .in('status', ['pending', 'active']) 
        .gt('end_date', new Date().toISOString()) 
        .order('start_date', { ascending: true });
      
      // 2. Fetch Cycles needing Rescue (Rollover)
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

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getCycleWindow = () => {
    if (selectedIds.length === 0) return null;
    const selected = inventory.filter(j => selectedIds.includes(j.id));
    const endDates = selected.map(j => new Date(j.end_date).getTime());
    return new Date(Math.max(...endDates));
  };

  const cycleEnd = getCycleWindow();

  // PUBLISH NEW CYCLE logic
  const handlePublish = async () => {
    if (!cycleName || selectedIds.length === 0) return alert("Name and Selection required");
    setSaving(true);
    try {
      const selectedJackpots = inventory.filter(j => selectedIds.includes(j.id));
      const { data: cycle, error: cycleError } = await supabase
        .from('cycles')
        .insert({
          id: crypto.randomUUID(),
          name: cycleName,
          category: 'Hunter', // Set to Hunter Protocol
          target_desc: goalType,
          credit_cost: creditCost, // 👈 Saved to DB
          status: 'active',
          current_week: selectedJackpots[0]?.week_number || 0,
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

  // EXTEND/ROLLOVER logic
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

      alert("Cycle Extended Successfully!");
      window.location.reload();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div className="text-white space-y-8 animate-in fade-in pb-20 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase flex items-center tracking-tighter italic">
             <Layers className="mr-3 text-cyan-500 w-8 h-8" /> Deployment Center
           </h1>
           <p className="text-gray-400 text-sm">Bundle jackpots and set operational costs.</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/admin/ingest"><Button variant="outline">Ingest</Button></Link>
          {!targetCycleId && (
            <Button onClick={handlePublish} disabled={saving || selectedIds.length === 0} className="bg-green-600 hover:bg-green-500 px-8 font-black">
              {saving ? 'LAUNCHING...' : 'PUBLISH CYCLE'}
            </Button>
          )}
        </div>
      </div>

      {/* 🚩 RESCUE MODE SECTION */}
      {extendingCycles.length > 0 && (
        <div className="bg-amber-900/10 border border-amber-500/30 p-6 rounded-2xl space-y-4">
          <h2 className="text-amber-500 font-black text-xs uppercase tracking-widest flex items-center">
            <RefreshCcw className="w-4 h-4 mr-2" /> Pending Extensions
          </h2>
          <div className="flex flex-wrap gap-3">
            {extendingCycles.map(c => (
              <button key={c.id} onClick={() => setTargetCycleId(targetCycleId === c.id ? null : c.id)}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left min-w-[200px] ${targetCycleId === c.id ? 'border-amber-500 bg-amber-500/20' : 'border-gray-800 bg-black'}`}>
                <div className="text-sm font-bold">{c.name}</div>
                <div className="text-[10px] text-gray-500">{c.target_desc}</div>
              </button>
            ))}
          </div>
          {targetCycleId && (
            <div className="pt-4 border-t border-amber-500/20 flex items-center justify-between">
              <p className="text-xs text-amber-300 italic">Select new jackpots below to attach and rescue this cycle.</p>
              <Button onClick={handleExtendCycle} disabled={saving || selectedIds.length === 0} className="bg-amber-600 hover:bg-amber-500 font-black">EXECUTE ROLLOVER</Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900/40 p-6 rounded-3xl border border-gray-800 space-y-6 sticky top-6">
            {!targetCycleId ? (
              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Cycle Name</label>
                <input type="text" value={cycleName} onChange={(e) => setCycleName(e.target.value)} className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500" placeholder="e.g. Weekend Mega Hunter" />
              </div>
            ) : (
              <div className="p-3 bg-amber-950/30 border border-amber-900 rounded-xl text-amber-200 text-xs font-bold text-center italic">RESCUE MODE ACTIVE</div>
            )}
            
            <div>
              <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Pricing (Credits)</label>
              <div className="relative">
                <Ticket className="absolute left-3 top-3 w-4 h-4 text-cyan-500" />
                <input type="number" value={creditCost} onChange={(e) => setCreditCost(parseInt(e.target.value))} className="w-full bg-black border border-gray-800 p-3 pl-10 rounded-xl text-white outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Success Goal</label>
              <select value={goalType} onChange={(e) => setGoalType(e.target.value)} className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 appearance-none">
                <option>1 Bonus Target</option>
                <option>2 Bonus Target</option>
                <option>Full Jackpot Hit</option>
              </select>
            </div>

            {cycleEnd && (
              <div className="p-4 bg-cyan-950/20 border border-cyan-900/50 rounded-2xl">
                <div className="flex items-center text-cyan-400 text-[10px] font-black mb-1 uppercase tracking-widest"><Clock className="w-3 h-3 mr-2" /> Timeline Maximum</div>
                <div className="text-xl font-mono text-white">{cycleEnd.toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {inventory.map((jackpot) => {
            const isSelected = selectedIds.includes(jackpot.id);
            return (
              <div key={jackpot.id} onClick={() => toggleSelection(jackpot.id)} className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${isSelected ? 'bg-cyan-900/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-gray-900/20 border-gray-800 hover:border-gray-700'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-white italic">{jackpot.platform}</h3>
                  <Badge variant="outline" className="text-[10px] font-mono">{jackpot.variant}</Badge>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center mb-6 uppercase font-bold">
                  <Calendar className="w-3 h-3 mr-1" /> {new Date(jackpot.start_date).toLocaleDateString()}
                </div>
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="bg-gray-800 border-none">{jackpot.total_games} Games</Badge>
                  <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Week {jackpot.week_number}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}