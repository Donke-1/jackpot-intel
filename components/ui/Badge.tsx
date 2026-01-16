import React from 'react';
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'neon';
  className?: string;
}

export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  const variants = {
    // Standard Neutrals
    default: "bg-gray-800 text-gray-300 border-transparent",
    secondary: "bg-gray-700 text-gray-400 border-transparent", // <--- Added back for 'Refunded' states
    outline: "border border-gray-700 text-gray-400",
    
    // Status Indicators
    destructive: "bg-red-900/50 text-red-400 border border-red-900",
    success: "bg-green-900/50 text-green-400 border border-green-900",
    warning: "bg-yellow-900/50 text-yellow-400 border border-yellow-900",
    
    // Special Effects
    neon: "bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]",
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", 
        variants[variant], 
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}