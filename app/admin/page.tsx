'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle, AlertCircle, Shield, Zap, Gavel, FileJson, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'inject' | 'manage' | 'daily'>('inject');
  
  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-gray-800 pb-4 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-cyan-500 flex items-center">
              <Shield className="mr-3" /> ADMIN_CONSOLE_v3
            </h1>
            <p className="text-gray-500">Hunter Protocol Command Center</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('inject')}
              className={cn("px-4 py-2 rounded text-sm font-bold flex items-center", activeTab === 'inject' ? "bg-cyan-900/50 text-cyan-400 border border-cyan-500" : "text-gray-500 hover:bg-gray-900")}
            >
              <FileJson className="w-4 h-4 mr-2" /> INJECTOR
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={cn("px-4 py-2 rounded text-sm font-bold flex items-center", activeTab === 'manage' ? "bg-purple-900/50 text-purple-400 border border-purple-500" : "text-gray-500 hover:bg-gray-900")}
            >
              <Gavel className="w-4 h-4 mr-2" /> ARBITER
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={cn("px-4 py-2 rounded text-sm font-bold flex items-center", activeTab === 'daily' ? "bg-orange-900/50 text-orange-400 border border-orange-500" : "text-gray-500 hover:bg-gray-900")}
            >
              <Flame className="w-4 h-4 mr-2" /> DAILY DROPS
            </button>
          </div>
        </div>

        {activeTab === 'inject' ? <InjectorTab /> : activeTab === 'manage' ? <ArbiterTab /> : <DailyTab />}
      </div>
    </div>
  );
}

// --- COMPONENT: THE INJECTOR (Old Logic) ---
function InjectorTab() {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<string>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, `> ${msg}`]);

  const handleSmartPaste = async () => {
    setStatus('processing');
    setLogs([]);
    addLog('Parsing HUNTER Protocol payload...');

    try {
      const data = JSON.parse(jsonInput);
      const { meta, predictions } = data;

      if (!meta || !predictions) throw new Error('Invalid JSON structure');
      
      addLog(`Cycle Detected: ${meta.cycle_id} (${meta.category})`);

      // 1. Upsert Cycle
      const { error: cycleError } = await supabase
        .from('cycles')
        .upsert({ 
          id: meta.cycle_id, 
          name: meta.cycle_name, 
          category: meta.category, 
          target_wins: meta.target_wins,
          target_desc: meta.target_desc,
          current_week: meta.week_number,
          status: 'active'
        }, { onConflict: 'id' });

      if (cycleError) throw cycleError;
      addLog('Global Cycle Engine synced.');

      // 2. Create Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          cycle_id: meta.cycle_id,
          week_number: meta.week_number,
          platform: meta.platform,
          event_name: meta.event_name,
          deadline: meta.deadline,
          is_active: true
        })
        .select()
        .single();

      if (eventError) throw eventError;
      addLog(`Event created ID: ${eventData.id}`);

      // 3. Insert Predictions
      const formattedPredictions = predictions.map((p: any) => ({
        event_id: eventData.id,
        match_id: p.id,
        home_team: p.home,
        away_team: p.away,
        match_time: p.time,
        strat_a_pick: p.strat_a,
        strat_b_pick: p.strat_b,
        rationale: p.rationale,
        is_free: p.is_free,
        status: 'pending'
      }));

      const { error: predError } = await supabase
        .from('predictions')
        .insert(formattedPredictions);

      if (predError) throw predError;
      
      addLog(`SUCCESS: ${formattedPredictions.length} predictions injected.`);
      setStatus('success');
      setJsonInput(''); 

    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      addLog(`ERROR: ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
      <div className="space-y-4">
        <label className="text-sm font-bold text-gray-400">JSON PAYLOAD</label>
        <textarea
          className="w-full h-[500px] bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-green-400 focus:outline-none focus:border-cyan-500 font-mono"
          placeholder="// Paste Hunter JSON here..."
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />
        <button
          onClick={handleSmartPaste}
          disabled={status === 'processing'}
          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-black font-bold rounded flex justify-center items-center transition-all"
        >
          {status === 'processing' ? 'INJECTING...' : 'EXECUTE PROTOCOL'}
          <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>

      <div className="bg-neutral-900 rounded-lg border border-gray-800 p-4 overflow-hidden flex flex-col h-[600px]">
         <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
           <span className="text-xs font-bold text-gray-500">SYSTEM LOGS</span>
           {status === 'success' && <CheckCircle className="text-green-500 w-4 h-4"/>}
           {status === 'error' && <AlertCircle className="text-red-500 w-4 h-4"/>}
         </div>
         <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
           {logs.map((log, i) => (
             <div key={i} className="text-gray-300 border-l-2 border-cyan-900 pl-2">{log}</div>
           ))}
         </div>
      </div>
    </div>
  );
}

// --- COMPONENT: THE ARBITER (Updated with Settlement) ---
function ArbiterTab() {
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [settling, setSettling] = useState(false);
  
  useEffect(() => {
    async function fetchActive() {
      // Fetch active cycle -> active events -> predictions
      const { data: cycle } = await supabase.from('cycles').select('*').eq('status', 'active').single();
      
      if (cycle) {
        setActiveCycle(cycle);
        const { data: events } = await supabase
          .from('events')
          .select('*, predictions(*)')
          .eq('cycle_id', cycle.id)
          .eq('is_active', true)
          .order('id', { ascending: true });
        
        if (events) {
           const sorted = events.map((e: any) => ({
             ...e,
             predictions: e.predictions.sort((a: any, b: any) => a.match_id - b.match_id)
           }));
           setActiveEvents(sorted);
        }
      }
    }
    fetchActive();
  }, []);

  const updateResult = async (predictionId: number, result: string) => {
    // 1. Update the row locally to feel fast
    setActiveEvents(prev => prev.map(ev => ({
      ...ev,
      predictions: ev.predictions.map((p: any) => 
        p.id === predictionId ? { ...p, result, status: 'settled' } : p
      )
    })));

    // 2. Send to DB
    await supabase.from('predictions').update({ result, status: 'settled' }).eq('id', predictionId);
  };

  // NEW: Handle Cycle Closure
  const handleSettle = async (winningPlatform: string | null) => {
    if (!activeCycle) return;
    if (!confirm(`Are you sure you want to mark this cycle as ${winningPlatform ? 'WON by ' + winningPlatform : 'FAILED'}? This will update all user wallets.`)) return;
    
    setSettling(true);
    // Dynamic import to avoid server action issues in client component if strict
    const { settleCycle } = await import('@/app/actions'); 
    
    await settleCycle(activeCycle.id, winningPlatform);
    setSettling(false);
    alert('Cycle Settled. Users updated.');
    window.location.reload();
  };

  if (!activeCycle) return <div className="text-gray-500">No active cycle. System Idle.</div>;

  return (
    <div className="space-y-10 animate-in fade-in pb-20">
      {activeEvents.map((event) => (
        <div key={event.id} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 p-4 flex justify-between items-center">
            <h3 className="font-bold text-white">{event.platform} <span className="text-gray-400 text-sm">({event.event_name})</span></h3>
            <div className="flex space-x-2">
              <Badge variant="neon">LIVE GRADING</Badge>
              {/* MARK AS WINNER BUTTON */}
              <button 
                onClick={() => handleSettle(event.platform)}
                disabled={settling}
                className="px-3 py-1 bg-green-900/50 text-green-400 text-xs font-bold border border-green-700 rounded hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                MARK AS WINNER
              </button>
            </div>
          </div>
          
          <table className="w-full text-sm text-left">
            <thead className="text-gray-500 bg-black/20 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Match</th>
                <th className="px-4 py-2 text-center text-cyan-500">Strat A</th>
                <th className="px-4 py-2 text-center text-purple-500">Strat B</th>
                <th className="px-4 py-2 text-center text-white">SET RESULT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {event.predictions.map((pred: any) => (
                <tr key={pred.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{pred.home_team} vs {pred.away_team}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-cyan-300 font-bold">{pred.strat_a_pick}</td>
                  <td className="px-4 py-3 text-center text-purple-300 font-bold">{pred.strat_b_pick}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center space-x-2">
                      {['1', 'X', '2'].map((outcome) => (
                        <button
                          key={outcome}
                          onClick={() => updateResult(pred.id, outcome)}
                          className={cn(
                            "w-8 h-8 rounded font-bold border transition-all",
                            pred.result === outcome 
                              ? "bg-green-500 text-black border-green-500 shadow-[0_0_10px_rgba(34,199,89,0.5)]" 
                              : "bg-black border-gray-700 text-gray-400 hover:border-gray-500"
                          )}
                        >
                          {outcome}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* SETTLEMENT ZONE */}
      <div className="border-t border-gray-800 pt-8 mt-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <Gavel className="mr-2 text-purple-500" /> SETTLEMENT ZONE
        </h2>
        <div className="bg-red-900/10 border border-red-900/50 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-red-400 font-bold">Declare Global Failure</h3>
            <p className="text-xs text-gray-500">Mark cycle as FAILED. No rollover credits issued (unless logic changes).</p>
          </div>
          <button
            onClick={() => handleSettle(null)}
            disabled={settling}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {settling ? 'PROCESSING...' : 'CLOSE CYCLE AS LOSS'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENT: DAILY DROPS ---
function DailyTab() {
  const [match, setMatch] = useState('');
  const [tip, setTip] = useState('');
  const [odds, setOdds] = useState('');
  const [confidence, setConfidence] = useState('High');
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    setLoading(true);
    const { error } = await supabase.from('daily_tips').insert({
      match_name: match,
      tip: tip,
      odds: odds,
      confidence: confidence
    });
    
    setLoading(false);
    if (!error) {
      alert('Daily Intel Posted!');
      setMatch(''); setTip(''); setOdds('');
    } else {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-orange-900/10 border border-orange-500/30 p-6 rounded-xl text-center">
        <Flame className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Daily Freebies</h2>
        <p className="text-gray-400">Post quickfire tips. These auto-expire after 24h.</p>
      </div>

      <div className="space-y-4 bg-gray-900 p-6 rounded-xl border border-gray-800">
        <div>
          <label className="text-xs text-gray-500 uppercase font-bold">Match Name</label>
          <input 
            value={match} onChange={e => setMatch(e.target.value)}
            className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-orange-500 outline-none" 
            placeholder="e.g. Liverpool vs Chelsea"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">The Tip</label>
            <input 
              value={tip} onChange={e => setTip(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-orange-500 outline-none" 
              placeholder="e.g. Over 2.5 Goals"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Odds</label>
            <input 
              value={odds} onChange={e => setOdds(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-orange-500 outline-none" 
              placeholder="e.g. 1.85"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase font-bold">Confidence</label>
          <div className="flex space-x-2 mt-2">
            {['High', 'Medium', 'Risky'].map(level => (
              <button
                key={level}
                onClick={() => setConfidence(level)}
                className={cn(
                  "flex-1 py-2 rounded text-sm font-bold border transition-all",
                  confidence === level 
                    ? "bg-orange-600 text-white border-orange-600" 
                    : "bg-black text-gray-500 border-gray-700 hover:border-gray-500"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handlePost}
          disabled={loading}
          className="w-full py-4 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors mt-4"
        >
          {loading ? 'POSTING...' : 'DEPLOY INTEL'}
        </button>
      </div>
    </div>
  );
}