import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200',
  {
    variants: {
      variant: {
        open: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        locked: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        paid: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
        unpaid: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
        default: 'bg-white/10 text-white/70 border border-white/20',
        host: 'bg-sky-500/30 text-sky-300 border border-sky-500/40',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
