import { Session, Participant, OrderItem, BillEntry, ItemBill, OrderBatch } from '@/lib/types'

/**
 * Round amount to nearest 1000 VND.
 */
export function roundTo1000(amount: number): number {
  return Math.round(amount / 1000) * 1000
}

export function calcSubtotal(items: OrderItem[]): number {
  if (!items || !Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
}

export function calcGrandTotal(items: OrderItem[]): number {
  if (!items || !Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
}

function calcDiscountFactor(type: 'amount' | 'percent', value: number, total: number): number {
  if (total <= 0) return 1
  if (type === 'percent') return Math.max(0, (100 - value) / 100)
  return Math.max(0, (total - value) / total)
}

/**
 * Calculate each participant's bill breakdown.
 */
export function calculateBill(
  session: Session,
  participants: Participant[] = [],
  allItems: OrderItem[] = [],
  batches: OrderBatch[] = []
): BillEntry[] {
  // Ensure we always have arrays to work with
  const safeParticipants = Array.isArray(participants) ? participants : []
  const safeAllItems = Array.isArray(allItems) ? allItems : []
  const safeBatches = Array.isArray(batches) ? batches : []

  const sessionConfigs = (session.batchConfigs as Record<string, any>) || {}
  const personalDiscounts = sessionConfigs.personalDiscounts || {}

  // 1. SINGLE BATCH MODE
  if (!session.isSplitBatch) {
    const itemsGrandTotal = calcGrandTotal(safeAllItems)
    
    // First, apply personal discounts to subtotals to see what's left for global discount
    let totalAfterPersonalDiscounts = 0
    const participantData = safeParticipants.map(p => {
      const myItems = safeAllItems.filter(i => i && i.participantId === p.id)
      const subtotal = calcSubtotal(myItems)
      
      const pDiscCfg = personalDiscounts[p.id] || { type: 'amount', value: 0 }
      let pDiscAmount = 0
      if (pDiscCfg.type === 'percent') {
        pDiscAmount = (subtotal * (pDiscCfg.value || 0)) / 100
      } else {
        pDiscAmount = Math.min(subtotal, pDiscCfg.value || 0)
      }
      
      const remaining = subtotal - pDiscAmount
      totalAfterPersonalDiscounts += remaining
      
      return { p, subtotal, pDiscAmount, remaining, myItems }
    }).filter(d => d.myItems.length > 0)

    const globalDiscountValue = session.discountValue || 0
    const globalShipFee = session.shippingFee || 0
    
    // Final bill total after all adjustments
    const finalBillTotal = totalAfterPersonalDiscounts - globalDiscountValue + globalShipFee
    const billFactor = totalAfterPersonalDiscounts > 0 ? finalBillTotal / totalAfterPersonalDiscounts : 1
    const globalDiscountFactor = calcDiscountFactor(session.discountType, globalDiscountValue, totalAfterPersonalDiscounts)

    return participantData.map(({ p, subtotal, pDiscAmount, remaining, myItems }) => {
      const afterGlobalDiscount = remaining * globalDiscountFactor
      const shipShareTotal = totalAfterPersonalDiscounts > 0 ? (remaining / totalAfterPersonalDiscounts) * globalShipFee : 0
      const total = roundTo1000(remaining * billFactor)

      const itemBills: ItemBill[] = myItems.map(item => {
        const itemSubtotal = item.price * (item.quantity || 1)
        const itemPDisc = subtotal > 0 ? (itemSubtotal / subtotal) * pDiscAmount : 0
        const itemRemaining = itemSubtotal - itemPDisc
        
        const itemAfterGlobalDisc = itemRemaining * globalDiscountFactor
        const itemShipShare = totalAfterPersonalDiscounts > 0 ? (itemRemaining / totalAfterPersonalDiscounts) * globalShipFee : 0
        const itemTotal = roundTo1000(itemRemaining * billFactor)
        
        return {
          item,
          subtotal: itemSubtotal,
          discountAmount: Math.round(itemSubtotal - itemAfterGlobalDisc),
          shippingShare: Math.round(itemShipShare),
          total: itemTotal,
        }
      })

      return {
        participant: p,
        subtotal,
        discountAmount: Math.round(subtotal - afterGlobalDiscount),
        shippingShare: Math.round(shipShareTotal),
        total,
        items: itemBills,
      }
    })
  }

  // 2. SPLIT BATCH MODE
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

  const batchIds = Array.from(new Set(safeAllItems.map(i => i?.orderBatchId).filter(Boolean)))
  
  batchIds.forEach(batchId => {
    const batchItems = safeAllItems.filter(i => i && i.orderBatchId === batchId)
    if (batchItems.length === 0) return

    const batchObj = safeBatches.find(b => b.id === batchId)
    const batchName = batchObj?.name || 'Đơn 1'
    
    const batchSubtotal = calcSubtotal(batchItems)
    const config = sessionConfigs[batchName] || { type: 'amount', value: 0, ship: 0 }
    
    const bItemsTotal = batchSubtotal
    const bDiscountValue = Number(config.value) || 0
    const bShipFee = Number(config.ship) || 0
    const bDiscountType = config.type || 'amount'
    
    const bFinalTotal = bItemsTotal - bDiscountValue + bShipFee
    const bFactor = bItemsTotal > 0 ? bFinalTotal / bItemsTotal : 1
    const bDiscountFactor = calcDiscountFactor(bDiscountType, bDiscountValue, bItemsTotal)

    safeParticipants.forEach(p => {
      const pBatchItems = batchItems.filter(i => i && i.participantId === p.id)
      if (pBatchItems.length === 0) return

      const pSubtotal = calcSubtotal(pBatchItems)
      const pAfterDisc = pSubtotal * bDiscountFactor
      const pShipShare = bItemsTotal > 0 ? (pSubtotal / bItemsTotal) * bShipFee : 0
      const pTotal = roundTo1000(pSubtotal * bFactor)

      const entry = participantsMap.get(p.id)!
      entry.subtotal += pSubtotal
      entry.discountAmount += (pSubtotal - pAfterDisc)
      entry.shippingShare += pShipShare
      entry.total += pTotal

      pBatchItems.forEach(item => {
        const itemSubtotal = item.price * (item.quantity || 1)
        const itemAfterDisc = itemSubtotal * bDiscountFactor
        const itemShipShare = bItemsTotal > 0 ? (itemSubtotal / bItemsTotal) * bShipFee : 0
        const itemTotal = roundTo1000(itemSubtotal * bFactor)

        entry.items.push({
          item,
          subtotal: itemSubtotal,
          discountAmount: Math.round(itemSubtotal - itemAfterDisc),
          shippingShare: Math.round(itemShipShare),
          total: itemTotal
        })
      })
    })
  })

  return Array.from(participantsMap.values())
    .map(entry => {
      entry.total = roundTo1000(entry.total)
      return entry
    })
    .filter(entry => entry.items.length > 0)
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}
