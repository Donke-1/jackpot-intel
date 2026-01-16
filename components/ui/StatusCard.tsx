'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  deadline: string;
  status: string;
}

export default function StatusCard({ deadline, status }: StatusCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const distance = target - now;

      if (distance < 0) {
        setIsLocked(true);
        setTimeLeft("LOCKED / IN PROGRESS");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    };

    updateTimer(); // Run immediately
    const timer = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className={cn("p-3 rounded-full", isLocked ? "bg-red-900/20" : "bg-cyan-900/20")}>
          {isLocked ? <AlertTriangle className="text-red-500" /> : <Clock className="text-cyan-500" />}
        </div>
        <div>
          <h4 className="text-sm text-gray-400 font-medium uppercase tracking-wider">Time Remaining</h4>
          <p className={cn("text-xl font-bold font-mono", isLocked ? "text-red-500" : "text-white")}>
            {timeLeft || "CALCULATING..."}
          </p>
        </div>
      </div>
      
      {status === 'success' && (
        <div className="hidden md:flex items-center space-x-2 text-green-500 bg-green-900/10 px-4 py-2 rounded-lg border border-green-900/50">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold">GOAL HIT</span>
        </div>
      )}
    </div>
  );
}