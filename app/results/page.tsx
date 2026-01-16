'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, CheckCircle2, XCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ResultsPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      // Fetch ONLY completed cycles (success or failed)
      const { data } = await supabase
        .from('cycles')
        .select(`
          *,
          events (
            *,
            predictions (*)
          )
        `)
        .in('status', ['success', 'failed'])
        .order('end_date', { ascending: false });

      if (data) setCycles(data);
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedCycle(expandedCycle === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mission Archives</h1>
            <p className="text-gray-500">Verified outcomes of previous Hunter Cycles.</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
           <div className="text-center py-20 text-gray-500 animate-pulse">Retrieving archived data...</div>
        ) : cycles.length === 0 ? (
           <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center text-gray-500">
             No completed missions found yet.
           </div>
        ) : (
          <div className="space-y-4">
            {cycles.map((cycle) => (
              <div key={cycle.id} className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden">
                
                {/* Cycle Summary Card */}
                <div 
                  onClick={() => toggleExpand(cycle.id)}
                  className="p-6 cursor-pointer hover:bg-gray-900/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-white">{cycle.name}</h3>
                      {cycle.status === 'success' ? (
                        <Badge variant="success" className="bg-green-900/30 text-green-400 border-green-900">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> MISSION SUCCESS
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-900/30 text-red-400 border-red-900">
                          <XCircle className="w-3 h-3 mr-1" /> MISSION FAILED
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 space-x-3">
                      <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> Week {cycle.current_week}</span>
                      <span>•</span>
                      <span className="text-gray-300">{cycle.target_desc}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                     <div className="text-right">
                       <p className="text-[10px] uppercase text-gray-500 font-bold">Outcome</p>
                       <p className={cn("text-lg font-bold", cycle.status === 'success' ? "text-green-400" : "text-gray-400")}>
                         {cycle.status === 'success' ? 'WINNER PAID' : 'CREDITS ISSUED'}
                       </p>
                     </div>
                     {expandedCycle === cycle.id ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                  </div>
                </div>

                {/* Expanded Details (The Reveal) */}
                {expandedCycle === cycle.id && (
                  <div className="border-t border-gray-800 bg-black/50 p-6 space-y-4 animate-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Targeted Matches & Predictions</h4>
                    
                    <div className="grid gap-3">
                      {cycle.events.map((event: any) => {
                         // Sort predictions by match_id for clean list
                         const preds = event.predictions ? event.predictions.sort((a:any, b:any) => a.match_id - b.match_id) : [];
                         
                         return (
                           <div key={event.id} className="space-y-2">
                             <div className="flex items-center space-x-2 mb-2">
                               <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center font-bold text-gray-400 text-xs">
                                 {event.site_name.slice(0,2)}
                               </div>
                               <span className="font-bold text-sm text-gray-300">{event.site_name} Bundle</span>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                               {preds.map((p: any) => (
                                 <div key={p.id} className="flex justify-between items-center bg-gray-900 border border-gray-800 px-3 py-2 rounded text-xs">
                                   <span className="text-gray-400 truncate max-w-[150px]">{p.match_name}</span>
                                   {/* HERE IS THE UNBLURRED TIP */}
                                   <span className="font-bold text-cyan-400 bg-cyan-900/20 px-1.5 py-0.5 rounded border border-cyan-900/30">
                                     {p.tip}
                                   </span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}