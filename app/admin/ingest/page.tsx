'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, 
  Database, 
  BrainCircuit, 
  Sparkles, 
  Save, 
  Copy, 
  ClipboardCheck, 
  Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { cn } from '@/lib/utils'; // ✅ FIXED: Added missing import

const BOOKIE_CONFIG: Record<string, { name: string; games: number }[]> = {
  'SportPesa': [{ name: 'Mega Jackpot Pro', games: 17 }, { name: 'Midweek Jackpot', games: 13 }],
  'Mozzart': [{ name: 'Super Grand Jackpot', games: 20 }, { name: 'Super Daily Jackpot', games: 16 }],
  'SportyBet': [{ name: 'Jackpot 12', games: 12 }],
  'Shabiki': [{ name: 'Power 17', games: 17 }, { name: 'Power 13', games: 13 }],
  'Betika': [{ name: 'Grand Jackpot', games: 17 }, { name: 'Midweek Jackpot', games: 15 }, { name: 'Sababisha', games: 10 }]
};

export default function IntelligenceIngest() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState('SportPesa');
  const [variantIndex, setVariantIndex] = useState(0); 
  const [strategy, setStrategy] = useState('Strategy A (Variance Shield)');
  const [rawInput, setRawInput] = useState('');
  const [geminiJson, setGeminiJson] = useState('');
  const [parsedGames, setParsedGames] = useState<any[]>([]);

  const currentVariant = BOOKIE_CONFIG[platform][variantIndex];

  const generatePrompt = () => {
    const prompt = `
I have a list of matches for the ${platform} ${currentVariant.name} (${currentVariant.games} Games). 
Please analyze them using "${strategy}".

INPUT MATCHES:
${rawInput}

INSTRUCTIONS:
Return a RAW JSON object (no markdown) with a "matches" array. 
Each object must have: "match_id" (1 to ${currentVariant.games}), "match_name", "home_team", "away_team", "kickoff" (ISO 8601), "prediction" (1/X/2), "confidence" (1-100), "reason" (short).
    `.trim();
    
    navigator.clipboard.writeText(prompt);
    alert("AI Intelligence Prompt Copied! Paste this into Gemini.");
    setStep(2);
  };

  const handleParse = () => {
    try {
      const cleanJson = geminiJson.replace(/```json/g, '').replace(/```/g, '');
      const data = JSON.parse(cleanJson);
      if (data.matches) {
        setParsedGames(data.matches);
        setStep(3);
      }
    } catch (e) { alert("JSON Format Error. Please ensure Gemini returned valid code."); }
  };

  const handleSaveToInventory = async () => {
    setLoading(true);
    try {
      const dates = parsedGames.map(g => new Date(g.kickoff).getTime());
      
      // 1. Create Jackpot Entry (The Inventory)
      const { data: jackpot, error: jpError } = await supabase
        .from('jackpots')
        .insert({
          platform,
          variant: currentVariant.name,
          total_games: parsedGames.length,
          status: 'pending',
          strategy_tag: strategy,
          start_date: new Date(Math.min(...dates)).toISOString(),
          end_date: new Date(Math.max(...dates) + (3 * 3600000)).toISOString()
        })
        .select().single();

      if (jpError) throw jpError;

      // 2. Create Events
      const { data: events, error: evError } = await supabase
        .from('events')
        .insert(parsedGames.map(g => ({
          jackpot_id: jackpot.id,
          platform,
          event_name: g.match_name,
          deadline: g.kickoff,
          is_active: true
        })))
        .select();

      if (evError) throw evError;

      // 3. Create Predictions
      const predictionsData = parsedGames.map((g, i) => ({
        event_id: events[i].id,
        match_id: g.match_id,
        home_team: g.home_team,
        away_team: g.away_team,
        match_name: g.match_name,
        tip: g.prediction,
        confidence: g.confidence,
        strat_a_pick: strategy.includes('A') ? g.prediction : null,
        strat_b_pick: strategy.includes('B') ? g.prediction : null,
      }));

      await supabase.from('predictions').insert(predictionsData);

      alert("Intelligence successfully committed to inventory!");
      setStep(1); setRawInput(''); setGeminiJson('');
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 animate-in fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <BrainCircuit className="w-8 h-8 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Intelligence Ingest</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Jackpot Inventory Loader</p>
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
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center space-x-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all",
              step >= s ? "bg-cyan-500 text-black" : "bg-gray-800 text-gray-600"
            )}>
              {step > s ? <ClipboardCheck className="w-4 h-4" /> : s}
            </div>
            <span className={cn("text-[10px] font-black uppercase tracking-widest", step === s ? "text-white" : "text-gray-600")}>
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
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all">
                  {Object.keys(BOOKIE_CONFIG).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Variant</label>
                <select value={variantIndex} onChange={e => setVariantIndex(parseInt(e.target.value))} className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all">
                  {BOOKIE_CONFIG[platform].map((v, i) => <option key={i} value={i}>{v.name} ({v.games}G)</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Analysis Strategy</label>
                <select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full bg-black border-2 border-gray-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all">
                  <option>Strategy A (Variance Shield)</option>
                  <option>Strategy B (Aggressive Sword)</option>
                </select>
              </div>
            </div>
            <Button onClick={generatePrompt} className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-8 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Sparkles className="w-4 h-4 mr-2" /> GENERATE AI COMMAND
            </Button>
          </div>
          <div className="flex flex-col">
             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Raw Fixture Data</label>
             <textarea 
               value={rawInput} onChange={e => setRawInput(e.target.value)}
               placeholder="Paste match list with dates/times here..."
               className="flex-1 bg-black border-2 border-gray-800 p-6 rounded-[2rem] text-xs font-mono text-cyan-500/70 focus:border-cyan-500/40 outline-none resize-none"
             />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in slide-in-from-right-4">
          <textarea 
            value={geminiJson} onChange={e => setGeminiJson(e.target.value)}
            placeholder="Paste the RAW JSON output from Gemini here..."
            className="h-96 w-full bg-black border-2 border-gray-800 p-6 rounded-[2rem] text-xs font-mono text-green-500 outline-none focus:border-green-500/30"
          />
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6 rounded-2xl">RE-CONFIGURE</Button>
            <Button onClick={handleParse} className="flex-[2] bg-green-600 hover:bg-green-500 font-black py-6 rounded-2xl">VALIDATE INTELLIGENCE</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95">
           <div className="bg-cyan-900/10 border border-cyan-500/20 p-8 rounded-[2.5rem] text-center space-y-4">
              <Zap className="w-12 h-12 text-cyan-500 mx-auto animate-pulse" />
              <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Ready for Deployment</h2>
              <p className="text-gray-400 text-sm">Parsed <span className="text-white font-bold">{parsedGames.length} matches</span> for the {platform} {currentVariant.name}. All timestamps converted to ISO 8601.</p>
           </div>
           <Button onClick={handleSaveToInventory} disabled={loading} className="w-full bg-cyan-600 py-8 font-black rounded-[2rem] text-xl shadow-2xl">
             {loading ? 'STORING DATA...' : 'COMMIT TO INVENTORY'}
           </Button>
        </div>
      )}
    </div>
  );
}