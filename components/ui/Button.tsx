import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    
    // 1. Variant Styles
    const variants = {
      default: "bg-cyan-600 text-white hover:bg-cyan-500 shadow-sm",
      destructive: "bg-red-900 text-red-200 hover:bg-red-800",
      outline: "border border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300",
      secondary: "bg-gray-800 text-gray-100 hover:bg-gray-700",
      ghost: "hover:bg-gray-800 hover:text-white text-gray-400",
      link: "text-cyan-500 underline-offset-4 hover:underline",
    }

    // 2. Size Styles
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-md px-8 text-lg",
      icon: "h-10 w-10",
    }

    return (
      <button
        ref={ref}
        className={cn(
          // Base Styles
          "inline-flex items-center justify-center rounded-md font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50",
          // Dynamic Styles
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }