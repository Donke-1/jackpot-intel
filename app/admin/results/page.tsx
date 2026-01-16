'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Save, Loader2, Search, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function ResultsTerminal() {
  const [jackpots, setJackpots] = useState<any[]>([]);
  const [selectedJackpot, setSelectedJackpot] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Fetch All Jackpots (Active or Recently Ended)
  useEffect(() => {
    async function fetchJackpots() {
      const { data } = await supabase
        .from('jackpots')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (data) setJackpots(data);
      setLoading(false);
    }
    fetchJackpots();
  }, []);

  // 2. Load Predictions for specific Jackpot
  const loadMatches = async (jackpot: any) => {
    setLoading(true);
    setSelectedJackpot(jackpot);
    
    const { data } = await supabase
      .from('predictions')
      .select(`
        *,
        events!inner(*)
      `)
      .eq('events.jackpot_id', jackpot.id)
      .order('match_id', { ascending: true });

    if (data) setMatches(data);
    setLoading(false);
  };

  // 3. Update result and determine correctness locally
  const handleResultInput = (predictionId: string, resultValue: string) => {
    setMatches(prev => prev.map(m => {
      if (m.id === predictionId) {
        return { 
          ...m, 
          result: resultValue,
          is_correct: m.tip === resultValue 
        };
      }
      return m;
    }));
  };

  // 4. Batch Save to Database (Fires the SQL Trigger)
  const handleCommit = async () => {
    if (!selectedJackpot) return;
    setSaving(true);
    try {
      const updates = matches.map(m => ({
        id: m.id,
        result: m.result,
        is_correct: m.is_correct,
        event_id: m.event_id 
      }));

      const { error } = await supabase
        .from('predictions')
        .upsert(updates);

      if (error) throw error;
      
      alert(`Success! Results committed for ${selectedJackpot.platform}. All linked cycles are now settling.`);
    } catch (err: any) {
      alert("Save Error: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8 text-white p-4 md:p-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center uppercase tracking-tighter italic">
            <Trophy className="mr-3 text-yellow-500 w-8 h-8" /> Settlement War Room
          </h1>
          <p className="text-gray-400 text-sm">Input final outcomes to trigger the Hunter Protocol.</p>
        </div>
        {selectedJackpot && (
          <Button onClick={handleCommit} disabled={saving} className="bg-yellow-600 hover:bg-yellow-500 text-black py-6 px-10 text-lg font-black shadow-[0_0_20px_rgba(234,179,8,0.25)]">
            {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            COMMIT RESULTS
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR: JACKPOT LIST */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
            <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Available Lists</h3>
            <div className="space-y-2">
              {jackpots.map(j => (
                <div 
                  key={j.id} 
                  onClick={() => loadMatches(j)}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                    selectedJackpot?.id === j.id 
                      ? 'bg-yellow-500/10 border-yellow-500' 
                      : 'bg-black border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="font-bold text-sm">{j.platform}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">{j.variant} • WK {j.week_number}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN: MATCH LIST */}
        <div className="lg:col-span-3">
          {!selectedJackpot ? (
            <div className="h-96 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-600">
              <Search className="w-12 h-12 mb-4 opacity-10" />
              <p className="uppercase tracking-widest text-xs font-bold">Select a target from the sidebar</p>
            </div>
          ) : (
            <div className="bg-gray-900/20 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-black/50 text-[10px] uppercase font-black text-gray-500">
                  <tr>
                    <th className="p-5">#</th>
                    <th className="p-5">Match Name</th>
                    <th className="p-5">Prediction</th>
                    <th className="p-5 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {matches.map((m) => (
                    <tr key={m.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-5 font-mono text-gray-500 text-sm">{m.match_id}</td>
                      <td className="p-5">
                        <div className="font-bold text-white text-sm">{m.match_name}</div>
                        <div className="text-[10px] text-gray-500 uppercase mt-1 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {m.events.deadline ? new Date(m.events.deadline).toLocaleDateString() : 'No Date'}
                        </div>
                      </td>
                      <td className="p-5">
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-black px-3 py-1">
                          {m.tip}
                        </Badge>
                      </td>
                      <td className="p-5">
                        <div className="flex justify-center space-x-2">
                          {['1', 'X', '2'].map((res) => (
                            <button
                              key={res}
                              onClick={() => handleResultInput(m.id, res)}
                              className={`w-12 h-12 rounded-xl text-sm font-black transition-all border-2 ${
                                m.result === res 
                                  ? 'bg-yellow-500 border-yellow-400 text-black shadow-lg scale-110' 
                                  : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'
                              }`}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
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