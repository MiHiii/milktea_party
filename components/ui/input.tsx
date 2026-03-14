import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-white/80">
            {label}
          </label>
        )}
        <input
          type={type}
          id={id}
          className={cn(
            'flex h-11 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 backdrop-blur',
            'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            error && 'border-rose-500 focus:ring-rose-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
