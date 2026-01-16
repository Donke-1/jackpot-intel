'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Layers, Plus, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function CycleManager() {
  const [pendingJackpots, setPendingJackpots] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cycleName, setCycleName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Fetch Inventory
  useEffect(() => {
    async function fetchInventory() {
      const { data } = await supabase
        .from('jackpots')
        .select('*')
        .eq('status', 'pending') // Only show unused jackpots
        .order('created_at', { ascending: false });
      
      if (data) setPendingJackpots(data);
      setLoading(false);
    }
    fetchInventory();
  }, []);

  // 2. Handle Selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 3. Publish Cycle
  const handlePublish = async () => {
    if (!cycleName || selectedIds.length === 0) return alert("Name and Selection required");
    setSaving(true);

    try {
      // A. Calculate End Date (The latest deadline of selected jackpots)
      const selectedJackpots = pendingJackpots.filter(j => selectedIds.includes(j.id));
      const dates = selectedJackpots.map(j => new Date(j.end_date).getTime());
      const maxDate = new Date(Math.max(...dates));

      // B. Create Cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('cycles')
        .insert({
          id: crypto.randomUUID(),
          name: cycleName,
          category: 'sports',
          target_desc: `${selectedJackpots.length} Jackpots Bundle`,
          status: 'active',
          current_week: selectedJackpots[0]?.week_number || 42,
          end_date: maxDate.toISOString()
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // C. Link Jackpots to Cycle
      const links = selectedIds.map(jId => ({
        cycle_id: cycle.id,
        jackpot_id: jId
      }));

      const { error: linkError } = await supabase.from('cycle_jackpots').insert(links);
      if (linkError) throw linkError;

      // D. Update Jackpots status to 'active'
      await supabase
        .from('jackpots')
        .update({ status: 'active' })
        .in('id', selectedIds);

      alert("Cycle Published Successfully! It is now live on the dashboard.");
      window.location.reload();

    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="text-white space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold flex items-center">
             <Layers className="mr-3 text-cyan-500" /> Cycle Manager
           </h1>
           <p className="text-gray-400">Bundle pending jackpots into a live cycle.</p>
        </div>
        
        <div className="flex space-x-3">
          {/* ✅ FIXED: Now links to the actual Ingest Page */}
          <Link href="/admin/ingest">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Ingest Data
            </Button>
          </Link>

          <Button disabled={saving} onClick={handlePublish} className="bg-green-600 hover:bg-green-500 py-6 text-lg font-bold">
            {saving ? 'PUBLISHING...' : 'PUBLISH LIVE CYCLE'}
          </Button>
        </div>
      </div>

      {/* FORM */}
      <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Cycle Public Name</label>
        <input 
          type="text" 
          value={cycleName}
          onChange={(e) => setCycleName(e.target.value)}
          placeholder="e.g. Weekend Millionaire Bundle (Week 42)"
          className="w-full bg-black border border-gray-700 p-4 rounded text-xl font-bold text-white focus:border-cyan-500 outline-none"
        />
      </div>

      {/* INVENTORY LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-gray-500">Loading inventory...</p>}
        
        {pendingJackpots.map((jackpot) => {
          const isSelected = selectedIds.includes(jackpot.id);
          return (
            <div 
              key={jackpot.id}
              onClick={() => toggleSelection(jackpot.id)}
              className={`
                cursor-pointer relative p-5 rounded-xl border-2 transition-all
                ${isSelected ? 'bg-cyan-900/20 border-cyan-500' : 'bg-black border-gray-800 hover:border-gray-600'}
              `}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 text-cyan-500">
                  <CheckCircle2 className="w-6 h-6 fill-current" />
                </div>
              )}
              
              <h3 className="font-bold text-lg">{jackpot.platform}</h3>
              <p className="text-sm text-gray-400 mb-4">{jackpot.variant}</p>
              
              <div className="flex items-center justify-between text-xs">
                 <Badge variant="outline">{jackpot.total_games} Games</Badge>
                 <span className="text-gray-500 flex items-center">
                   <Calendar className="w-3 h-3 mr-1" />
                   Week {jackpot.week_number}
                 </span>
              </div>
            </div>
          );
        })}
        
        {!loading && pendingJackpots.length === 0 && (
          <div className="col-span-full text-center py-12 border border-dashed border-gray-800 rounded-xl">
             <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
             <p className="text-gray-500">No pending jackpots found.</p>
             <p className="text-xs text-gray-600">
               Go to <Link href="/admin/ingest" className="text-cyan-500 underline">Data Ingestion</Link> to add some first.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}