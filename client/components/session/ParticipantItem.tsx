'use client'

import { Participant, OrderItem as OrderItemType, Session, OrderBatch } from '@/lib/types'
import { formatVND, calcSubtotal } from '@/lib/calc'
import { ChevronDown, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { OrderItem } from './OrderItem'

interface ParticipantItemProps {
  participant: Participant
  items: OrderItemType[]
  session: Session
  orderBatches: OrderBatch[]
  myParticipantId: string | null
  iAmHost: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  editingItemId: string | null
  editDraft: any
  setEditDraft: React.Dispatch<React.SetStateAction<any>>
  onStartEdit: (item: OrderItemType) => void
  onSaveEdit: (itemId: string) => void
  onCancelEdit: () => void
  onDeleteItem: (itemId: string) => void
  onCopyItem: (item: OrderItemType) => void
  onTogglePaid?: (participantId: string, isPaid: boolean) => void
  isLoading: boolean
  PERCENT_OPTIONS: string[]
}

export function ParticipantItem({
  participant,
  items,
  session,
  orderBatches = [],
  myParticipantId,
  iAmHost,
  isExpanded,
  onToggleExpand,
  editingItemId,
  editDraft,
  setEditDraft,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteItem,
  onCopyItem,
  onTogglePaid,
  isLoading,
  PERCENT_OPTIONS
}: ParticipantItemProps) {
  return (
    <div className="group">
      <div 
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer" 
        onClick={onToggleExpand}
      >
        <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sm font-bold text-sky-300">
          {participant.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {participant.isHost && <Crown className="w-3 h-3 text-amber-400" />}
            <span className="font-medium text-white text-sm">{participant.name}</span>
            {participant.id === myParticipantId && <span className="text-xs text-sky-400">(bạn)</span>}
          </div>
          <p className="text-xs text-white/40">{items.length} món · {formatVND(calcSubtotal(items))}</p>
        </div>
        <div className="flex items-center gap-2">
          {participant.isPaid ? (
            <Badge 
              variant="paid" 
              className={`text-[10px] px-1.5 ${iAmHost && session.status !== 'open' ? 'cursor-pointer hover:bg-sky-500/30' : ''}`}
              onClick={(e) => {
                if (iAmHost && session.status !== 'open' && onTogglePaid) {
                  e.stopPropagation()
                  onTogglePaid(participant.id, false)
                }
              }}
            >✓ Đã trả</Badge>
          ) : (
            session.status !== 'open' && (
              <Badge 
                variant="unpaid" 
                className={`text-[10px] px-1.5 ${iAmHost ? 'cursor-pointer hover:bg-rose-500/30' : ''}`}
                onClick={(e) => {
                  if (iAmHost && onTogglePaid) {
                    e.stopPropagation()
                    onTogglePaid(participant.id, true)
                  }
                }}
              >✕ Chưa trả</Badge>
            )
          )}
          <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      <div className={`grid transition-all duration-300 ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0 px-4 pb-2.5">
          {items.map(item => (
            <div key={item.id} className="slide-up">
              <OrderItem 
                item={item}
                session={session}
                orderBatches={orderBatches}
                myParticipantId={myParticipantId}
                iAmHost={iAmHost}
                isEditing={editingItemId === item.id}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onDeleteItem={onDeleteItem}
                onCopyItem={onCopyItem}
                isLoading={isLoading}
                PERCENT_OPTIONS={PERCENT_OPTIONS}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
