import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateItemSchema = z.object({
  itemName: z.string().min(1).max(200).optional(),
  price: z.number().min(0).optional(),
  quantity: z.number().min(1).max(99).optional(),
  note: z.string().max(200).nullable().optional(),
  ice: z.string().nullable().optional(),
  sugar: z.string().nullable().optional(),
  order_batch_id: z.string().uuid().nullable().optional(),
  pay_separate: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = UpdateItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: item } = await (supabase
    .from('order_items')
    .select('*')
    .eq('id', id)
    .maybeSingle() as any)

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const { data: session } = await (supabase
    .from('sessions')
    .select('status')
    .eq('id', item.session_id)
    .maybeSingle() as any)

  if (!session || session.status !== 'open') {
    return NextResponse.json({ error: 'Session is locked' }, { status: 409 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.itemName !== undefined) updates.item_name = parsed.data.itemName
  if (parsed.data.price !== undefined) updates.price = parsed.data.price
  if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity
  if (parsed.data.note !== undefined) updates.note = parsed.data.note
  if (parsed.data.ice !== undefined) updates.ice = parsed.data.ice
  if (parsed.data.sugar !== undefined) updates.sugar = parsed.data.sugar
  if (parsed.data.order_batch_id !== undefined) updates.order_batch_id = parsed.data.order_batch_id
  if (parsed.data.pay_separate !== undefined) updates.pay_separate = parsed.data.pay_separate

  const { data: updated, error } = await (supabase.from('order_items') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ item: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await (supabase
    .from('order_items')
    .select('*')
    .eq('id', id)
    .maybeSingle() as any)

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const { data: session } = await (supabase
    .from('sessions')
    .select('status')
    .eq('id', item.session_id)
    .maybeSingle() as any)

  if (!session || session.status !== 'open') {
    return NextResponse.json({ error: 'Session is locked' }, { status: 409 })
  }

  const { error } = await supabase.from('order_items').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
