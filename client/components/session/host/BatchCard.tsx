'use client'

import * as React from 'react'
import { OrderBatch, OrderItem, Session } from '@/lib/types'
import { formatVND } from '@/lib/calc'
import { 
  Receipt, Trash2, ChevronRight, QrCode, Camera, Link as LinkIcon
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BatchCardProps {
  batch: OrderBatch
  session: Session
  orderBatches: OrderBatch[]
  orderItems: OrderItem[]
  isExpanded: boolean
  onToggleExpand: () => void
  onDeleteBatch: (batchId: string, name: string) => void
  onUpdateBatchName: (batchId: string, newName: string) => void
  onUpdatePaymentSource: (batchId: string, source: string) => void
  paymentSources: Record<string, string>
  BANK_OPTIONS: any[]
  onUpdateBatchBank: (batchId: string, name: string, account: string, qrPayload: string) => void
  onTriggerActionSheet: (batchId: string | null) => void
  batchFinalTotal: string
  setBatchFinalTotal: (val: string) => void
  setBankNameInput: (val: string) => void
  setBankAccountInput: (val: string) => void
  onSaveGlobalBank: (name?: string, account?: string) => void
}

export function BatchCard({
  batch,
  session,
  orderBatches,
  orderItems,
  isExpanded,
  onToggleExpand,
  onDeleteBatch,
  onUpdateBatchName,
  onUpdatePaymentSource,
  paymentSources,
  BANK_OPTIONS,
  onUpdateBatchBank,
  onTriggerActionSheet,
  batchFinalTotal,
  setBatchFinalTotal,
  setBankNameInput,
  setBankAccountInput,
  onSaveGlobalBank
}: BatchCardProps) {
  const bItems = orderItems.filter(i => i.orderBatchId === batch.id)
  const bTotal = bItems.reduce((s, i) => s + i.price * i.quantity, 0)
  
  // Logic nguồn thanh toán: Đơn mặc định không có nguồn tham chiếu (nó là gốc)
  const rawSource = paymentSources[batch.id]
  const currentSource = rawSource || 'none'
  const sourceBatch = orderBatches.find(b => b.id === currentSource)

  // Props current values: 
  // - Đơn mặc định: dùng thông tin đồng bộ từ host session
  // - Đơn con: LUÔN dùng batch info riêng (để tab "Nhập mới" rỗng khi đang mượn đơn khác)
  const propBankName = batch.isDefault ? (session.hostDefaultBankName || '') : (batch.bankName || '')
  const propBankAcc = batch.isDefault ? (session.hostDefaultBankAccount || '') : (batch.bankAccount || '')
  const qrPayload = batch.isDefault ? session.hostDefaultQrPayload : batch.qrPayload

  // Logic xác định tab nào đang active cho ĐƠN CON
  // Nếu đang mượn từ một đơn khác (có UUID hợp lệ) -> Tab DÙNG LẠI
  // Ngược lại -> Tab NHẬP MỚI
  const isCustomTabActive = batch.isDefault || currentSource === 'custom' || currentSource === 'none'

  // --- LOCAL STATES ---
  const [localName, setLocalName] = React.useState(batch.name)
  const [localBankAcc, setLocalBankAcc] = React.useState(propBankAcc)
  const [localBankName, setLocalBankName] = React.useState(propBankName)
  
  const isEditingName = React.useRef(false)
  const isEditingBank = React.useRef(false)
  const lastSavedAcc = React.useRef(propBankAcc)
  const lastSaveTime = React.useRef(0)

  // Sync only when NOT editing and avoid clobbering just-saved data
  React.useEffect(() => {
    if (!isEditingName.current) setLocalName(batch.name)
  }, [batch.name])

  React.useEffect(() => {
    const now = Date.now()
    const isRecentlySaved = (now - lastSaveTime.current) < 3000 // Cooldown 3s

    if (!isEditingBank.current) {
      if (propBankAcc === lastSavedAcc.current || !isRecentlySaved) {
        if (localBankAcc !== propBankAcc) {
          setLocalBankAcc(propBankAcc)
        }
        setLocalBankName(propBankName)
      }
    }
  }, [propBankAcc, propBankName])

  return (
    <Card className={`bg-white/5 border-white/10 rounded-[2rem] overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-emerald-500/20' : ''}`}>
      <div className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none" onClick={onToggleExpand}>
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center transition-colors ${isExpanded ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/40'}`}>
            <Receipt className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="max-w-[60%] sm:max-w-[180px]">
                <Input 
                  className="h-6 px-2 text-base font-black uppercase tracking-tight bg-white/5 border-none focus-visible:ring-0 text-white truncate rounded-lg" 
                  value={localName}
                  maxLength={15}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => { isEditingName.current = true }}
                  onBlur={() => { 
                    isEditingName.current = false
                    if (localName.trim() && localName !== batch.name) onUpdateBatchName(batch.id, localName.trim())
                  }}
                  onChange={e => setLocalName(e.target.value)}
                />
              </div>
              {batch.isDefault && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-black text-[10px] sm:text-[11px] font-black uppercase tracking-tighter shrink-0 shadow-lg">
                  DEF
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <p className="text-base sm:text-lg font-black tabular-nums text-emerald-400 leading-none">{formatVND(bTotal)}</p>
              <span className="text-[9px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest">/ {bItems.length} MÓN</span>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          {!batch.isDefault && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteBatch(batch.id, batch.name) }}
              className="w-10 h-10 flex items-center justify-center text-white/10 hover:text-rose-500 transition-colors shrink-0"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
          <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-transform duration-500 shrink-0 ${isExpanded ? 'rotate-90 text-emerald-400 bg-emerald-500/10' : 'text-white/20 bg-white/5'}`}>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-6 space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Thông tin nhận tiền</label>
              <div className="bg-black/40 p-1 rounded-full border border-white/10 flex items-center">
                <button 
                  onClick={() => onUpdatePaymentSource(batch.id, 'custom')}
                  className={`flex-1 py-2 px-4 rounded-full text-[10px] font-black transition-all ${isCustomTabActive ? 'bg-sky-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                >
                  {batch.isDefault ? 'THÔNG TIN CHUNG' : 'NHẬP STK RIÊNG'}
                </button>
                {!batch.isDefault && (
                  <button 
                    onClick={() => {
                      const defB = orderBatches.find(b => b.isDefault)
                      if (defB) onUpdatePaymentSource(batch.id, defB.id)
                    }}
                    className={`flex-1 py-2 px-4 rounded-full text-[10px] font-black transition-all ${!isCustomTabActive ? 'bg-sky-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                  >
                    DÙNG LẠI ĐƠN KHÁC
                  </button>
                )}
              </div>

              {isCustomTabActive && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/20 uppercase ml-1">Ngân hàng</label>
                        <Select 
                          value={localBankName} 
                          onValueChange={(val) => {
                            setLocalBankName(val)
                            lastSavedAcc.current = localBankAcc
                            lastSaveTime.current = Date.now()
                            if (batch.isDefault) {
                              setBankNameInput(val)
                              onSaveGlobalBank(val, localBankAcc)
                            } else {
                              onUpdateBatchBank(batch.id, val, localBankAcc, qrPayload || '')
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 bg-black/40 border-white/10 rounded-xl text-xs font-bold">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-white/10">
                            {BANK_OPTIONS.map(bk => <SelectItem key={bk.code} value={bk.code} className="text-xs">{bk.shortName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/20 uppercase ml-1">Số tài khoản</label>
                        <div className="relative">
                          <Input 
                            placeholder="Nhập STK..."
                            className="h-10 bg-black/40 border-white/10 rounded-xl text-xs font-bold pr-10" 
                            value={localBankAcc} 
                            onFocus={() => { 
                              isEditingBank.current = true 
                            }}
                            onChange={(e) => setLocalBankAcc(e.target.value)}
                            onBlur={() => {
                              isEditingBank.current = false
                              if (localBankAcc !== propBankAcc) {
                                lastSavedAcc.current = localBankAcc
                                lastSaveTime.current = Date.now()
                                if (batch.isDefault) {
                                  setBankAccountInput(localBankAcc)
                                  onSaveGlobalBank(localBankName, localBankAcc)
                                } else {
                                  onUpdateBatchBank(batch.id, localBankName, localBankAcc, qrPayload || '')
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-white/20 uppercase ml-1 text-center">Mã QR</label>
                      <button 
                        onClick={() => onTriggerActionSheet(batch.isDefault ? null : batch.id)}
                        className="flex-1 min-h-[90px] bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-all text-white/20"
                      >
                        {qrPayload ? (
                          <QrCode className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <Camera className="w-6 h-6" />
                        )}
                        <span className="text-[8px] font-black uppercase tracking-widest">{qrPayload ? 'Đã có QR' : 'Quét QR'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isCustomTabActive && !batch.isDefault && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-white/20 uppercase ml-1">Chọn đợt đơn nguồn</label>
                    <Select value={currentSource} onValueChange={(val) => onUpdatePaymentSource(batch.id, val)}>
                      <SelectTrigger className="h-10 bg-black/40 border-white/10 rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Chọn..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10">
                        {orderBatches
                          .filter(b => {
                            if (b.id === batch.id) return false // Không hiện chính nó
                            if (b.isDefault) return true // Đơn mặc định luôn là nguồn hợp lệ
                            
                            // Đơn con chỉ hiển thị nếu:
                            // 1. Đang ở chế độ "Nhập STK riêng" (custom)
                            // 2. VÀ thực sự đã có dữ liệu (bankAccount hoặc qrPayload)
                            const bSource = paymentSources[b.id]
                            return bSource === 'custom' && (b.bankAccount || b.qrPayload)
                          })
                          .map(b => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              Dùng chung with {b.name} {b.isDefault ? '(Mặc định)' : ''}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {sourceBatch && (
                    <Card className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-emerald-400 uppercase">Liên kết with {sourceBatch.name}</p>
                        <p className="text-xs text-white/60 font-bold truncate">
                          {sourceBatch.bankName ? (BANK_OPTIONS.find((bk: any) => bk.code === sourceBatch.bankName)?.shortName || sourceBatch.bankName) : ''}: {sourceBatch.bankAccount || 'Chưa có STK'}
                        </p>
                      </div>
                      {sourceBatch.qrPayload && <QrCode className="w-4 h-4 text-emerald-400/40" />}
                    </Card>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/20 uppercase ml-1">Giảm giá (Voucher)</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0"
                      className="h-10 bg-black/60 border-white/5 rounded-xl text-sm font-bold text-rose-400 pl-9" 
                      value={batch.discountAmount || ''} 
                      onChange={(e) => onUpdateBatchBank(batch.id, localBankName, localBankAcc, qrPayload || '', Number(e.target.value), batch.shippingFee)} 
                    />
                    <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-500/40" />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/20 uppercase ml-1">Phí Ship</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0"
                      className="h-10 bg-black/60 border-white/5 rounded-xl text-sm font-bold text-sky-400 pl-9" 
                      value={batch.shippingFee || ''} 
                      onChange={(e) => onUpdateBatchBank(batch.id, localBankName, localBankAcc, qrPayload || '', batch.discountAmount, Number(e.target.value))} 
                    />
                    <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-500/40" />
                  </div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[9px] font-black text-white/20 uppercase ml-1">Số tiền thực thanh toán (Snapshot)</label>
               <div className="relative">
                 <Input 
                   type="number" 
                   placeholder={String(bTotal - (batch.discountAmount || 0) + (batch.shippingFee || 0))}
                   className="h-12 bg-black/60 border-white/5 rounded-xl text-base font-bold text-emerald-400 pl-10" 
                   value={batchFinalTotal} 
                   onChange={(e) => setBatchFinalTotal(e.target.value)} 
                 />
                 <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
               </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
