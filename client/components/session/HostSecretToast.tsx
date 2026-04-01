'use client'

import { useEffect, useState } from 'react'
import { Check, X, Shield } from 'lucide-react'

interface HostSecretToastProps {
  secretCode: string
  onClose: () => void
}

export function HostSecretToast({ secretCode, onClose }: HostSecretToastProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const duration = 10000 // 10 seconds

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpired(true)
    }, duration)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isExpired && !isRevealed) {
      onClose()
    }
  }, [isExpired, isRevealed, onClose])

  const handleReveal = () => {
    setIsRevealed(true)
    navigator.clipboard.writeText(secretCode)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleHide = () => {
    setIsRevealed(false)
  }

  return (
    <div className="fixed top-20 right-4 z-[100] w-[calc(100%-2rem)] max-w-[320px] animate-in fade-in slide-in-from-right-8 duration-500 ease-out">
      <div className="relative overflow-hidden bg-slate-900/90 border border-sky-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl group">
        
        {/* Progress Bar Animation (Bottom) */}
        <div className="absolute bottom-0 left-0 h-1 bg-sky-500/20 w-full overflow-hidden">
          <div className="h-full bg-sky-400 animate-progress-shrink origin-left" style={{ animationDuration: '10s' }} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-sm font-bold text-white">Mã chủ phòng</span>
            </div>
            <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div 
              className="relative cursor-pointer touch-none"
              onMouseDown={handleReveal}
              onMouseUp={handleHide}
              onMouseLeave={handleHide}
              onTouchStart={(e) => { e.preventDefault(); handleReveal(); }}
              onTouchEnd={handleHide}
            >
              <div className={`
                px-4 py-3 rounded-xl border transition-all duration-300 text-center flex items-center justify-center gap-3
                ${isRevealed ? 'bg-sky-500/20 border-sky-500/40' : 'bg-white/5 border-white/10'}
              `}>
                <span className={`font-mono font-bold tracking-[0.3em] text-lg transition-all duration-300 ${isRevealed ? 'text-white' : 'text-white/10 blur-[4px]'}`}>
                  {isRevealed ? secretCode : '••••••'}
                </span>
                {isRevealed && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </div>
            </div>
            
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-white/40 italic">
                {isCopied ? 'Đã sao chép! ✅' : 'Nhấn giữ để xem/copy'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress-shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        .animate-progress-shrink {
          animation: progress-shrink 10s linear forwards;
        }
      `}</style>
    </div>
  )
}
