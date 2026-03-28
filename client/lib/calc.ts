import { Session, Participant, OrderItem, BillEntry, ItemBill, OrderBatch } from '@/lib/types'

/**
 * Round amount to nearest 1000 VND.
 * floor((x + 500) / 1000) * 1000
 */
export function roundTo1000(amount: number): number {
  return Math.floor((amount + 500) / 1000) * 1000
}

export function calcSubtotal(items: OrderItem[]): number {
  if (!items || !Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
}

/**
 * Calculate each participant's bill breakdown.
 * Frontend preview matching TTD-00004 logic.
 */
export function calculateBill(
  session: Session,
  participants: Participant[] = [],
  allItems: OrderItem[] = [],
  batches: OrderBatch[] = []
): BillEntry[] {
  const safeParticipants = Array.isArray(participants) ? participants : []
  const safeAllItems = Array.isArray(allItems) ? allItems : []
  const safeBatches = Array.isArray(batches) ? batches : []

  const participantsMap = new Map<string, BillEntry>();
  safeParticipants.forEach(p => {
    participantsMap.set(p.id, {
      participant: p,
      subtotal: 0,
      discountAmount: 0,
      shippingShare: 0,
      total: 0,
      items: []
    })
  })

  // 1. Group items
  const paySeparateItems = safeAllItems.filter(i => i.paySeparate)
  const groupItems = safeAllItems.filter(i => !i.paySeparate)

  // 2. Process Pay Separate (No fees, just round)
  paySeparateItems.forEach(item => {
    const itemSubtotal = item.price * (item.quantity || 1)
    const rounded = roundTo1000(itemSubtotal)
    const entry = participantsMap.get(item.participantId)
    if (entry) {
      entry.items.push({
        item,
        subtotal: itemSubtotal,
        discountAmount: 0,
        shippingShare: 0,
        total: rounded
      })
      entry.subtotal += itemSubtotal
      entry.total += rounded
    }
  })

  // 3. Process Batches / Default Group
  const batchGroups = new Map<string | null, OrderItem[]>()
  groupItems.forEach(item => {
    const key = item.orderBatchId || null
    if (!batchGroups.has(key)) batchGroups.set(key, [])
    batchGroups.get(key)!.push(item)
  })

  let totalResidual = 0

  batchGroups.forEach((items, batchId) => {
    let discount = 0
    let ship = 0
    const tBaseBatch = calcSubtotal(items)
    if (tBaseBatch === 0) return

    if (session.isSplitBatch && batchId) {
      const b = safeBatches.find(x => x.id === batchId)
      if (b) {
        discount = b.discountAmount || 0
        ship = b.shippingFee || 0
      }
    } else if (!session.isSplitBatch) {
      ship = session.shippingFee || 0
      discount = session.discountType === 'amount' 
        ? (session.discountValue || 0)
        : (tBaseBatch * (session.discountValue || 0)) / 100
    }

    const k = (ship - discount) / tBaseBatch
    let batchCalculatedSum = 0

    items.forEach(item => {
      const itemSubtotal = item.price * (item.quantity || 1)
      const raw = itemSubtotal * (1 + k)
      const rounded = roundTo1000(raw)
      
      const entry = participantsMap.get(item.participantId)
      if (entry) {
        entry.items.push({
          item,
          subtotal: itemSubtotal,
          discountAmount: Math.round(itemSubtotal - (raw - (itemSubtotal / tBaseBatch) * ship)), // Approximation for UI
          shippingShare: Math.round((itemSubtotal / tBaseBatch) * ship),
          total: rounded
        })
        entry.subtotal += itemSubtotal
        entry.total += rounded
      }
      batchCalculatedSum += rounded
    })

    const batchActual = tBaseBatch - discount + ship
    totalResidual += (batchActual - batchCalculatedSum)
  })

  // 4. Assign Residual to Host
  const result = Array.from(participantsMap.values()).filter(e => e.items.length > 0)
  const hostEntry = result.find(e => e.participant.deviceId === session.hostDeviceId)
  if (hostEntry) {
    hostEntry.total += totalResidual
  }

  return result
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}
