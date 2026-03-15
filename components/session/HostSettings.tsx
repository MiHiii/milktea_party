'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Session, OrderBatch, OrderItem, Participant } from '@/lib/types'
import { formatVND } from '@/lib/calc'
import { 
  Settings, Users, Lock, QrCode, X as XIcon, Loader2, Receipt, Pencil, Plus, Save, ChevronDown, Check, User, Trash2, AlertTriangle, CheckCircle, Camera
} from 'lucide-react'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

interface HostSettingsProps {
  session: Session
  participants: Participant[]
  orderBatches: OrderBatch[]
  orderItems: OrderItem[]
  isLoading: boolean
  isToggling: boolean
  isProcessingQR: boolean
  qrPreviewUrl: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  hostTab: 'total' | 'detail'
  setHostTab: (tab: 'total' | 'detail') => void
  expandedPayment: boolean
  setExpandedPayment: (val: boolean) => void
  finalTotal: string
  setFinalTotal: (val: string) => void
  batchFinalTotals: Record<string, string>
  setBatchFinalTotals: React.Dispatch<React.SetStateAction<Record<string, string>>>
  editingBatchName: string | null
  setEditingBatchName: React.Dispatch<React.SetStateAction<string | null>>
  batchNameDraft: string
  setBatchNameDraft: React.Dispatch<React.SetStateAction<string>>
  showNewBatch: boolean
  setShowNewBatch: React.Dispatch<React.SetStateAction<boolean>>
  newBatchDraft: string
  setNewBatchDraft: React.Dispatch<React.SetStateAction<string>>
  paymentMode: 'global' | 'per_session'
  setPaymentMode: React.Dispatch<React.SetStateAction<'global' | 'per_session'>>
  bankNameInput: string
  setBankNameInput: React.Dispatch<React.SetStateAction<string>>
  bankAccountInput: string
  setBankAccountInput: React.Dispatch<React.SetStateAction<string>>
  showPasswordEdit: boolean
  setShowPasswordEdit: React.Dispatch<React.SetStateAction<boolean>>
  hostPasswordDraft: string
  setHostPasswordDraft: React.Dispatch<React.SetStateAction<string>>
  discountForm: UseFormReturn<any>
  personalDiscounts: Record<string, { type: 'amount' | 'percent', value: number }>
  onUpdatePersonalDiscount: (pId: string, type: 'amount' | 'percent', value: number) => void
  onUpdateDiscountShip: (data: any) => void
  onSaveBatchTotal: (e: React.FormEvent) => void
  onAddBatch: () => void
  onDeleteBatch: (batchId: string, name: string) => void
  onUpdateBatchName: (batchId: string, newName: string) => void
  onUpdateBatchBank: (batchId: string, name: string, account: string, qrPayload: string) => void
  onToggleSplitBatch: (isSplit: boolean) => void
  onToggleDefaultQr: (useDefault: boolean) => void
  onTogglePassword: (enabled: boolean) => void
  onSavePassword: () => void
  onSaveGlobalBank: () => void
  onTriggerActionSheet: (batchId?: string | null) => void
  BANK_OPTIONS: any[]
}

export function HostSettings({
  session,
  participants,
  orderBatches = [],
  orderItems,
  isLoading,
  isToggling,
  isProcessingQR,
  qrPreviewUrl,
  open,
  onOpenChange,
  hostTab,
  setHostTab,
  expandedPayment,
  setExpandedPayment,
  finalTotal,
  setFinalTotal,
  batchFinalTotals,
  setBatchFinalTotals,
  editingBatchName,
  setEditingBatchName,
  batchNameDraft,
  setBatchNameDraft,
  showNewBatch,
  setShowNewBatch,
  newBatchDraft,
  setNewBatchDraft,
  paymentMode,
  setPaymentMode,
  bankNameInput,
  setBankNameInput,
  bankAccountInput,
  setBankAccountInput,
  showPasswordEdit,
  setShowPasswordEdit,
  hostPasswordDraft,
  setHostPasswordDraft,
  discountForm,
  personalDiscounts,
  onUpdatePersonalDiscount,
  onUpdateDiscountShip,
  onSaveBatchTotal,
  onAddBatch,
  onDeleteBatch,
  onUpdateBatchName,
  onUpdateBatchBank,
  onToggleSplitBatch,
  onToggleDefaultQr,
  onTogglePassword,
  onSavePassword,
  onSaveGlobalBank,
  onTriggerActionSheet,
  BANK_OPTIONS
}: HostSettingsProps) {
  const iGT = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleBatchNameChange = (batchId: string, newName: string) => {
    setBatchNameDraft(newName)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onUpdateBatchName(batchId, newName)
    }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] bg-slate-900 border-white/10 text-white sm:max-w-xl p-0 flex flex-col overflow-hidden rounded-[2rem] shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" /> Cài đặt Host
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Nhóm 1: Chia Đơn (Cơ bản) */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Quản lý đơn hàng</label>
            <Card className="bg-white/5 border-white/10 p-4 rounded-3xl flex flex-col gap-4 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-300 ${session.is_split_batch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Chia nhiều đơn con</span>
                    <span className="text-[11px] text-white/40">Gom nhóm (Đơn 1, Đơn 2...)</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={session.is_split_batch} 
                    onChange={(e) => onToggleSplitBatch(e.target.checked)} 
                    disabled={isToggling}
                  />
                  <div className="w-12 h-6.5 bg-white/10 rounded-full peer peer-checked:bg-emerald-500 transition-colors relative">
                    <div className={`absolute top-[3px] left-[3px] bg-white rounded-full h-5 w-5 transition-all flex items-center justify-center shadow-lg ${session.is_split_batch ? 'translate-x-[22px]' : ''}`}>
                      {isToggling && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
                    </div>
                  </div>
                </label>
              </div>

              {session.is_split_batch && (
                <div className="flex flex-col gap-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                  {showNewBatch ? (
                    <div className="bg-black/20 p-3 rounded-2xl border border-dashed border-sky-500/30">
                      <div className="flex items-center gap-3">
                        <Input 
                          autoFocus 
                          placeholder="Tên đơn mới..." 
                          className="h-11 text-base bg-black/40 border-none rounded-xl" 
                          value={newBatchDraft} 
                          onChange={e => setNewBatchDraft(e.target.value)} 
                          onKeyDown={e => { if (e.key === 'Enter') onAddBatch() }} 
                        />
                        <Button size="sm" className="h-11 px-4 bg-sky-600 hover:bg-sky-500 rounded-xl font-bold" disabled={!newBatchDraft || isLoading} onClick={onAddBatch}>
                          Thêm
                        </Button>
                        <button onClick={() => setShowNewBatch(false)} className="p-2 text-white/20 hover:text-white/60"><XIcon className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowNewBatch(true)} 
                      className="w-full h-12 rounded-2xl border-2 border-dashed border-white/5 text-white/30 flex items-center justify-center gap-2 hover:bg-white/5 hover:border-white/10 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" /> Thêm đợt đơn mới
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Nhóm 2: Bảo mật */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Bảo mật</label>
            <Card className="bg-white/5 border-white/10 p-4 rounded-3xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-300 ${session.has_password ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/20'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Bảo vệ mật khẩu</span>
                    <span className={`text-[10px] font-bold uppercase ${session.has_password ? 'text-sky-400' : 'text-white/20'}`}>
                      {session.has_password ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={!!session.has_password || showPasswordEdit} 
                    onChange={(e) => onTogglePassword(e.target.checked)} 
                  />
                  <div className="w-12 h-6.5 bg-white/10 rounded-full peer peer-checked:bg-emerald-500 transition-colors relative">
                    <div className={`absolute top-[3px] left-[3px] bg-white rounded-full h-5 w-5 transition-all shadow-lg ${!!session.has_password || showPasswordEdit ? 'translate-x-[22px]' : ''}`} />
                  </div>
                </label>
              </div>
              
              {showPasswordEdit && (
                <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 pt-1">
                  <Input 
                    autoFocus 
                    placeholder="Nhập mật khẩu mới..." 
                    className="h-11 bg-black/40 border-white/10 rounded-2xl px-4 text-base" 
                    value={hostPasswordDraft} 
                    onChange={e => setHostPasswordDraft(e.target.value)} 
                  />
                  <Button className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold uppercase text-xs" onClick={onSavePassword} disabled={!hostPasswordDraft || isLoading}>
                    Lưu
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Nhóm 3: Thanh toán */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Thông tin ngân hàng nhận tiền</label>
            <Card className="bg-white/5 border-white/10 p-4 rounded-3xl flex flex-col gap-4 transition-all duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-300 ${expandedPayment ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/20'}`}>
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Ngân hàng nhận tiền</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter italic">Tất cả đơn con sẽ dùng chung thông tin này</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={expandedPayment} 
                    onChange={(e) => setExpandedPayment(e.target.checked)} 
                  />
                  <div className="w-12 h-6.5 bg-white/10 rounded-full peer peer-checked:bg-emerald-500 transition-colors relative">
                    <div className={`absolute top-[3px] left-[3px] bg-white rounded-full h-5 w-5 transition-all shadow-lg ${expandedPayment ? 'translate-x-[22px]' : ''}`} />
                  </div>
                </label>
              </div>

              {expandedPayment && (
                <div className="flex flex-col gap-4 animate-in slide-in-from-top-2 duration-500 pt-3 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Cột 1: Nhập tay */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-1">Ngân hàng</label>
                        <Select value={bankNameInput} onValueChange={setBankNameInput}>
                          <SelectTrigger className="h-11 bg-black/40 border-white/10 rounded-2xl text-base">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-white/10">
                            {BANK_OPTIONS.map((b) => (
                              <SelectItem key={b.code} value={b.code} className="text-base">{b.shortName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-1">Số tài khoản</label>
                        <div className="relative">
                          <Input 
                            placeholder="Số tài khoản..." 
                            className="h-11 bg-black/40 border-white/10 rounded-2xl text-base" 
                            value={bankAccountInput} 
                            onChange={(e) => setBankAccountInput(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: QR Dropzone */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-white/30 uppercase ml-1">Quét/Tải ảnh QR</label>
                      <button 
                        onClick={() => onTriggerActionSheet(null)}
                        className="flex-1 min-h-[100px] bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-sky-500/30 transition-all group relative overflow-hidden"
                      >
                        {qrPreviewUrl ? (
                          <>
                            <img src={qrPreviewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                            <div className="relative z-10 flex flex-col items-center gap-1">
                              <QrCode className="w-6 h-6 text-white" />
                              <span className="text-[10px] font-black text-white uppercase tracking-widest">Đổi ảnh QR</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Camera className="w-5 h-5 text-sky-400" />
                            </div>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Chụp hoặc Tải ảnh</span>
                          </>
                        )}
                        {isProcessingQR && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
                      </button>
                    </div>
                    </div>

                    <Button className="h-12 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-600/20" onClick={onSaveGlobalBank} disabled={isLoading}>

                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu thông tin thanh toán'}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-col gap-4 mt-2 pb-10">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 relative h-12 overflow-hidden shadow-inner">
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-sky-600 rounded-xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-0 ${hostTab === 'detail' ? 'translate-x-full' : 'translate-x-0'}`}
              />
              <button 
                type="button" 
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest z-10 transition-colors duration-500 ${hostTab === 'total' ? 'text-white' : 'text-white/20'}`} 
                onClick={() => setHostTab('total')}
              >
                <Receipt className="w-4 h-4" /> Tổng tiền
              </button>
              <button 
                type="button" 
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest z-10 transition-colors duration-500 ${hostTab === 'detail' ? 'text-white' : 'text-white/20'}`} 
                onClick={() => setHostTab('detail')}
              >
                <Users className="w-4 h-4" /> Chi tiết
              </button>
            </div>

            <div className="min-h-[350px]">
              {hostTab === 'total' ? (
                <form onSubmit={onSaveBatchTotal} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
                  {session.is_split_batch ? (
                    <div className="flex flex-col gap-3">
                      {orderBatches.map(batch => {
                        const bIT = orderItems.filter(i => i.order_batch_id === batch.id).reduce((s, i) => s + i.price * i.quantity, 0)
                        const val = batchFinalTotals[batch.id] || ''
                        return (
                          <div key={batch.id} className="flex flex-col gap-3 bg-white/5 p-4 rounded-[1.5rem] border border-white/10 hover:bg-white/[0.07] transition-all">
                            <div className="flex justify-between items-center h-6">
                              <div className="flex items-center gap-1 flex-1">
                                <Input 
                                  className="h-8 text-base bg-black/40 border-emerald-500/20 px-3 flex-1 focus:border-emerald-500/50 rounded-lg font-bold uppercase tracking-tight" 
                                  defaultValue={batch.name} 
                                  onChange={e => handleBatchNameChange(batch.id, e.target.value)}
                                />
                                {!batch.is_default && (
                                  <button 
                                    type="button"
                                    onClick={() => onDeleteBatch(batch.id, batch.name)}
                                    className="p-2 text-white/10 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-white/30 ml-3 tabular-nums">Món: {formatVND(bIT)}</span>
                            </div>
                            <div className="relative">
                              <Input 
                                placeholder="Số tiền thanh toán thực tế..." 
                                type="number" 
                                className="h-12 bg-black/40 border-white/10 pl-11 rounded-xl text-base" 
                                value={val} 
                                onChange={(e) => setBatchFinalTotals(prev => ({ ...prev, [batch.id]: e.target.value }))} 
                              />
                              <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-500/40" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 text-center shadow-inner">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 ml-1">Tổng giá trị tất cả món ăn</p>
                        <p className="text-4xl font-black text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{formatVND(iGT)}</p>
                      </div>
                      <div className="relative">
                        <Input 
                          id="finalTotal" 
                          label="Số tiền thực tế bạn thanh toán (đơn gộp)" 
                          type="number" 
                          className="h-14 bg-black/40 border-white/10 pl-12 rounded-2xl text-lg font-bold text-sky-400" 
                          placeholder={String(iGT)} 
                          value={finalTotal} 
                          onChange={(e) => setFinalTotal(e.target.value)} 
                        />
                        <Receipt className="absolute left-4 top-[calc(50%+8px)] -translate-y-1/2 w-6 h-6 text-sky-500/40" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="ghost" className="flex-1 h-12 border border-white/5 text-white/20 rounded-2xl hover:bg-white/5" onClick={() => onOpenChange(false)}>Huỷ</Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading || (!session.is_split_batch && !finalTotal)} 
                      className="flex-[2] h-12 bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-xl shadow-blue-600/20 font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Áp dụng số tiền'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  {session.is_split_batch ? (
                    <div className="flex flex-col gap-6 pb-6">
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-2">
                        <p className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-tighter">
                          <AlertTriangle className="w-4 h-4" /> Cài đặt thanh toán cho từng đơn
                        </p>
                        <p className="text-[10px] text-amber-200/60 mt-1">Mặc định mọi đơn sẽ dùng STK chung của Host bên trên. Bạn có thể ghi đè STK riêng cho từng đơn tại đây.</p>
                      </div>
                      
                      {orderBatches.map(batch => (
                        <div key={batch.id} className="flex flex-col gap-4 bg-white/5 border border-white/10 p-5 rounded-[1.5rem] relative group">
                          <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-4 py-2 rounded-bl-2xl rounded-tr-2xl uppercase tracking-widest border-l border-b border-emerald-500/10">
                            {batch.name}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-black text-white/20 uppercase ml-1">Ngân hàng</label>
                              <Select 
                                value={batch.bank_name || ''} 
                                onValueChange={(val) => onUpdateBatchBank(batch.id, val, batch.bank_account || '', batch.qr_payload || '')}
                              >
                                <SelectTrigger className="h-10 bg-black/40 border-white/10 rounded-xl text-base font-bold">
                                  <SelectValue placeholder="Mặc định Host" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10">
                                  {BANK_OPTIONS.map(bk => <SelectItem key={bk.code} value={bk.code} className="text-base">{bk.shortName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-black text-white/20 uppercase ml-1">Số tài khoản</label>
                              <Input 
                                placeholder="STK riêng..."
                                className="h-10 bg-black/40 border-white/10 rounded-xl text-base font-bold" 
                                defaultValue={batch.bank_account || ''} 
                                onBlur={(e) => { if (e.target.value !== batch.bank_account) onUpdateBatchBank(batch.id, bankNameInput, e.target.value, batch.qr_payload || '') }} 
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-white/20 uppercase ml-1">Quét/Tải ảnh QR riêng cho đơn này</label>
                            <button 
                              onClick={() => onTriggerActionSheet(batch.id)}
                              className="w-full h-12 bg-black/40 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 hover:border-sky-500/30 transition-all text-[10px] font-black uppercase tracking-widest text-white/30"
                            >
                              <Camera className="w-4 h-4 text-sky-400" />
                              {batch.bank_account ? 'Đổi thông tin QR' : 'Ghi đè bằng QR mới'}
                            </button>
                          </div>
                          
                          {!batch.bank_account && (
                            <div className="flex items-center gap-2 py-1 px-2 bg-white/5 rounded-lg border border-white/5">
                              <CheckCircle className="w-3 h-3 text-sky-400/40" />
                              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Đang dùng STK chung của Host</span>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" className="w-full h-12 border border-white/5 text-white/20 rounded-2xl hover:bg-white/5" onClick={() => onOpenChange(false)}>Đóng</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-3 pb-4">
                        {participants.filter(p => orderItems.some(i => i.participant_id === p.id)).map(p => {
                          const pDisc = personalDiscounts[p.id] || { type: 'amount', value: 0 }
                          const pSubtotal = orderItems.filter(i => i.participant_id === p.id).reduce((s,i)=>s+i.price*i.quantity,0)
                          return (
                            <div key={p.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-[1.5rem] border border-white/10 group">
                              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sm font-black text-sky-400">{p.name.charAt(0).toUpperCase()}</div>
                              <div className="flex-1 min-w-0"><p className="text-xs font-black truncate uppercase tracking-tight">{p.name}</p><p className="text-[10px] text-white/30 font-bold tabular-nums">{formatVND(pSubtotal)}</p></div>
                              <div className="flex flex-col gap-1.5 items-end">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-tighter mr-1">Giảm giá</label>
                                <div className="relative w-36">
                                  <Input type="number" className="h-10 bg-black/40 border-white/10 pr-12 text-base font-bold text-emerald-400 rounded-xl text-right" value={pDisc.value || ''} onChange={e => onUpdatePersonalDiscount(p.id, pDisc.type, Number(e.target.value))} placeholder="0" />
                                  <div className="absolute right-1 top-1 bottom-1 flex bg-black/40 rounded-lg p-0.5 border border-white/5 overflow-hidden">
                                    <button type="button" onClick={() => onUpdatePersonalDiscount(p.id, 'percent', pSubtotal > 0 ? Math.min(100, Math.round((pDisc.value / pSubtotal) * 100)) : 0)} className={`px-2 flex items-center justify-center text-[10px] font-black rounded-md transition-all ${pDisc.type === 'percent' ? 'bg-sky-600 text-white' : 'text-white/20 hover:text-white/40'}`}>%</button>
                                    <button type="button" onClick={() => onUpdatePersonalDiscount(p.id, 'amount', Math.round((pSubtotal * pDisc.value) / 100))} className={`px-2 flex items-center justify-center text-[10px] font-black rounded-md transition-all ${pDisc.type === 'amount' ? 'bg-sky-600 text-white' : 'text-white/20 hover:text-white/40'}`}>đ</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="bg-black/20 p-5 rounded-[2rem] border border-white/5 space-y-5 mt-auto shadow-inner">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">Giảm giá & Phí ship chung</label>
                          <div className="flex gap-2">
                            <div className="relative w-24"><Select defaultValue={session.discount_type} onValueChange={(v) => discountForm.setValue('discountType', v as 'amount' | 'percent')}><SelectTrigger className="h-11 bg-black/40 border-white/10 rounded-xl text-[10px] font-black"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-white/10"><SelectItem value="amount" className="text-[10px] font-black">VND</SelectItem><SelectItem value="percent" className="text-[10px] font-black">PHẦN TRĂM (%)</SelectItem></SelectContent></Select></div>
                            <Input placeholder="Số tiền giảm..." type="number" className="h-11 bg-black/40 border-white/10 flex-1 rounded-xl text-base font-bold text-emerald-400" {...discountForm.register('discountValue')} />
                          </div>
                          <Input placeholder="Phí ship (nếu có)..." type="number" className="h-11 bg-black/40 border-white/10 rounded-xl text-sm font-bold text-amber-400" {...discountForm.register('shippingFee')} />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" className="flex-1 h-12 border border-white/5 text-white/20 rounded-2xl hover:bg-white/5" onClick={() => onOpenChange(false)}>Huỷ</Button>
                        <Button className="flex-[2] h-12 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95" onClick={discountForm.handleSubmit(onUpdateDiscountShip)} disabled={isLoading}>{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Áp dụng chi tiết'}</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
