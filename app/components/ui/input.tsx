import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl bg-[#111118] border border-white/[0.08] px-4 py-2 text-sm text-[#f1f1f8] font-sans',
          'placeholder:text-[#5a5a78]',
          'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
