'use client'

import { useEffect } from 'react'
import { CheckCircle2, XCircle, Info, AlertCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'success', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-sky-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
  }

  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    info: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  }

  return (
    <div className="fixed top-4 right-4 z-[110] w-[calc(100%-2rem)] max-w-[320px] animate-in fade-in slide-in-from-right-8 duration-500 ease-out">
      <div className={`relative overflow-hidden ${bgColors[type]} border rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          {icons[type]}
          <p className="text-sm font-bold leading-tight">{message}</p>
        </div>
        <button onClick={onClose} className="shrink-0 opacity-40 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
