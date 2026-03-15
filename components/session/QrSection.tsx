'use client'

import { useState } from 'react'
import { Session, OrderBatch, BillEntry } from '@/lib/types'
import { formatVND } from '@/lib/calc'
import { buildQrUrl, getPaymentQR } from '@/lib/vietqr'
import { 
  QrCode, Save, Check, Copy, Hash 
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface QrCardProps {
  entry: BillEntry
  session: Session
  batches: OrderBatch[]
  copyToClipboard: (text: string) => void
}

function QrCard({ entry, session, batches = [], copyToClipboard }: QrCardProps) {
  const [isSeparate, setIsSeparate] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState<string | null>(null)
  const [copiedBank, setCopiedBank] = useState(false)

  const copyAmount = (amount: number, id: string) => {
    copyToClipboard(String(amount))
    setCopiedAmount(id)
    setTimeout(() => setCopiedAmount(null), 2000)
  }

  const copyBank = (account: string | null) => {
    if (account) {
      copyToClipboard(account)
      setCopiedBank(true)
      setTimeout(() => setCopiedBank(false), 2000)
    }
  }

  const saveImage = (url: string, suffix: string = '') => {
    const a = document.createElement('a')
    a.href = url
    a.download = `QR_${entry.participant.name.replace(/\s+/g, '_')}${suffix}_${session.title.replace(/\s+/g, '_')}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const forcedSeparateItems = entry.items.filter(ib => !!ib.item.pay_separate)
  const normalItems = entry.items.filter(ib => !ib.item.pay_separate)

  return (
    <Card className="overflow-hidden border-white/5 bg-white/5 shadow-xl transition-all mb-3 last:mb-0">
      <CardHeader className="p-4 pb-2 border-b border-white/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{entry.participant.name}</span>
            {entry.items.length > 1 && (
              <button
                onClick={() => setIsSeparate(!isSeparate)}
                className={`text-[9px] px-2 py-0.5 rounded-full border transition-all uppercase font-black tracking-tighter ${isSeparate ? 'bg-sky-500 border-sky-400 text-white' : 'bg-white/5 border-white/10 text-white/30'}`}
              >
                {isSeparate ? 'Gộp lại' : 'Tất cả lẻ'}
              </button>
            )}
          </div>
          <span className="text-sky-400 font-semibold text-base tabular-nums">{formatVND(entry.total)}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3 flex flex-col gap-4">
        {isSeparate ? (
          <div className="flex flex-col gap-3">
            {entry.items.map((ib, idx) => {
              const batch = batches.find(b => b.id === ib.item.order_batch_id)
              const qrInfo = getPaymentQR(session, batch)
              const itemQrUrl = qrInfo.bankName && qrInfo.bankAccount ? buildQrUrl(qrInfo.bankName, qrInfo.bankAccount, ib.total, `${entry.participant.name} - ${ib.item.item_name}`) : null
              return (
                <div key={ib.item.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                  {itemQrUrl && (
                    <div className="relative group shrink-0">
                      <div className="p-1.5 bg-white rounded-lg w-[100px] h-[100px]"><img src={itemQrUrl} alt="QR" className="w-full h-full mix-blend-multiply" /></div>
                      <button onClick={() => saveImage(itemQrUrl, `_${ib.item.item_name}`)} className="absolute -top-1 -right-1 p-1.5 bg-sky-500 text-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"><Save className="w-3 h-3" /></button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-[100px] py-1">
                    <div><p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">Món {idx + 1}</p><h4 className="text-white font-bold text-xs truncate leading-tight">{ib.item.item_name}</h4></div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sky-400 font-black text-sm tabular-nums">{formatVND(ib.total)}</p>
                      <div className="flex gap-1.5"><button onClick={() => copyAmount(ib.total, ib.item.id)} className={`p-1.5 rounded-lg border flex-1 transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold ${copiedAmount === ib.item.id ? 'bg-emerald-500' : 'text-white/40'}`}>{copiedAmount === ib.item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}Tiền</button><button onClick={() => copyBank(qrInfo.bankAccount)} className={`p-1.5 rounded-lg border flex-1 transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold ${copiedBank ? 'bg-emerald-500' : 'text-white/40'}`}>{copiedBank ? <Check className="w-3 h-3" /> : <Hash className="w-3 h-3" />}STK</button></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {normalItems.length > 0 && (() => {
              const b = batches.find(bt => bt.id === normalItems[0].item.order_batch_id)
              const qrInfo = getPaymentQR(session, b)
              const gT = normalItems.reduce((s, i) => s + i.total, 0)
              const tQr = qrInfo.bankName && qrInfo.bankAccount ? buildQrUrl(qrInfo.bankName, qrInfo.bankAccount, gT, `${entry.participant.name} - ${session.title}`) : null
              return (
                <div className="flex items-start gap-4">
                  {tQr && (<div className="relative group shrink-0"><div className="p-2 bg-white rounded-xl w-[130px] h-[130px]"><img src={tQr} alt="QR" className="w-full h-full mix-blend-multiply" /></div><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><button onClick={() => saveImage(tQr)} className="p-2 bg-sky-500 text-white rounded-full"><Save className="w-4 h-4" /></button></div></div>)}
                  <div className="flex-1 flex flex-col justify-between h-[130px] py-1">
                    <div className="space-y-1"><div className="flex justify-between text-[11px] text-white/40"><span>Tạm tính:</span><span className="tabular-nums">{formatVND(normalItems.reduce((s,i)=>s+i.subtotal,0))}</span></div><div className="flex justify-between text-[11px] text-white/40"><span>Phí ship/Giảm:</span><span className="tabular-nums">{formatVND(gT - normalItems.reduce((s,i)=>s+i.subtotal,0))}</span></div></div>
                    <div className="flex flex-col gap-2 mt-auto"><button onClick={() => copyAmount(gT, 'grouped')} className={`h-9 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-bold ${copiedAmount === 'grouped' ? 'bg-emerald-500' : 'bg-sky-500/10 text-sky-400'}`}>{copiedAmount === 'grouped' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}Copy {formatVND(gT)}</button><button onClick={() => copyBank(qrInfo.bankAccount)} className="h-9 rounded-xl border border-white/10 bg-white/5 text-white/40 text-xs font-bold flex items-center justify-center gap-2">{copiedBank ? <Check className="w-4 h-4" /> : <Hash className="w-4 h-4" />}Copy STK</button></div>
                  </div>
                </div>
              )
            })()}
            {forcedSeparateItems.map((ib) => {
              const b = batches.find(bt => bt.id === ib.item.order_batch_id)
              const qrInfo = getPaymentQR(session, b)
              const iQr = qrInfo.bankName && qrInfo.bankAccount ? buildQrUrl(qrInfo.bankName, qrInfo.bankAccount, ib.total, `${entry.participant.name} - ${ib.item.item_name}`) : null
              return (
                <div key={ib.item.id} className="flex items-center gap-3 bg-sky-500/[0.03] p-2.5 rounded-xl border border-sky-500/10">
                  {iQr && (<div className="p-1 bg-white rounded-md w-[60px] h-[60px] shrink-0"><img src={iQr} alt="QR" className="w-full h-full mix-blend-multiply" /></div>)}
                  <div className="flex-1 min-w-0"><h4 className="text-[11px] text-white/70 font-bold truncate">{ib.item.item_name}</h4><p className="text-sky-400 font-bold text-xs tabular-nums mt-0.5">{formatVND(ib.total)}</p></div>
                  <div className="flex gap-1"><button onClick={() => copyAmount(ib.total, ib.item.id)} className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-sky-400 transition-colors shrink-0">{copiedAmount === ib.item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}</button><button onClick={() => copyBank(qrInfo.bankAccount)} className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-sky-400 transition-colors shrink-0">{copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Hash className="w-3.5 h-3.5" />}</button></div>
                </div>
              )
            })}
          </div>
        )}
        <div className="text-sm text-white/60 space-y-1.5 bg-black/20 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center"><span className="text-white/40">Tạm tính:</span><span className="tabular-nums font-medium text-white/80">{formatVND(entry.subtotal)}</span></div>
          {entry.discountAmount > 0 && <div className="flex justify-between items-center"><span className="text-white/40">Giảm giá:</span><span className="tabular-nums font-medium text-emerald-400">-{formatVND(entry.discountAmount)}</span></div>}
          <div className="flex justify-between items-center"><span className="text-white/40">Phí ship:</span><span className="tabular-nums font-medium text-white/80">+{formatVND(entry.shippingShare)}</span></div>
        </div>
      </CardContent>
    </Card>
  )
}

interface QrSectionProps {
  session: Session
  orderBatches: OrderBatch[]
  myParticipantId: string | null
  iAmHost: boolean
  showQrs: boolean
  myBill?: BillEntry
  billEntries: BillEntry[]
  copyToClipboard: (text: string) => void
}

export function QrSection({
  session,
  orderBatches,
  myParticipantId,
  iAmHost,
  showQrs,
  myBill,
  billEntries,
  copyToClipboard
}: QrSectionProps) {
  if (session.status === 'open') return null

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-white flex items-center gap-2">
        <QrCode className="w-5 h-5 text-sky-400" />
        Mã QR thanh toán
      </h2>
      
      {myBill && (myBill.subtotal > 0 || myBill.shippingShare > 0) && (
        <QrCard 
          entry={myBill} 
          session={session} 
          batches={orderBatches} 
          copyToClipboard={copyToClipboard} 
        />
      )}
      
      {(showQrs || iAmHost) && billEntries
        .filter(e => e.participant.id !== myParticipantId && (e.subtotal > 0 || e.shippingShare > 0))
        .map(e => (
          <QrCard 
            key={e.participant.id} 
            entry={e} 
            session={session} 
            batches={orderBatches} 
            copyToClipboard={copyToClipboard} 
          />
        ))
      }
    </div>
  )
}
