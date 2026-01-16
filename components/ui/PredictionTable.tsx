'use client';

import React from 'react';
import { Prediction } from '@/types';
import { cn } from '@/lib/utils';
import { Lock, Shield, Zap, CheckCircle2, Ban } from 'lucide-react';

interface PredictionTableProps {
  predictions: Prediction[];
  isSubscribed: boolean;
  strategyMode?: 'all' | 'strat_a' | 'strat_b';
}

export default function PredictionTable({ 
  predictions, 
  isSubscribed, 
  strategyMode = 'all' 
}: PredictionTableProps) {
  
  const showA = strategyMode === 'all' || strategyMode === 'strat_a';
  const showB = strategyMode === 'all' || strategyMode === 'strat_b';

  const getCellBg = (pick: string, result?: string | null, baseColor?: string) => {
    if (!result) return baseColor;
    return pick === result ? "bg-green-900/20" : "bg-red-900/10";
  };

  const renderPredictionCell = (pick: string, result?: string | null, isLocked?: boolean) => {
    if (isLocked) {
      return (
        <div className="flex flex-col items-center justify-center h-full relative">
           <div className="blur-md select-none opacity-50 font-bold text-sm">{pick || 'X'}</div>
           <div className="absolute inset-0 flex items-center justify-center">
             <Lock className="w-3 h-3 text-gray-600" />
           </div>
        </div>
      );
    }

    if (!result) {
      return <div className="text-sm font-black text-white">{pick || '-'}</div>;
    }

    const isWin = pick === result;

    return (
      <div className="flex items-center justify-center space-x-2">
        <span className={cn("text-sm font-black", isWin ? "text-green-400" : "text-red-400 line-through opacity-60")}>
          {pick}
        </span>
        {isWin ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Ban className="w-4 h-4 text-red-500" />
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black/40 backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Match Info</th>
              
              {showA && (
                <th className="px-6 py-4 text-center text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">
                  <div className="flex items-center justify-center space-x-1">
                    <Shield className="w-3 h-3" /> <span>Shield</span>
                  </div>
                </th>
              )}
              
              {showB && (
                <th className="px-6 py-4 text-center text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">
                  <div className="flex items-center justify-center space-x-1">
                    <Zap className="w-3 h-3" /> <span>Sword</span>
                  </div>
                </th>
              )}

              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Intelligence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {predictions.map((pred) => {
              const isLocked = !isSubscribed && !pred.is_free;

              return (
                <tr key={pred.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-200">{pred.home_team}</span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase italic">vs {pred.away_team}</span>
                      {/* FIXED: Removed pred.match_time and replaced with match_id reference */}
                      <span className="text-[9px] text-gray-700 font-mono mt-1 uppercase">Fixture ID: #{pred.match_id}</span>
                    </div>
                  </td>

                  {showA && (
                    <td className={cn("px-6 py-4 text-center relative transition-colors", getCellBg(pred.strat_a_pick, pred.result, "bg-cyan-900/5"))}>
                      {renderPredictionCell(pred.strat_a_pick, pred.result, isLocked)}
                    </td>
                  )}

                  {showB && (
                    <td className={cn("px-6 py-4 text-center relative transition-colors", getCellBg(pred.strat_b_pick, pred.result, "bg-purple-900/5"))}>
                      {renderPredictionCell(pred.strat_b_pick, pred.result, isLocked)}
                    </td>
                  )}

                  <td className="px-6 py-4">
                     {pred.result ? (
                       <div className="flex items-center space-x-2">
                         <span className="bg-gray-800 text-white px-2 py-0.5 rounded text-[10px] font-black border border-gray-700">
                           FINAL: {pred.result}
                         </span>
                       </div>
                     ) : (
                       <p className={cn("text-[11px] leading-relaxed text-gray-500 italic max-w-xs", isLocked && "blur-sm select-none")}>
                         {pred.rationale || "Algorithmic variance check: high probability of stalemate or late-game shift."}
                       </p>
                     )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}