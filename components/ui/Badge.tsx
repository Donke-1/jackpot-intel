import React from 'react'; // <--- ADDED THIS
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'success' | 'warning' | 'neon';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: "bg-gray-800 text-gray-300",
    outline: "border border-gray-700 text-gray-400",
    destructive: "bg-red-900/50 text-red-400 border border-red-900",
    success: "bg-green-900/50 text-green-400 border border-green-900",
    warning: "bg-yellow-900/50 text-yellow-400 border border-yellow-900",
    neon: "bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]",
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}