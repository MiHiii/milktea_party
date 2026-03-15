'use client'

import * as React from 'react'
import { Session, OrderBatch, OrderItem } from '@/lib/types'
import { formatVND } from '@/lib/calc'
import { 
  Settings, Loader2, Plus, X as XIcon, CheckCircle, Calculator, Camera, Save
} from 'lucide-react'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

// Import Sub-components
import { SessionConfig } from './host/SessionConfig'
import { CalculationCard } from './host/CalculationCard'
import { BatchCard } from './host/BatchCard'

interface HostSettingsProps {
  session: Session
  orderBatches: OrderBatch[]
  orderItems: OrderItem[]
  isLoading: boolean
  isToggling: boolean
  isProcessingQR: boolean
  qrPreviewUrl: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  finalTotal: string
  setFinalTotal: (val: string) => void
  batchFinalTotals: Record<string, string>
  setBatchFinalTotals: React.Dispatch<React.SetStateAction<Record<string, string>>>
  batchNameDraft: string
  setBatchNameDraft: React.Dispatch<React.SetStateAction<string>>
  showNewBatch: boolean
  setShowNewBatch: React.Dispatch<React.SetStateAction<boolean>>
  newBatchDraft: string
  setNewBatchDraft: React.Dispatch<React.SetStateAction<string>>
  bankNameInput: string
  setBankNameInput: React.Dispatch<React.SetStateAction<string>>
  bankAccountInput: string
  setBankAccountInput: React.Dispatch<React.SetStateAction<string>>
  showPasswordEdit: boolean
  hostPasswordDraft: string
  setHostPasswordDraft: React.Dispatch<React.SetStateAction<string>>
  onSaveBatchTotal: (e: React.FormEvent) => void
  onAddBatch: () => void
  onDeleteBatch: (batchId: string, name: string) => void
  onUpdateBatchName: (batchId: string, newName: string) => void
  onUpdateBatchBank: (batchId: string, name: string, account: string, qrPayload: string) => void
  onToggleSplitBatch: (isSplit: boolean) => void
  onTogglePassword: (enabled: boolean) => void
  onSavePassword: () => void
  onSaveGlobalBank: () => void
  onTriggerActionSheet: (batchId?: string | null) => void
  BANK_OPTIONS: any[]
}

export function HostSettings({
  session,
  orderBatches = [],
  orderItems,
  isLoading,
  isToggling,
  isProcessingQR,
  qrPreviewUrl,
  open,
  onOpenChange,
  finalTotal,
  setFinalTotal,
  batchFinalTotals,
  setBatchFinalTotals,
  showNewBatch,
  setShowNewBatch,
  newBatchDraft,
  setNewBatchDraft,
  bankNameInput,
  setBankNameInput,
  bankAccountInput,
  setBankAccountInput,
  showPasswordEdit,
  hostPasswordDraft,
  setHostPasswordDraft,
  onSaveBatchTotal,
  onAddBatch,
  onDeleteBatch,
  onUpdateBatchName,
  onUpdateBatchBank,
  onToggleSplitBatch,
  onTogglePassword,
  onSavePassword,
  onSaveGlobalBank,
  onTriggerActionSheet,
  BANK_OPTIONS
}: HostSettingsProps) {
  const [expandedBatchId, setExpandedBatchId] = React.useState<string | null>(null)
  const hasSubOrders = session.is_split_batch
  
  const originalTotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const discountVal = session.discount_type === 'percent' 
    ? (originalTotal * (session.discount_value || 0)) / 100 
    : (session.discount_value || 0)
  const shippingFee = session.shipping_fee || 0
  const estimatedPayable = Math.max(0, originalTotal - discountVal + shippingFee)

  React.useEffect(() => {
    if (open && (!finalTotal || finalTotal === '0')) {
      setFinalTotal(String(estimatedPayable))
    }
  }, [open, estimatedPayable])

  const paymentSources = (session.batch_configs as any)?.paymentSources || {}
  
  const onUpdatePaymentSource = async (batchId: string, source: string) => {
    // 1. Xác định dữ liệu nguồn mới để Snapshot
    let sourceData = { bank_name: '', bank_account: '', qr_payload: '' }
    
    if (source === 'host') {
      sourceData = {
        bank_name: session.host_default_bank_name || '',
        bank_account: session.host_default_bank_account || '',
        qr_payload: session.host_default_qr_payload || ''
      }
    } else if (source !== 'custom') {
      const sb = orderBatches.find(b => b.id === source)
      if (sb) {
        sourceData = {
          bank_name: sb.bank_name || '',
          bank_account: sb.bank_account || '',
          qr_payload: sb.qr_payload || ''
        }
      }
    }

    // 2. Cập nhật Snapshot cho chính đơn mục tiêu (batchId)
    if (source !== 'custom') {
      try {
        await fetch(`/api/order-batches/${batchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            hostDeviceId: session.host_device_id,
            bankName: sourceData.bank_name,
            bankAccount: sourceData.bank_account,
            qrPayload: sourceData.qr_payload
          })
        })
      } catch (e) { console.error('Snapshot failed:', e) }
    }

    // 3. LOGIC LÀM PHẲNG (Flattening): 
    // Tìm các đơn khác đang mượn từ đơn (batchId) này để chuyển chúng sang nguồn mới (source)
    const affectedBatchIds = orderBatches
      .filter(b => b.id !== batchId && paymentSources[b.id] === batchId)
      .map(b => b.id);

    const newSources = { ...paymentSources, [batchId]: source }
    
    // Nếu đơn hiện tại đổi sang mượn nguồn khác (không phải custom), 
    // thì các đơn đang mượn nó cũng phải mượn thẳng từ nguồn đó luôn
    if (source !== 'custom') {
      affectedBatchIds.forEach(id => {
        newSources[id] = source;
      });
    }

    // 4. Đồng bộ DB cho các đơn bị ảnh hưởng bởi việc làm phẳng
    if (affectedBatchIds.length > 0 && source !== 'custom') {
      await Promise.all(affectedBatchIds.map(id => 
        fetch(`/api/order-batches/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            hostDeviceId: session.host_device_id,
            bankName: sourceData.bank_name,
            bankAccount: sourceData.bank_account,
            qrPayload: sourceData.qr_payload
          })
        })
      ));
    }

    const newConfigs = { ...(session.batch_configs as any || {}), paymentSources: newSources }
    try {
      await fetch(`/api/sessions/${session.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hostDeviceId: session.host_device_id,
          batchConfigs: newConfigs 
        })
      })
    } catch (e) { console.error(e) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] bg-slate-950 border-white/10 text-white sm:max-w-xl p-0 flex flex-col overflow-hidden rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-sky-400">
            <Settings className="w-5 h-5" /> Cài đặt thanh toán
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          
          <SessionConfig 
            session={session}
            hasSubOrders={hasSubOrders}
            isToggling={isToggling}
            isLoading={isLoading}
            showPasswordEdit={showPasswordEdit}
            hostPasswordDraft={hostPasswordDraft}
            setHostPasswordDraft={setHostPasswordDraft}
            onToggleSplitBatch={onToggleSplitBatch}
            onTogglePassword={onTogglePassword}
            onSavePassword={onSavePassword}
          />

          {!hasSubOrders ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <section className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Chi tiết tính toán</label>
                <CalculationCard 
                  originalTotal={originalTotal}
                  discountVal={discountVal}
                  finalTotal={finalTotal}
                  estimatedPayable={estimatedPayable}
                  setFinalTotal={setFinalTotal}
                />
              </section>

              <section className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Thông tin nhận tiền</label>
                <Card className="bg-white/5 border-white/10 p-6 rounded-[2rem] space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Ngân hàng</label>
                        <Select value={bankNameInput} onValueChange={setBankNameInput}>
                          <SelectTrigger className="h-12 bg-black/40 border-white/10 rounded-2xl text-base font-bold">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-white/10">
                            {BANK_OPTIONS.map((b) => (<SelectItem key={b.code} value={b.code}>{b.shortName}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Số tài khoản</label>
                        <Input placeholder="Nhập STK..." className="h-12 bg-black/40 border-white/10 rounded-2xl text-base font-bold" value={bankAccountInput} onChange={(e) => setBankAccountInput(e.target.value)} />
                      </div>
                    </div>
                    <div className="w-full sm:w-40 flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1 text-center">Mã QR</label>
                      <button onClick={() => onTriggerActionSheet(null)} className="flex-1 min-h-[140px] bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all relative overflow-hidden group">
                        {qrPreviewUrl ? (
                          <>
                            <img src={qrPreviewUrl} alt="QR" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                            <Camera className="w-6 h-6 text-white relative z-10" />
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-white/20">
                            <Camera className="w-8 h-8" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Quét QR</span>
                          </div>
                        )}
                        {isProcessingQR && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
                      </button>
                    </div>
                  </div>
                  <Button className="w-full h-12 bg-sky-600/20 text-sky-400 border border-sky-600/30 hover:bg-sky-600/30 rounded-2xl font-bold text-xs uppercase tracking-widest" onClick={onSaveGlobalBank} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Lưu thông tin ngân hàng
                  </Button>
                </Card>
              </section>

              <Button 
                onClick={onSaveBatchTotal}
                disabled={isLoading || !finalTotal}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />} Áp dụng & Đóng
              </Button>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <section className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Danh sách các đợt đơn ({orderBatches.length})</label>
                  {!showNewBatch && (
                    <button onClick={() => setShowNewBatch(true)} className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-300 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Thêm đợt
                    </button>
                  )}
                </div>

                {showNewBatch && (
                  <Card className="bg-emerald-500/5 border border-dashed border-emerald-500/30 p-4 rounded-3xl animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2">
                      <Input 
                        autoFocus 
                        placeholder="Tên đợt đơn (v/d: Đơn 2...)" 
                        className="h-11 bg-black/40 border-none rounded-xl font-bold flex-1" 
                        value={newBatchDraft} 
                        maxLength={15}
                        onChange={e => {
                          if (e.target.value.length <= 15) {
                            setNewBatchDraft(e.target.value);
                          }
                        }} 
                        onKeyDown={e => e.key === 'Enter' && onAddBatch()} 
                      />
                      <Button size="sm" className="h-11 px-6 bg-emerald-600 rounded-xl font-bold uppercase text-[10px]" onClick={onAddBatch} disabled={!newBatchDraft || isLoading}>Thêm</Button>
                      <button onClick={() => setShowNewBatch(false)} className="p-2 text-white/20 hover:text-white/60"><XIcon className="w-5 h-5" /></button>
                    </div>
                  </Card>
                )}

                <div className="space-y-3">
                  {orderBatches.map((batch) => (
                    <BatchCard 
                      key={batch.id}
                      batch={batch}
                      session={session}
                      orderBatches={orderBatches}
                      orderItems={orderItems}
                      isExpanded={expandedBatchId === batch.id}
                      onToggleExpand={() => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id)}
                      onDeleteBatch={onDeleteBatch}
                      onUpdateBatchName={onUpdateBatchName}
                      onUpdatePaymentSource={onUpdatePaymentSource}
                      paymentSources={paymentSources}
                      BANK_OPTIONS={BANK_OPTIONS}
                      onUpdateBatchBank={onUpdateBatchBank}
                      onTriggerActionSheet={(bId) => onTriggerActionSheet(bId)}
                      batchFinalTotal={batchFinalTotals[batch.id] || ''}
                      setBatchFinalTotal={(val) => setBatchFinalTotals(prev => ({ ...prev, [batch.id]: val }))}
                      setBankNameInput={setBankNameInput}
                      setBankAccountInput={setBankAccountInput}
                      onSaveGlobalBank={onSaveGlobalBank}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Tổng quan quyết toán</label>
                <Card className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">TỔNG CỘNG CẦN TRẢ (TỪ HOST)</span>
                    <span className="text-3xl font-black text-white tabular-nums">
                      {formatVND(Object.values(batchFinalTotals).reduce((sum, val) => sum + (Number(val) || 0), 0) || estimatedPayable)}
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Calculator className="w-7 h-7" />
                  </div>
                </Card>
              </section>

              <Button 
                onClick={onSaveBatchTotal}
                disabled={isLoading}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />} Lưu & Hoàn tất
              </Button>
            </div>
          )}

          <div className="pb-10 text-center">
            <p className="text-[9px] text-white/10 uppercase font-black tracking-[0.3em]">Milktea Party Host Control Panel v3.1</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
