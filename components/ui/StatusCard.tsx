'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  deadline?: string;
  status: string;
}

function formatRemaining(ms: number) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
}

export default function StatusCard({ deadline, status }: StatusCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('—');
  const [ended, setEnded] = useState(false);

  const statusBadge = useMemo(() => {
    if (status === 'won') {
      return (
        <div className="hidden md:flex items-center space-x-2 text-green-500 bg-green-900/10 px-4 py-2 rounded-lg border border-green-900/50">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold">GOAL HIT</span>
        </div>
      );
    }
    if (status === 'waiting') {
      return (
        <div className="hidden md:flex items-center space-x-2 text-amber-400 bg-amber-900/10 px-4 py-2 rounded-lg border border-amber-900/50">
          <PauseCircle className="w-5 h-5" />
          <span className="font-bold">WAITING</span>
        </div>
      );
    }
    if (status === 'expired') {
      return (
        <div className="hidden md:flex items-center space-x-2 text-red-400 bg-red-900/10 px-4 py-2 rounded-lg border border-red-900/50">
          <XCircle className="w-5 h-5" />
          <span className="font-bold">EXPIRED</span>
        </div>
      );
    }
    if (status === 'archived') {
      return (
        <div className="hidden md:flex items-center space-x-2 text-gray-400 bg-gray-900/10 px-4 py-2 rounded-lg border border-gray-800/50">
          <XCircle className="w-5 h-5" />
          <span className="font-bold">ARCHIVED</span>
        </div>
      );
    }
    return null;
  }, [status]);

  useEffect(() => {
    const updateTimer = () => {
      if (!deadline) {
        setTimeLeft('—');
        setEnded(false);
        return;
      }

      const target = new Date(deadline).getTime();
      if (Number.isNaN(target)) {
        setTimeLeft('—');
        setEnded(false);
        return;
      }

      const now = Date.now();
      const distance = target - now;

      if (distance <= 0) {
        setEnded(true);
        setTimeLeft('LOCKED / ENDED');
      } else {
        setEnded(false);
        setTimeLeft(formatRemaining(distance));
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 60000);
    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className={cn('p-3 rounded-full', ended ? 'bg-red-900/20' : 'bg-cyan-900/20')}>
          {ended ? <AlertTriangle className="text-red-500" /> : <Clock className="text-cyan-500" />}
        </div>
        <div>
          <h4 className="text-sm text-gray-400 font-medium uppercase tracking-wider">Time Remaining</h4>
          <p className={cn('text-xl font-bold font-mono', ended ? 'text-red-500' : 'text-white')}>
            {timeLeft || '—'}
          </p>
        </div>
      </div>

      {statusBadge}
    </div>
  );
}
