'use client'

import { useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Session, OrderBatch } from '@/lib/types'
import { 
  ShoppingBag, Minus, Plus, Users, ChevronDown, Check, RefreshCw, Loader2, CheckCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OrderFormProps {
  session: Session
  orderBatches?: OrderBatch[]
  form: UseFormReturn<any>
  onSubmit: (data: any) => void
  onClear: () => void
  isLoading: boolean
  justAdded: boolean
  PERCENT_OPTIONS: string[]
}

export function OrderForm({
  session,
  orderBatches = [],
  form,
  onSubmit,
  onClear,
  isLoading,
  justAdded,
  PERCENT_OPTIONS
}: OrderFormProps) {
  const { register, watch, setValue, getValues, formState: { errors } } = form

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 bg-black/20 rounded-2xl p-4 border border-white/5">
        {/* Nhóm thông tin chính: Tên món */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Tên món</label>
          <Input 
            id="itemName" 
            placeholder="Ví dụ: Trà sữa Thái" 
            className="h-11 bg-black/20 border-white/10 text-base rounded-xl" 
            error={errors.itemName?.message as string} 
            {...register('itemName')} 
          />
        </div>

        {/* Hàng Đơn giá & SL */}
        <div className="flex gap-3">
          <div className="flex-[2] flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Giá</label>
            <Input 
              id="price" 
              type="number" 
              placeholder="Nhập giá món..." 
              className="h-11 bg-black/20 border-white/10 text-base rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              error={errors.price?.message as string} 
              {...register('price')} 
            />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1 text-center">Số lượng</label>
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl h-11 overflow-hidden">
              <button 
                type="button" 
                onClick={() => { const v = getValues('quantity'); if (v > 1) setValue('quantity', v - 1) }} 
                className="flex-1 h-full flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-base font-black text-sky-400 tabular-nums">{watch('quantity')}</span>
              <button 
                type="button" 
                onClick={() => { const v = getValues('quantity'); if (v < 99) setValue('quantity', v + 1) }} 
                className="flex-1 h-full flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Topping */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Topping / Ghi chú</label>
          <Input 
            id="note" 
            placeholder="Trân châu, thạch, ít ngọt..." 
            className="h-11 bg-black/20 border-white/10 italic text-base rounded-xl" 
            {...register('note')} 
          />
        </div>

        {/* Đường & Đá */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">ĐƯỜNG</label>
            <div className="flex bg-black/40 p-1 rounded-full border border-white/10">
              {PERCENT_OPTIONS.map(opt => (
                <button 
                  key={opt} 
                  type="button" 
                  onClick={() => setValue('sugar', opt)} 
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-full transition-all ${watch('sugar') === opt ? 'bg-sky-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">ĐÁ</label>
            <div className="flex bg-black/40 p-1 rounded-full border border-white/10">
              {PERCENT_OPTIONS.map(opt => (
                <button 
                  key={opt} 
                  type="button" 
                  onClick={() => setValue('ice', opt)} 
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-full transition-all ${watch('ice') === opt ? 'bg-sky-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CHIA ĐƠN */}
        {session.is_split_batch && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-emerald-500/60 font-black uppercase ml-1 tracking-[0.15em]">CHIA ĐƠN</label>
            <div className="relative w-full">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40 z-10" />
              <select 
                className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl pl-10 pr-10 h-11 text-base text-emerald-400 font-bold appearance-none focus:outline-none focus:border-emerald-500/40 transition-all" 
                {...register('order_batch_id')}
              >
                <option value="" className="bg-slate-900 text-white">Mặc định</option>
                {orderBatches.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
            </div>
          </div>
        )}

        {/* Options */}
        <div className="flex items-center justify-between px-1 mt-1">
          <div className="flex items-center gap-3">
            <label className="relative flex items-center justify-center cursor-pointer group">
              <input type="checkbox" {...register('paySeparate')} className="peer sr-only" />
              <div className="w-6 h-6 rounded-full border-2 border-white/10 flex items-center justify-center transition-all peer-checked:bg-sky-500 peer-checked:border-sky-500 peer-checked:scale-110 active:scale-90">
                <Check className="w-4 h-4 text-white scale-0 transition-transform peer-checked:scale-100" />
              </div>
            </label>
            <span 
              onClick={() => setValue('paySeparate', !watch('paySeparate'))} 
              className="text-xs text-white/50 cursor-pointer select-none font-medium hover:text-white/70 transition-colors"
            >
              Tạo mã QR thanh toán riêng cho món này
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClear} 
            className="text-[10px] font-black uppercase text-white/20 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Xoá hết</span>
          </button>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-2xl relative overflow-hidden transition-all active:scale-[0.97] active:brightness-90 shadow-xl shadow-sky-500/10 hover:shadow-sky-500/20">
        {justAdded && (
          <div className="absolute inset-0 bg-emerald-500 text-white flex items-center justify-center gap-2 z-10 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="w-5 h-5" /> Đã thêm món!
          </div>
        )}
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
        <span className="font-bold text-sm ml-2.5 uppercase tracking-wider">Thêm vào đơn hàng</span>
      </Button>
    </form>
  )
}
