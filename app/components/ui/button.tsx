import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)]',
        secondary:
          'bg-[#16161f] text-[#f1f1f8] border border-white/[0.08] hover:bg-[#1e1e2a]',
        ghost:
          'text-[#9494b0] hover:bg-white/[0.04] hover:text-[#f1f1f8]',
        outline:
          'border border-white/[0.08] bg-transparent text-[#f1f1f8] hover:bg-white/[0.04]',
      },
      size: {
        default: 'h-10 px-6 py-2',
        sm: 'h-8 px-3.5 py-1.5 text-xs rounded-lg',
        lg: 'h-12 px-8 py-3.5 text-[15px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
