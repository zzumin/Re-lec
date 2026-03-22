import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border',
  {
    variants: {
      variant: {
        purple: 'bg-violet-500/15 border-violet-500/20 text-violet-400',
        cyan:   'bg-cyan-500/15 border-cyan-500/20 text-cyan-300',
        green:  'bg-emerald-500/15 border-emerald-500/20 text-emerald-300',
        amber:  'bg-amber-500/15 border-amber-500/30 text-amber-300',
        semester: 'bg-violet-500/15 border-violet-500/30 text-violet-400 px-3 py-1 text-xs font-semibold rounded-full',
      },
    },
    defaultVariants: {
      variant: 'purple',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
