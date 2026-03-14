import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const AddItemSchema = z.object({
  participantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  itemName: z.string().min(1).max(200),
  price: z.number().min(0),
  quantity: z.number().min(1).max(99).default(1),
  note: z.string().max(200).optional(),
  ice: z.string().optional(),
  sugar: z.string().optional(),
  batch_group: z.string().optional(),
  pay_separate: z.boolean().optional(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = AddItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { participantId, sessionId, itemName, price, quantity, note, ice, sugar } = parsed.data
  const supabase = await createClient()

  // Check session is still open
  const { data: session } = await (supabase
    .from('sessions')
    .select('status')
    .eq('id', sessionId)
    .maybeSingle() as any)

  if (!session || session.status !== 'open') {
    return NextResponse.json({ error: 'Session is not open for ordering' }, { status: 409 })
  }

  const { data: item, error } = await (supabase.from('order_items') as any)
    .insert({
      participant_id: participantId,
      session_id: sessionId,
      item_name: itemName,
      price,
      quantity,
      note: note || null,
      ice: ice || null,
      sugar: sugar || null,
      batch_group: parsed.data.batch_group || 'Đơn 1',
      pay_separate: !!parsed.data.pay_separate,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }

  return NextResponse.json({ item }, { status: 201 })
}
