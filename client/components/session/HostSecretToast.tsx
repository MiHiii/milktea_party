'use client'

import { useEffect, useState, useRef } from 'react'
import { Check, X } from 'lucide-react'

interface HostSecretToastProps {
  secretCode: string
  onClose: () => void
}

export function HostSecretToast({ secretCode, onClose }: HostSecretToastProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const duration = 10000 // 10 seconds

  // Timer logic - only marks as expired, doesn't close immediately if being revealed
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpired(true)
    }, duration)

    return () => clearTimeout(timer)
  }, [])

  // Close logic: close if expired AND not being revealed
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
    // If the 10s timer already finished while they were holding, 
    // the useEffect above will trigger onClose() immediately.
  }

  return (
    <div className="w-full mb-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="relative overflow-hidden bg-sky-500/5 border border-sky-500/20 rounded-2xl p-3 backdrop-blur-md group">

        {/* Progress Bar Animation (Bottom) */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-sky-500/40 w-full overflow-hidden">
          <div className="h-full bg-sky-400 animate-progress-shrink origin-left" style={{ animationDuration: '10s' }} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm text-sky-400 font-bold whitespace-nowrap">🔑 Mã chủ phòng:</span>

            <div 
              className="relative cursor-pointer touch-none flex-1 max-w-[120px]"
              onMouseDown={handleReveal}
              onMouseUp={handleHide}
              onMouseLeave={handleHide}
              onTouchStart={(e) => { e.preventDefault(); handleReveal(); }}
              onTouchEnd={handleHide}
            >
              <div className={`
                px-2 py-1 rounded-lg border transition-all duration-300 text-center flex items-center justify-center gap-2
                ${isRevealed ? 'bg-sky-500/20 border-sky-500/40' : 'bg-white/5 border-white/10'}
              `}>
                <span className={`font-mono font-bold tracking-widest text-sm transition-all duration-300 ${isRevealed ? 'text-white' : 'text-white/10 blur-[3px]'}`}>
                  {isRevealed ? secretCode : '••••••'}
                </span>
                {isRevealed && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </div>
            </div>

            <span className="text-[10px] text-white/30 truncate">
              {isCopied ? 'Đã sao chép! ✅' : '(Nhấn giữ để xem/copy)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
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
