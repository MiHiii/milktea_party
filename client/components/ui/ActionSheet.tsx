'use client'

import * as React from 'react'
import { X, Camera, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionSheetOption {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface ActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  options: ActionSheetOption[]
}

export function ActionSheet({ isOpen, onClose, title, options }: ActionSheetProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) setMounted(true)
  }, [isOpen])

  if (!mounted) return null

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4 transition-opacity duration-300",
        isOpen ? "bg-black/60 opacity-100" : "bg-black/0 opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <div 
        className={cn(
          "w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden transition-transform duration-300 ease-out shadow-2xl",
          isOpen ? "translate-y-0 scale-100" : "translate-y-full scale-95"
        )}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-4 border-b border-white/5 text-center">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/30">{title}</span>
          </div>
        )}
        
        <div className="p-2 flex flex-col gap-1">
          {options.map((option, index) => (
            <button
              key={index}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all active:scale-[0.98] active:bg-white/5",
                option.variant === 'destructive' ? "text-rose-500" : "text-white hover:bg-white/5"
              )}
              onClick={() => {
                option.onClick()
                onClose()
              }}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center",
                option.variant === 'destructive' ? "bg-rose-500/10" : "bg-white/5"
              )}>
                {option.icon}
              </div>
              <span className="font-bold text-sm tracking-tight">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="p-2 pt-0">
          <button
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-3xl text-white/40 font-bold text-sm hover:bg-white/5 transition-all"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
