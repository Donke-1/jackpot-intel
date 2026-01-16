'use client';

import React from 'react';
import { Prediction } from '@/types';
import { cn } from '@/lib/utils';
import { Lock, Shield, Zap, CheckCircle2, Ban } from 'lucide-react'; // <--- Swapped X for Ban

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
           <div className="blur-md select-none opacity-50 font-bold text-sm">{pick}</div>
           <div className="absolute inset-0 flex items-center justify-center">
             <Lock className="w-4 h-4 text-gray-600" />
           </div>
        </div>
      );
    }

    if (!result) {
      return <div className="text-sm font-bold text-white">{pick}</div>;
    }

    const isWin = pick === result;

    return (
      <div className="flex items-center justify-center space-x-2">
        <span className={cn("text-sm font-bold", isWin ? "text-green-400" : "text-red-400 line-through opacity-60")}>
          {pick}
        </span>
        {isWin ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          /* Using Ban icon (Circle Slash) to avoid confusion with 'X' (Draw) */
          <Ban className="w-4 h-4 text-red-500" />
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-black/40 backdrop-blur-sm">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
            
            {showA && (
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-400 uppercase tracking-wider">
                <div className="flex items-center justify-center space-x-1">
                  <Shield className="w-3 h-3" /> <span>Strat A</span>
                </div>
              </th>
            )}
            
            {showB && (
              <th className="px-6 py-3 text-center text-xs font-medium text-purple-400 uppercase tracking-wider">
                <div className="flex items-center justify-center space-x-1">
                  <Zap className="w-3 h-3" /> <span>Strat B</span>
                </div>
              </th>
            )}

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {predictions.map((pred) => {
            const isLocked = !isSubscribed && !pred.is_free;

            return (
              <tr key={pred.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{pred.home_team}</span>
                    <span className="text-xs text-gray-500">vs {pred.away_team}</span>
                    {!pred.result && (
                       <span className="text-[10px] text-gray-600 font-mono mt-1">{pred.match_time}</span>
                    )}
                  </div>
                </td>

                {showA && (
                  <td className={cn("px-6 py-4 whitespace-nowrap text-center relative transition-colors", getCellBg(pred.strat_a_pick, pred.result, "bg-cyan-900/5"))}>
                    {renderPredictionCell(pred.strat_a_pick, pred.result, isLocked)}
                  </td>
                )}

                {showB && (
                  <td className={cn("px-6 py-4 whitespace-nowrap text-center relative transition-colors", getCellBg(pred.strat_b_pick, pred.result, "bg-purple-900/5"))}>
                    {renderPredictionCell(pred.strat_b_pick, pred.result, isLocked)}
                  </td>
                )}

                <td className="px-6 py-4 relative">
                   {pred.result ? (
                     <div className="flex items-center space-x-2">
                       <span className="bg-gray-800 text-white px-3 py-1 rounded text-xs font-bold border border-gray-600 shadow-sm">
                         {pred.result}
                       </span>
                     </div>
                   ) : (
                     <p className={cn("text-xs text-gray-400 max-w-xs", isLocked && "blur-sm select-none")}>
                       {pred.rationale || "Algorithmic determination based on variance models."}
                     </p>
                   )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}