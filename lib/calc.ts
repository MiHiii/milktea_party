import { Session, Participant, OrderItem, BillEntry, ItemBill } from '@/lib/types'

/**
 * Round amount to nearest 500 VND.
 */
export function roundTo500(amount: number): number {
  return Math.round(amount / 500) * 500
}

/**
 * Calculate subtotal for a participant's items.
 */
export function calcSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * Calculate the grand total for all items in a session.
 */
export function calcGrandTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * Calculate discount factor based on session discount settings.
 * - 'percent': F = (100 - discountValue) / 100
 * - 'amount': F = (T - discountValue) / T  (where T = grand total)
 */
export function calcDiscountFactor(
  discountType: 'amount' | 'percent',
  discountValue: number,
  grandTotal: number
): number {
  if (discountValue <= 0) return 1

  if (discountType === 'percent') {
    return (100 - discountValue) / 100
  } else {
    if (grandTotal <= 0) return 1
    return (grandTotal - discountValue) / grandTotal
  }
}

/**
 * Calculate each participant's bill breakdown.
 * If an item is marked 'pay_separate', it gets its own entry.
 */
export function calculateBill(
  session: Session,
  participants: Participant[],
  allItems: OrderItem[]
): BillEntry[] {
  // If not splitting by batch, use the existing global logic
  if (!session.is_split_batch) {
    const itemsGrandTotal = calcGrandTotal(allItems)
    const finalBillTotal = itemsGrandTotal - session.discount_value + session.shipping_fee
    const billFactor = itemsGrandTotal > 0 ? finalBillTotal / itemsGrandTotal : 1
    const discountFactor = calcDiscountFactor(session.discount_type, session.discount_value, itemsGrandTotal)

    return participants.map(participant => {
      const myItems = allItems.filter(i => i.participant_id === participant.id)
      const subtotal = calcSubtotal(myItems)
      const afterDiscountTotal = subtotal * discountFactor
      const shipShareTotal = (subtotal / itemsGrandTotal) * session.shipping_fee || 0
      const total = roundTo500(subtotal * billFactor)

      const itemBills: ItemBill[] = myItems.map(item => {
        const itemSubtotal = item.price * item.quantity
        const itemAfterDisc = itemSubtotal * discountFactor
        const itemShipShare = (itemSubtotal / itemsGrandTotal) * session.shipping_fee || 0
        const itemTotal = roundTo500(itemSubtotal * billFactor)
        return {
          item,
          subtotal: itemSubtotal,
          discountAmount: Math.round(itemSubtotal - itemAfterDisc),
          shippingShare: Math.round(itemShipShare),
          total: itemTotal,
        }
      })

      return {
        participant,
        subtotal,
        discountAmount: Math.round(subtotal - afterDiscountTotal),
        shippingShare: Math.round(shipShareTotal),
        total,
        items: itemBills,
      }
    }).filter(entry => entry.items.length > 0)
  }

  // BATCHED CALCULATION
  const configs = (session.batch_configs as Record<string, any>) || {}
  const participantsMap = new Map<string, BillEntry>()

  // Initialize entries for everyone
  participants.forEach(p => {
    participantsMap.set(p.id, {
      participant: p,
      subtotal: 0,
      discountAmount: 0,
      shippingShare: 0,
      total: 0,
      items: []
    })
  })

  // Get all unique batches
  const batches = Array.from(new Set(allItems.map(i => i.batch_group || 'Đơn 1')))

  batches.forEach(batchName => {
    const batchItems = allItems.filter(i => (i.batch_group || 'Đơn 1') === batchName)
    if (batchItems.length === 0) return

    const batchSubtotal = calcSubtotal(batchItems)
    const config = configs[batchName] || { type: 'amount', value: 0, ship: 0 }
    
    // Calculate batch factors
    const bItemsTotal = batchSubtotal
    const bDiscountValue = Number(config.value) || 0
    const bShipFee = Number(config.ship) || 0
    const bDiscountType = config.type || 'amount'
    
    const finalBatchTotal = bItemsTotal - bDiscountValue + bShipFee
    const bBillFactor = bItemsTotal > 0 ? finalBatchTotal / bItemsTotal : 1
    const bDiscountFactor = calcDiscountFactor(bDiscountType, bDiscountValue, bItemsTotal)

    participants.forEach(p => {
      const pBatchItems = batchItems.filter(i => i.participant_id === p.id)
      if (pBatchItems.length === 0) return

      const pSubtotal = calcSubtotal(pBatchItems)
      const pAfterDisc = pSubtotal * bDiscountFactor
      const pShipShare = (pSubtotal / bItemsTotal) * bShipFee || 0
      const pTotal = pSubtotal * bBillFactor // We round at the very end of all batches or per batch?
      // Let's round per batch to keep it consistent with the "final total" logic if possible, 
      // but actually rounding at the end is better for precision. 
      // However, the user usually wants each batch to add up.
      
      const entry = participantsMap.get(p.id)!
      entry.subtotal += pSubtotal
      entry.discountAmount += (pSubtotal - pAfterDisc)
      entry.shippingShare += pShipShare
      entry.total += pTotal // Summing unrounded totals

      pBatchItems.forEach(item => {
        const itemSubtotal = item.price * item.quantity
        const itemAfterDisc = itemSubtotal * bDiscountFactor
        const itemShipShare = (itemSubtotal / bItemsTotal) * bShipFee || 0
        const itemTotal = itemSubtotal * bBillFactor

        entry.items.push({
          item,
          subtotal: itemSubtotal,
          discountAmount: Math.round(itemSubtotal - itemAfterDisc),
          shippingShare: Math.round(itemShipShare),
          total: roundTo500(itemTotal), // Item totals are always rounded for display
        })
      })
    })
  })

  // Final rounding and filtering
  return Array.from(participantsMap.values())
    .map(entry => {
      entry.discountAmount = Math.round(entry.discountAmount)
      entry.shippingShare = Math.round(entry.shippingShare)
      entry.total = roundTo500(entry.total)
      return entry
    })
    .filter(entry => entry.items.length > 0)
}

/**
 * Format a number as Vietnamese currency string (e.g. 35,000đ)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}
