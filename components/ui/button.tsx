import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'modern'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
    
    const variants = {
      default: 'bg-brand-900 text-white hover:bg-brand-800 focus-visible:ring-brand-500 shadow-sm',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      outline: 'border border-white/20 bg-white/10 text-white hover:bg-brand-800 hover:text-white hover:border-brand-600 backdrop-blur-sm',
      secondary: 'bg-white/10 text-white hover:bg-white/20 border border-white/20 backdrop-blur-sm',
      ghost: 'text-gray-200 hover:bg-white/10 hover:text-white',
      link: 'text-brand-400 underline-offset-4 hover:underline hover:text-brand-300',
      modern: 'bg-gradient-to-r from-brand-900 to-brand-800 text-white hover:from-brand-800 hover:to-brand-700 shadow-lg hover:shadow-xl',
    }

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-12 rounded-lg px-8 text-base',
      icon: 'h-10 w-10',
    }

    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
