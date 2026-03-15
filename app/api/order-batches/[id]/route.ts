import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateBatchSchema = z.object({
  hostDeviceId: z.string().min(1),
  name: z.string().optional(),
  bankName: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  qrPayload: z.string().nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = UpdateBatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Get the session associated with this batch
  const { data: batch } = await (supabase.from('order_batches') as any)
    .select('session_id')
    .eq('id', id)
    .maybeSingle()

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  // 2. Verify host ownership via session
  const { data: session } = await (supabase.from('sessions') as any)
    .select('id, host_device_id')
    .eq('id', batch.session_id)
    .maybeSingle()

  if (!session || session.host_device_id !== parsed.data.hostDeviceId) {
    return NextResponse.json({ error: 'Forbidden: not the host' }, { status: 403 })
  }

  const updates: Record<string, any> = {}
  if (parsed.data.name !== undefined) {
    // Check for duplicate name in the same session
    const { data: existing } = await (supabase.from('order_batches') as any)
      .select('id')
      .eq('session_id', batch.session_id)
      .ilike('name', parsed.data.name.trim())
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Tên đơn này đã tồn tại' }, { status: 400 })
    }
    updates.name = parsed.data.name.trim()
  }
  if (parsed.data.bankName !== undefined) updates.bank_name = parsed.data.bankName
  if (parsed.data.bankAccount !== undefined) updates.bank_account = parsed.data.bankAccount
  if (parsed.data.qrPayload !== undefined) updates.qr_payload = parsed.data.qrPayload

  const { data: updated, error } = await (supabase.from('order_batches') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ batch: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const hostDeviceId = searchParams.get('hostDeviceId')

  if (!hostDeviceId) {
    return NextResponse.json({ error: 'hostDeviceId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Get batch
  const { data: batch } = await (supabase.from('order_batches') as any)
    .select('session_id, is_default')
    .eq('id', id)
    .maybeSingle()

  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (batch.is_default) return NextResponse.json({ error: 'Cannot delete default batch' }, { status: 400 })

  // 2. Verify host
  const { data: session } = await (supabase.from('sessions') as any)
    .select('id, host_device_id')
    .eq('id', batch.session_id)
    .maybeSingle()

  if (!session || session.host_device_id !== hostDeviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Delete
  const { error } = await (supabase.from('order_batches') as any).delete().eq('id', id)
  
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
