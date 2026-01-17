'use client';

import React from 'react';
import type { Prediction } from '@/types';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle2, Ban } from 'lucide-react';

interface PredictionTableProps {
  predictions: Array<Prediction & { fixture?: any }>;
  isUnlocked: boolean; // renamed semantics (access-based)
}

function fixtureLabel(fx: any) {
  if (!fx) return 'Fixture';
  if (fx.match_name) return fx.match_name;
  if (fx.home_team && fx.away_team) return `${fx.home_team} vs ${fx.away_team}`;
  return `Match ${fx.seq ?? ''}`.trim();
}

export default function PredictionTable({ predictions, isUnlocked }: PredictionTableProps) {
  const renderPick = (pick: string, result?: string | null, locked?: boolean) => {
    if (locked) {
      return (
        <div className="flex flex-col items-center justify-center h-full relative">
          <div className="blur-md select-none opacity-50 font-bold text-sm">{pick || '—'}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-3 h-3 text-gray-600" />
          </div>
        </div>
      );
    }

    // If result exists, show win/loss signal
    if (result) {
      const isWin = pick === result;
      return (
        <div className="flex items-center justify-center space-x-2">
          <span className={cn('text-sm font-black', isWin ? 'text-green-400' : 'text-red-400 line-through opacity-60')}>
            {pick}
          </span>
          {isWin ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Ban className="w-4 h-4 text-red-500" />}
        </div>
      );
    }

    return <div className="text-sm font-black text-white">{pick || '—'}</div>;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black/40 backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Fixture
              </th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">
                Pick
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800/50">
            {predictions.map((pred) => {
              const fx = (pred as any).fixture;
              const locked = !isUnlocked;
              const result = fx?.result ?? null;

              return (
                <tr key={pred.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-200">{fixtureLabel(fx)}</span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase italic">
                        {fx?.kickoff_time ? new Date(fx.kickoff_time).toLocaleString() : '—'}
                      </span>
                      <span className="text-[9px] text-gray-700 font-mono mt-1 uppercase">
                        Seq: #{fx?.seq ?? '—'}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {renderPick((pred as any).pick, result, locked)}
                  </td>

                  <td className="px-6 py-4">
                    {result ? (
                      <span className="bg-gray-800 text-white px-2 py-0.5 rounded text-[10px] font-black border border-gray-700">
                        FINAL: {result}
                      </span>
                    ) : (
                      <p className={cn('text-[11px] leading-relaxed text-gray-500 italic max-w-xs', locked && 'blur-sm select-none')}>
                        {(pred as any).rationale || 'Pending result…'}
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
