'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PartyPopper, X, Trophy, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type CycleLike = {
  id: string;
  name: string;
  status: string;
};

const SEEN_KEY = 'jackpotintel_seen_wins_v2';

function getSeenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function saveSeenSet(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // ignore
  }
}

export default function SuccessModal({ cycles }: { cycles: CycleLike[] }) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [winningCycle, setWinningCycle] = useState<CycleLike | null>(null);
  const [userJoined, setUserJoined] = useState<boolean | null>(null); // null = unknown/loading
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Pick a winner to show once
  useEffect(() => {
    if (!cycles || cycles.length === 0) return;

    const seen = getSeenSet();
    const winner = cycles.find((c) => c.status === 'won' && !seen.has(c.id));
    if (!winner) return;

    setWinningCycle(winner);
    setIsOpen(true);

    seen.add(winner.id);
    saveSeenSet(seen);
  }, [cycles]);

  // Determine if current user joined that cycle
  useEffect(() => {
    async function checkJoined() {
      if (!isOpen || !winningCycle) return;

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user ?? null;

      if (!user) {
        setUserJoined(false);
        setUserEmail(null);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: sub, error } = await supabase
        .from('cycle_subscriptions')
        .select('id,status')
        .eq('user_id', user.id)
        .eq('cycle_id', winningCycle.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        setUserJoined(false);
        return;
      }

      setUserJoined(Boolean(sub));
    }

    checkJoined();
  }, [isOpen, winningCycle]);

  const mode = useMemo<'winner' | 'spectator'>(() => {
    return userJoined ? 'winner' : 'spectator';
  }, [userJoined]);

  if (!isOpen || !winningCycle) return null;

  const close = () => setIsOpen(false);

  const goToCycle = () => {
    // Use dashboard with query param so it auto-selects
    router.push(`/dashboard?cycle=${winningCycle.id}`);
    router.refresh();
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-gray-900 border-2 border-yellow-500 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden">
        <button onClick={close} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="space-y-6">
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Trophy className="w-10 h-10 text-black" />
          </div>

          {mode === 'winner' ? (
            <>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">BOOM! 🎯</h2>
                <p className="text-yellow-500 font-bold uppercase text-xs tracking-widest">
                  You were in the winning cycle
                </p>
              </div>

              <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
                <p className="text-gray-400 text-sm mb-1">Target Cleared:</p>
                <p className="text-white font-bold">{winningCycle.name}</p>
              </div>

              <p className="text-gray-400 text-xs italic leading-relaxed px-2">
                Congrats{userEmail ? `, ${userEmail}` : ''}. Lock in the next cycle early and keep stacking.
              </p>

              <Button
                onClick={goToCycle}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-6 rounded-2xl text-lg"
              >
                <PartyPopper className="w-5 h-5 mr-2" /> VIEW WINNING CYCLE
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">A CYCLE JUST HIT 💥</h2>
                <p className="text-yellow-500 font-bold uppercase text-xs tracking-widest">
                  You weren&apos;t in it — but you can catch the next one
                </p>
              </div>

              <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
                <p className="text-gray-400 text-sm mb-1">Winning Cycle:</p>
                <p className="text-white font-bold">{winningCycle.name}</p>
              </div>

              <p className="text-gray-400 text-xs italic leading-relaxed px-2">
                This is exactly why we run cycles. Don&apos;t watch the next one from the sidelines.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={goToCycle}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-black py-6 rounded-2xl text-sm"
                >
                  <Zap className="w-4 h-4 mr-2" /> OPEN CYCLES
                </Button>
                <Button
                  onClick={() => {
                    router.push('/jackpots');
                    router.refresh();
                    close();
                  }}
                  variant="outline"
                  className="border-gray-800 text-gray-200 py-6 rounded-2xl text-sm"
                >
                  <Lock className="w-4 h-4 mr-2" /> BUY SINGLE
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
