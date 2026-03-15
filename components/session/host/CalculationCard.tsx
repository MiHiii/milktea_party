'use client'

import * as React from 'react'
import { formatVND } from '@/lib/calc'
import { Receipt, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface CalculationCardProps {
  originalTotal: number
  discountVal: number
  finalTotal: string
  estimatedPayable: number
  setFinalTotal: (val: string) => void
  label?: string
  isSplit?: boolean
}

export function CalculationCard({
  originalTotal,
  discountVal,
  finalTotal,
  estimatedPayable,
  setFinalTotal,
  label = "TỔNG CẦN TRẢ (TỪ HOST)",
  isSplit = false
}: CalculationCardProps) {
  const diff = (Number(finalTotal) || estimatedPayable) - (originalTotal - discountVal)
  
  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden rounded-[2rem]">
      <div className="p-6 space-y-4 pb-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/40 font-medium">Tổng nguyên giá (món)</span>
          <span className="font-bold tabular-nums">{formatVND(originalTotal)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-emerald-400/60 font-medium">Ưu đãi / Giảm giá</span>
          <span className="text-emerald-400 font-bold tabular-nums">-{formatVND(discountVal)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-amber-400/60 font-medium">Phí ship & Điều chỉnh</span>
          <span className={`font-bold tabular-nums ${diff >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {diff >= 0 ? '+' : ''}{formatVND(diff)}
          </span>
        </div>
      </div>
      
      <div className="bg-black/40 p-6 pt-4 space-y-3 border-t border-white/5">
        <label className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative">
          <Input 
            type="number" 
            placeholder={String(estimatedPayable)}
            className="h-16 bg-slate-900 border-white/10 rounded-2xl text-3xl font-black text-white pl-14 shadow-inner focus:ring-sky-500/50" 
            value={finalTotal}
            onChange={(e) => setFinalTotal(e.target.value)}
          />
          <Receipt className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-sky-500" />
        </div>
        <div className="flex items-center gap-2 px-1">
          <Info className="w-3 h-3 text-white/20" />
          <p className="text-[9px] text-white/20 italic">Nhập tổng tiền thực tế bạn đã trả cho cửa hàng.</p>
        </div>
      </div>
    </Card>
  )
}
