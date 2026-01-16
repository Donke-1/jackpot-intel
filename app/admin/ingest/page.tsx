'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, ArrowRight, Database, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function JackpotIngest() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // FORM STATE
  const [platform, setPlatform] = useState('SportPesa');
  const [variant, setVariant] = useState('Mega Jackpot');
  const [gamesCount, setGamesCount] = useState(17);
  const [week, setWeek] = useState(42);
  const [strategy, setStrategy] = useState('Strategy A (Variance Shield)');
  const [rawInput, setRawInput] = useState('');
  
  // PARSED DATA
  const [geminiJson, setGeminiJson] = useState('');
  const [parsedGames, setParsedGames] = useState<any[]>([]);

  // --- STEP 1: GENERATE PROMPT ---
  const generatePrompt = () => {
    // We added the "kickoff" requirement to the prompt
    const prompt = `
I have a list of football matches for the ${platform} ${variant} (${gamesCount} Games). 
Please analyze them using "${strategy}".

INPUT MATCHES (Contains Dates/Times):
${rawInput}

INSTRUCTIONS:
Return a RAW JSON object (no markdown formatting) with a "matches" array. 
Each object in the array must have:
- "match_id" (Integer 1 to ${gamesCount})
- "match_name" (e.g. "Home vs Away")
- "home_team"
- "away_team"
- "kickoff" (Convert the match date/time from the input into a valid ISO 8601 String e.g. "2024-05-20T16:00:00". Assume the current year is ${new Date().getFullYear()} if missing.)
- "prediction" (Return ONLY "1", "X", or "2")
- "confidence" (Integer 1-100)
- "reason" (Short 10-word analysis)

Ensure the order matches the input exactly.
    `.trim();
    
    navigator.clipboard.writeText(prompt);
    alert("Prompt copied! Paste into Gemini, then copy the JSON response back here.");
    setStep(2);
  };

  // --- STEP 2: PARSE RESPONSE ---
  const handleParse = () => {
    try {
      const cleanJson = geminiJson.replace(/```json/g, '').replace(/```/g, '');
      const data = JSON.parse(cleanJson);
      
      if (data.matches && Array.isArray(data.matches)) {
        setParsedGames(data.matches);
        setStep(3);
      } else {
        alert("Invalid JSON. Could not find 'matches' array.");
      }
    } catch (e: any) {
      alert("JSON Parse Error: " + e.message);
    }
  };

  // --- STEP 3: SAVE TO INVENTORY ---
  const handleSaveToInventory = async () => {
    setLoading(true);
    try {
      // 1. AUTO-CALCULATE DATES based on the parsed matches
      // Extract all dates
      const dates = parsedGames.map(g => new Date(g.kickoff).getTime()).filter(d => !isNaN(d));
      
      if (dates.length === 0) {
        throw new Error("Could not parse valid dates from AI response. Please check the JSON.");
      }

      // Start Date = The Earliest Match
      const minDate = Math.min(...dates);
      // End Date = The Latest Match + 3 Hours (Approx game time)
      const maxDate = Math.max(...dates) + (3 * 60 * 60 * 1000);

      // 2. Create the JACKPOT container
      const { data: jackpot, error: jpError } = await supabase
        .from('jackpots')
        .insert({
          platform,
          variant,
          total_games: parsedGames.length,
          week_number: week,
          status: 'pending',
          start_date: new Date(minDate).toISOString(), // Auto-calculated
          end_date: new Date(maxDate).toISOString()   // Auto-calculated
        })
        .select()
        .single();

      if (jpError) throw jpError;

      // 3. Insert Events & Predictions
      for (const game of parsedGames) {
        
        // A. Insert Event
        const { data: event, error: evError } = await supabase
          .from('events')
          .insert({
            jackpot_id: jackpot.id,
            platform,
            event_name: game.match_name,
            week_number: week,
            deadline: game.kickoff // ✅ EACH EVENT GETS ITS OWN EXACT TIME
          })
          .select()
          .single();

        if (evError) throw evError;

        // B. Insert Prediction
        const predictionData = {
          event_id: event.id,
          match_id: game.match_id,
          home_team: game.home_team,
          away_team: game.away_team,
          match_name: game.match_name,
          tip: game.prediction,
          confidence: game.confidence,
          strat_a_pick: strategy.includes('A') ? game.prediction : 'X', 
          strat_b_pick: strategy.includes('B') ? game.prediction : 'X',
        };

        await supabase.from('predictions').insert(predictionData);
      }

      alert(`Success! Jackpot added. \nStart: ${new Date(minDate).toLocaleString()} \nEnd: ${new Date(maxDate).toLocaleString()}`);
      
      setStep(1);
      setRawInput('');
      setGeminiJson('');
      setParsedGames([]);

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 animate-in fade-in">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Database className="w-10 h-10 text-cyan-500" />
          <div>
            <h1 className="text-3xl font-black uppercase">Admin Ingest</h1>
            <p className="text-gray-400">Add Raw Jackpots → Gemini → Database Inventory</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center space-x-2 text-sm border-b border-gray-800 pb-6">
          <Badge className={step >= 1 ? "bg-cyan-600" : "bg-gray-800 text-gray-500"}>1. Configure</Badge>
          <ArrowRight className="w-4 h-4 text-gray-600" />
          <Badge className={step >= 2 ? "bg-cyan-600" : "bg-gray-800 text-gray-500"}>2. Parse AI</Badge>
          <ArrowRight className="w-4 h-4 text-gray-600" />
          <Badge className={step >= 3 ? "bg-green-600" : "bg-gray-800 text-gray-500"}>3. Save</Badge>
        </div>

        {/* STEP 1: CONFIG */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 space-y-4">
                <h3 className="font-bold text-gray-300 uppercase text-xs tracking-widest">Metadata</h3>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-black border border-gray-700 p-2 rounded text-white">
                    <option>SportPesa</option>
                    <option>Mozzart</option>
                    <option>SportyBet</option>
                    <option>Shabiki</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs text-gray-500 mb-1">Variant Name</label>
                     <input type="text" value={variant} onChange={e => setVariant(e.target.value)} className="w-full bg-black border border-gray-700 p-2 rounded text-white" />
                  </div>
                  <div>
                     <label className="block text-xs text-gray-500 mb-1">Total Games</label>
                     <input type="number" value={gamesCount} onChange={e => setGamesCount(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-2 rounded text-white" />
                  </div>
                </div>

                {/* NOTE: We removed the Date Pickers because AI extracts them now */}
                <div className="bg-cyan-900/10 p-3 rounded border border-cyan-900/50 flex items-center">
                   <CalendarClock className="w-4 h-4 text-cyan-500 mr-2" />
                   <p className="text-[10px] text-cyan-400">
                     Time extraction enabled: AI will read match dates from your input.
                   </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Strategy Used</label>
                  <select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full bg-black border border-gray-700 p-2 rounded text-white">
                    <option>Strategy A (Variance Shield)</option>
                    <option>Strategy B (Aggressive)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 h-full flex flex-col">
                 <h3 className="font-bold text-gray-300 uppercase text-xs tracking-widest mb-2">Raw Input</h3>
                 <textarea 
                   value={rawInput}
                   onChange={e => setRawInput(e.target.value)}
                   className="flex-1 w-full bg-black border border-gray-700 p-4 rounded font-mono text-xs text-gray-300 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                   placeholder={`Paste the matches WITH DATES here...\n\n1. Arsenal vs Chelsea - 14/05 15:00\n2. Liverpool vs City - 14/05 17:30`}
                 />
                 <Button onClick={generatePrompt} className="w-full mt-4 bg-purple-600 hover:bg-purple-500 font-bold py-6">
                   <Copy className="w-4 h-4 mr-2" /> COPY GEMINI PROMPT
                 </Button>
               </div>
            </div>
          </div>
        )}

        {/* STEP 2: PARSE */}
        {step === 2 && (
          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 space-y-4">
             <div className="flex items-start space-x-3 bg-blue-900/20 p-4 rounded border border-blue-900/50">
               <div className="p-2 bg-blue-900/50 rounded-full">
                 <Copy className="w-4 h-4 text-blue-400" />
               </div>
               <div>
                 <h4 className="text-blue-400 font-bold text-sm">Waiting for AI Data</h4>
                 <p className="text-xs text-blue-300/70 mt-1">
                   Paste the prompt into Gemini. Copy the JSON response it gives you and paste it below.
                 </p>
               </div>
             </div>

             <textarea 
               value={geminiJson}
               onChange={e => setGeminiJson(e.target.value)}
               className="w-full h-80 bg-black border border-gray-700 p-4 rounded font-mono text-xs text-green-400 focus:outline-none focus:border-green-500 transition-colors"
               placeholder='{ "matches": [ ... ] }'
             />

             <div className="flex space-x-4">
               <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6">Back to Config</Button>
               <Button onClick={handleParse} className="flex-[2] bg-cyan-600 hover:bg-cyan-500 font-bold py-6">
                 PARSE JSON DATA
               </Button>
             </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-gray-900 p-4 rounded-lg border border-gray-800">
               <div>
                 <h2 className="text-xl font-bold text-white">{platform} - {variant}</h2>
                 <p className="text-sm text-gray-400">{parsedGames.length} Matches • Week {week}</p>
               </div>
               <div className="text-right">
                 <Badge className="bg-purple-900 text-purple-200 border-purple-700 block mb-1">{strategy}</Badge>
                 <span className="text-[10px] text-gray-500 font-mono">
                    Timeframe extracted from matches
                 </span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {parsedGames.map((game, i) => (
                <div key={i} className="bg-black border border-gray-800 p-3 rounded flex flex-col space-y-2">
                   <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-500 font-bold">#{game.match_id}</span>
                      <div className="text-right">
                        <Badge variant="outline" className="border-cyan-500 text-cyan-400 font-bold mb-1">{game.prediction}</Badge>
                        <div className="text-[10px] text-gray-500">
                          {game.kickoff ? new Date(game.kickoff).toLocaleString() : 'No Date'}
                        </div>
                      </div>
                   </div>
                   <div className="font-bold text-sm text-gray-300 truncate">{game.match_name}</div>
                   <div className="text-[10px] text-gray-500">{game.reason}</div>
                </div>
              ))}
            </div>

            <div className="flex space-x-4 pt-8 border-t border-gray-800">
               <Button variant="outline" onClick={() => setStep(2)} className="flex-1 py-6">Back</Button>
               <Button 
                 onClick={handleSaveToInventory} 
                 disabled={loading}
                 className="flex-[2] bg-green-600 hover:bg-green-500 font-bold py-6 text-lg shadow-[0_0_20px_rgba(22,163,74,0.3)]"
               >
                 {loading ? 'SAVING TO INVENTORY...' : 'CONFIRM & SAVE'}
               </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}