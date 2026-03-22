'use client'

import { Session, OrderBatch, BillEntry, OrderItem } from '@/lib/types'
import { formatVND } from '@/lib/calc'
import { 
  Receipt, Crown, Pencil 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BillSummaryProps {
  entries: BillEntry[]
  session: Session
  batches: OrderBatch[]
}

export function BillSummary({ entries, session, batches = [] }: BillSummaryProps) {
  const grandTotal = entries.reduce((s, e) => s + e.total, 0)
  const configs = (session.batchConfigs as Record<string, any>) || {}

  if (!session.isSplitBatch) {
    return (
      <Card className="overflow-hidden border-sky-500/10 shadow-2xl bg-[#0a0a0c]">
        <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-sky-400">
            <Receipt className="w-4 h-4" />Tổng kết đơn hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {entries.map(entry => {
              const pSub = entry.items.reduce((s, i) => s + i.subtotal, 0)
              const pDisc = entry.items.reduce((s, i) => s + i.discountAmount, 0)
              const pShip = entry.items.reduce((s, i) => s + i.shippingShare, 0)
              return (
                <div key={entry.participant.id} className="group/p">
                  <div className="px-5 py-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {entry.participant.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="font-bold text-white text-[13px]">{entry.participant.name}</span>
                        {entry.participant.isPaid ? (
                          <Badge variant="paid" className="text-[9px] px-1.5 py-0">Đã trả</Badge>
                        ) : (
                          session.status !== 'open' && <Badge variant="unpaid" className="text-[9px] px-1.5 py-0">Chưa trả</Badge>
                        )}
                      </div>
                      <span className="font-black text-sky-400 tabular-nums text-sm">{formatVND(entry.total)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5">
                        <span className="block text-[9px] text-white/30 uppercase tracking-tighter mb-0.5">Món ăn</span>
                        <span className="block text-[11px] font-bold text-white/70 tabular-nums">{formatVND(pSub)}</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5">
                        <span className="block text-[9px] text-white/30 uppercase tracking-tighter mb-0.5">Giảm/Ship</span>
                        <span className={`block text-[11px] font-bold tabular-nums ${(pShip - pDisc) < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {(pShip - pDisc) === 0 ? '–' : ((pShip - pDisc) < 0 ? `-${formatVND(Math.abs(pShip - pDisc))}` : `+${formatVND(pShip - pDisc)}`)}
                        </span>
                      </div>
                      <div className="bg-sky-500/10 rounded-xl p-2 border border-sky-500/10">
                        <span className="block text-[9px] text-sky-400/50 uppercase tracking-tighter mb-0.5">Cần trả</span>
                        <span className="block text-[11px] font-black text-sky-400 tabular-nums">{formatVND(entry.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="bg-sky-500/10 p-6 flex justify-between items-center border-t border-sky-500/20 shadow-[inset_0_2px_20px_rgba(14,165,233,0.1)]">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-1">Tổng cộng đơn hàng</span>
              <span className="text-white/40 text-[11px] font-medium italic">Tất cả các món đã gọi</span>
            </div>
            <span className="font-black text-white text-2xl tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              {formatVND(grandTotal)}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const allItems = entries.flatMap(e => e.items)
  const batchIds = Array.from(new Set(allItems.map(ib => ib.item.orderBatchId || 'default')))

  return (
    <Card className="overflow-hidden border-sky-500/10 shadow-2xl bg-[#0a0a0c]">
      <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-sky-400">
          <Receipt className="w-4 h-4" />Tổng kết đơn hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {batchIds.map((batchId) => {
          const bObj = batches?.find(bt => bt.id === batchId)
          const bName = bObj?.name || 'Đơn 1'
          const bItems = allItems.filter(ib => (ib.item.orderBatchId || 'default') === batchId)
          const bTotal = bItems.reduce((s, i) => s + i.total, 0)
          const bSub = bItems.reduce((s, i) => s + i.subtotal, 0)
          const pIds = Array.from(new Set(bItems.map(i => i.item.participantId)))
          const cfg = configs[bName] || { type: 'amount', value: 0, ship: 0 }
          const bDV = Number(cfg.value) || 0
          const bSF = Number(cfg.ship) || 0
          const bDT = cfg.type || 'amount'

          return (
            <div key={batchId} className="flex flex-col">
              <div className="bg-sky-500/5 px-5 py-4 flex flex-col gap-2 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                    <span className="font-black text-sky-300 text-[11px] uppercase tracking-wider">{bName}</span>
                  </div>
                  <span className="font-black text-white text-base tabular-nums">{formatVND(bTotal)}</span>
                </div>
                {(bDV > 0 || bSF > 0) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 ml-3.5 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/20 uppercase font-black tracking-tighter">Món:</span>
                      <span className="text-[10px] text-white/50 font-bold tabular-nums">{formatVND(bSub)}</span>
                    </div>
                    {bDV > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-400/60 uppercase font-black tracking-tighter">🏷️ Giảm:</span>
                        <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
                          {bDT === 'percent' ? `-${bDV}%` : `-${formatVND(bDV)}`}
                        </span>
                      </div>
                    )}
                    {bSF > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-amber-400/60 uppercase font-black tracking-tighter">📦 Ship:</span>
                        <span className="text-[10px] text-amber-500 font-bold tabular-nums">+{formatVND(bSF)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="divide-y divide-white/5">
                {pIds.map(pId => {
                  const entry = entries.find(e => e.participant.id === pId)
                  if (!entry) return null
                  const pBItems = bItems.filter(ib => ib.item.participantId === pId)
                  const pBT = pBItems.reduce((s, i) => s + i.total, 0)
                  const pBS = pBItems.reduce((s, i) => s + i.subtotal, 0)
                  const pAdj = pBT - pBS
                  return (
                    <div key={pId} className="group/p">
                      <div className="px-5 py-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {entry.participant.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            <span className="font-bold text-white text-[13px] leading-tight">{entry.participant.name}</span>
                            {entry.participant.isPaid ? (
                              <Badge variant="paid" className="text-[9px] px-1.5 py-0">Đã trả</Badge>
                            ) : (
                              session.status !== 'open' && <Badge variant="unpaid" className="text-[9px] px-1.5 py-0">Chưa trả</Badge>
                            )}
                          </div>
                          <span className="font-black text-sky-400 tabular-nums text-sm">{formatVND(pBT)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5">
                            <span className="block text-[9px] text-white/30 uppercase tracking-tighter mb-0.5">Món ăn</span>
                            <span className="block text-[11px] font-bold text-white/70 tabular-nums">{formatVND(pBS)}</span>
                          </div>
                          <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5">
                            <span className="block text-[9px] text-white/30 uppercase tracking-tighter mb-0.5">Giảm/Ship</span>
                            <span className={`block text-[11px] font-bold tabular-nums ${pAdj < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {pAdj === 0 ? '–' : (pAdj < 0 ? `-${formatVND(Math.abs(pAdj))}` : `+${formatVND(pAdj)}`)}
                            </span>
                          </div>
                          <div className="bg-sky-500/10 rounded-xl p-2 border border-sky-500/10">
                            <span className="block text-[9px] font-bold text-sky-400/50 uppercase tracking-tighter mb-0.5">Cần trả</span>
                            <span className="block text-[11px] font-black text-sky-400 tabular-nums">{formatVND(pBT)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div className="bg-sky-500/10 p-6 flex justify-between items-center border-t border-sky-500/20 shadow-[inset_0_2px_20px_rgba(14,165,233,0.1)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-1">Tổng cộng đơn hàng</span>
            <span className="text-white/40 text-[11px] font-medium italic">Tất cả các đợt đặt món</span>
          </div>
          <span className="font-black text-white text-2xl tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {formatVND(grandTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
