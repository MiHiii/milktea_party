'use client'

import { OrderItem as OrderItemType, Session, OrderBatch } from '@/lib/types'
import { formatVND } from '@/lib/calc'
import {
  Minus, Plus, QrCode, Snowflake, Candy, Copy, Pencil, Trash2, Loader2, Save, Users, ChevronDown, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderItemProps {
  item: OrderItemType
  session: Session
  orderBatches: OrderBatch[]
  myParticipantId: string | null
  iAmHost: boolean
  isEditing: boolean
  editDraft: {
    itemName: string
    price: string
    quantity: string
    note: string
    ice: string
    sugar: string
    orderBatchId: string | null
    paySeparate: boolean
  }
  setEditDraft: React.Dispatch<React.SetStateAction<any>>
  onStartEdit: (item: OrderItemType) => void
  onSaveEdit: (itemId: string) => void
  onCancelEdit: () => void
  onDeleteItem: (itemId: string) => void
  onCopyItem: (item: OrderItemType) => void
  isLoading: boolean
  PERCENT_OPTIONS: string[]
}

export function OrderItem({
  item,
  session,
  orderBatches = [],
  myParticipantId,
  iAmHost,
  isEditing,
  editDraft,
  setEditDraft,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteItem,
  onCopyItem,
  isLoading,
  PERCENT_OPTIONS
}: OrderItemProps) {
  const canEditItem = (iAmHost && ['open', 'locked', 'ordered'].includes(session.status)) || 
                   (item.participantId === myParticipantId && session.status === 'open')

  if (isEditing) {
    return (
      <div className="flex flex-col gap-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4 my-2 slide-up">
        {/* Nhóm thông tin chính: Tên món */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Tên món</label>
          <input
            className="h-10 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all"
            value={editDraft.itemName}
            onChange={e => setEditDraft((d: any) => ({ ...d, itemName: e.target.value }))}
          />
        </div>

        {/* Hàng Đơn giá & SL */}
        <div className="flex gap-3">
          <div className="flex-[2] flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Giá</label>
            <input
              type="number"
              className="h-10 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={editDraft.price}
              onChange={e => setEditDraft((d: any) => ({ ...d, price: e.target.value }))}
            />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1 text-center">Số lượng</label>
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl h-10 overflow-hidden">
              <button
                type="button"
                onClick={() => { const val = Number(editDraft.quantity); if (val > 1) setEditDraft((d: any) => ({ ...d, quantity: String(val - 1) })) }}
                className="flex-1 h-full flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-black text-sky-400 tabular-nums">{editDraft.quantity}</span>
              <button
                type="button"
                onClick={() => { const val = Number(editDraft.quantity); if (val < 99) setEditDraft((d: any) => ({ ...d, quantity: String(val + 1) })) }}
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
          <input
            className="h-8 bg-black/40 border border-white/10 rounded-lg px-3 text-[13px] text-white italic focus:outline-none focus:border-sky-500/50 transition-all"
            value={editDraft.note}
            onChange={e => setEditDraft((d: any) => ({ ...d, note: e.target.value }))}
            placeholder="Ghi chú..."
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
                  onClick={() => setEditDraft((d: any) => ({ ...d, sugar: opt }))}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-full transition-all ${editDraft.sugar === opt ? 'bg-sky-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
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
                  onClick={() => setEditDraft((d: any) => ({ ...d, ice: opt }))}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-full transition-all ${editDraft.ice === opt ? 'bg-sky-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CHIA ĐƠN */}
        {session.isSplitBatch && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-emerald-500/60 font-black uppercase ml-1 tracking-[0.15em]">CHIA ĐƠN</label>
            <div className="relative w-full">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40 z-10" />
              <select
                className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl pl-10 pr-10 h-10 text-sm text-emerald-400 font-bold appearance-none focus:outline-none focus:border-emerald-500/40 transition-all"
                value={editDraft.orderBatchId || ''}
                onChange={e => setEditDraft((d: any) => ({ ...d, orderBatchId: e.target.value || null }))}
              >
                {orderBatches.map(b => <option key={b.id} value={b.id} className="bg-slate-900 text-white">{b.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
            </div>
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-3 px-1">
          <label className="relative flex items-center justify-center cursor-pointer group">
            <input
              type="checkbox"
              checked={!!editDraft.paySeparate}
              onChange={e => setEditDraft((d: any) => ({ ...d, paySeparate: e.target.checked }))}
              className="peer sr-only"
            />
            <div className="w-5 h-5 rounded-full border-2 border-white/10 flex items-center justify-center transition-all peer-checked:bg-sky-500 peer-checked:border-sky-500 peer-checked:scale-110 active:scale-90">
              <Check className="w-3 h-3 text-white scale-0 transition-transform peer-checked:scale-100" />
            </div>
          </label>
          <span
            onClick={() => setEditDraft((d: any) => ({ ...d, paySeparate: !editDraft.paySeparate }))}
            className="text-xs text-white/50 cursor-pointer select-none font-medium hover:text-white/70 transition-colors"
          >
            Tạo mã QR thanh toán riêng cho món này
          </span>
        </div>

        {/* Footer Buttons */}        <div className="flex gap-3 mt-2">
          <Button variant="ghost" className="flex-1 h-11 text-xs text-white/40 hover:bg-white/5 rounded-xl" onClick={onCancelEdit}>Huỷ</Button>
          <Button
            className="flex-[2] h-11 text-xs font-black uppercase tracking-wider bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20 rounded-xl"
            onClick={() => onSaveEdit(item.id)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Lưu thay đổi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col py-2 border-b border-white/[0.03] last:border-0 border-dashed">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 truncate flex-1">
          <span className="shrink-0 flex items-center justify-center bg-white/5 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white/30 border border-white/5">{item.quantity}</span>
          <span className="text-white/70 text-xs truncate font-medium">{item.itemName}</span>
          {item.paySeparate && <QrCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
        </div>
        <span className="tabular-nums text-white/90 text-[11px] font-black shrink-0">{formatVND(item.price * item.quantity)}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 items-center">
            {session.isSplitBatch && (() => {
              const b = orderBatches.find(bt => bt.id === item.orderBatchId);
              return b ? (<span className="text-[8px] font-black text-emerald-400/50 uppercase tracking-tighter bg-emerald-500/5 px-1.5 py-0.5 rounded-full border border-emerald-500/5">{b.name}</span>) : null
            })()}
            {(item.note || item.ice || item.sugar) && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 opacity-25">
                {item.note && <span className="text-[9px] italic truncate max-w-[120px]">{item.note}</span>}
                {item.ice && <span className="text-[8px] font-bold flex items-center gap-0.5"><Snowflake className="w-2 h-2" /> {item.ice}</span>}
                {item.sugar && <span className="text-[8px] font-bold flex items-center gap-0.5"><Candy className="w-2 h-2" /> {item.sugar}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 opacity-20 hover:opacity-100 transition-opacity">
          <button onClick={() => onCopyItem(item)} className="p-1.5 rounded-lg bg-white/5 text-white hover:text-emerald-400 transition-all active:scale-95"><Copy className="w-3 h-3" /></button>
          {canEditItem && (
            <>
              <button onClick={() => onStartEdit(item)} className="p-1.5 rounded-lg bg-white/5 text-white hover:text-sky-400 transition-all active:scale-95"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => onDeleteItem(item.id)} className="p-1.5 rounded-lg bg-white/5 text-white hover:text-rose-400 transition-all active:scale-95"><Trash2 className="w-3 h-3" /></button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
