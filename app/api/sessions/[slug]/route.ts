import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateSessionSchema = z.object({
  hostDeviceId: z.string().min(1),
  status: z.enum(['open', 'locked', 'paid']).optional(),
  discountType: z.enum(['amount', 'percent']).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  shippingFee: z.coerce.number().min(0).optional(),
  hostName: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  qrPayload: z.string().optional(),
  isSplitBatch: z.boolean().optional(),
  useDefaultQrForAll: z.boolean().optional(),
  batchConfigs: z.any().optional(),
  password: z.string().nullable().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session, error: sError } = await (supabase.from('sessions') as any)
    .select('id, slug, title, host_device_id, shop_link, host_default_bank_name, host_default_bank_account, host_default_qr_payload, status, discount_type, discount_value, shipping_fee, is_split_batch, use_default_qr_for_all, password, batch_configs, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (sError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: participants } = await (supabase.from('participants') as any)
    .select('*')
    .eq('session_id', session.id)
    .order('last_active', { ascending: true })

  const { data: orderItems } = await (supabase.from('order_items') as any)
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  const { data: orderBatches } = await (supabase.from('order_batches') as any)
    .select('*')
    .eq('session_id', session.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const sessionData = { ...session, has_password: !!session.password }
  delete sessionData.password

  return NextResponse.json({ 
    session: sessionData, 
    participants: participants || [], 
    orderItems: orderItems || [],
    orderBatches: orderBatches || []
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const parsed = UpdateSessionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: session } = await (supabase.from('sessions') as any)
    .select('id, host_device_id, is_split_batch')
    .eq('slug', slug)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.host_device_id !== parsed.data.hostDeviceId) {
    return NextResponse.json({ error: 'Forbidden: not the host' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.discountType !== undefined) updates.discount_type = parsed.data.discountType
  if (parsed.data.discountValue !== undefined) updates.discount_value = parsed.data.discountValue
  if (parsed.data.shippingFee !== undefined) updates.shipping_fee = parsed.data.shippingFee
  if (parsed.data.bankName !== undefined) updates.host_default_bank_name = parsed.data.bankName
  if (parsed.data.bankAccount !== undefined) updates.host_default_bank_account = parsed.data.bankAccount
  if (parsed.data.qrPayload !== undefined) updates.host_default_qr_payload = parsed.data.qrPayload
  if (parsed.data.isSplitBatch !== undefined) updates.is_split_batch = parsed.data.isSplitBatch
  if (parsed.data.useDefaultQrForAll !== undefined) updates.use_default_qr_for_all = parsed.data.useDefaultQrForAll
  if (parsed.data.batchConfigs !== undefined) updates.batch_configs = parsed.data.batchConfigs
  if (parsed.data.password !== undefined) updates.password = parsed.data.password

  // Handle smart toggle logic for Split Batch via Atomic RPC (with JS Fallback)
  if (parsed.data.isSplitBatch !== undefined && parsed.data.isSplitBatch !== session.is_split_batch) {
    const { error: rpcError } = await supabase.rpc('toggle_session_split_batch', {
      target_session_id: session.id,
      is_enabling: parsed.data.isSplitBatch
    })
    
    if (rpcError && rpcError.code === 'PGRST202') {
      console.warn('RPC toggle_session_split_batch not found, falling back to JS logic')
      // Fallback JS logic
      if (parsed.data.isSplitBatch) {
        let { data: defaultBatch } = await (supabase.from('order_batches') as any).select('id').eq('session_id', session.id).eq('is_default', true).maybeSingle()
        if (!defaultBatch) {
          const { data: newB } = await (supabase.from('order_batches') as any).insert({ session_id: session.id, name: 'Đơn 1', is_default: true }).select().single()
          defaultBatch = newB
        }
        if (defaultBatch) {
          await (supabase.from('order_items') as any).update({ order_batch_id: defaultBatch.id }).eq('session_id', session.id).is('order_batch_id', null)
        }
      } else {
        const { data: defaultBatch } = await (supabase.from('order_batches') as any)
          .select('id, bank_name, bank_account, qr_payload')
          .eq('session_id', session.id)
          .eq('is_default', true)
          .maybeSingle()

        if (defaultBatch) {
          // Sync bank info from Default Batch to Session when turning OFF split
          if (defaultBatch.qr_payload || defaultBatch.bank_account) {
            updates.host_default_bank_name = defaultBatch.bank_name
            updates.host_default_bank_account = defaultBatch.bank_account
            updates.host_default_qr_payload = defaultBatch.qr_payload
          }

          await (supabase.from('order_items') as any).update({ order_batch_id: defaultBatch.id }).eq('session_id', session.id)
          await (supabase.from('order_batches') as any).delete().eq('session_id', session.id).eq('is_default', false)
        }
      }
    } else if (rpcError) {
      console.error('RPC Error:', rpcError)
      return NextResponse.json({ error: 'Failed to toggle split batch' }, { status: 500 })
    }
  }

  const { data: updated, error } = await (supabase.from('sessions') as any)
    .update(updates)
    .eq('id', session.id)
    .select('id, slug, title, host_device_id, status, host_default_bank_name, host_default_bank_account, host_default_qr_payload, discount_type, discount_value, shipping_fee, is_split_batch, use_default_qr_for_all, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  if (parsed.data.hostName) {
    await (supabase.from('participants') as any)
      .update({ name: parsed.data.hostName })
      .eq('session_id', session.id)
      .eq('is_host', true)
  }

  return NextResponse.json({ session: updated })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const { data: session } = await (supabase.from('sessions') as any)
      .select('id, password')
      .eq('slug', slug)
      .maybeSingle()

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!session.password) return NextResponse.json({ ok: true })

    const { password } = await request.json().catch(() => ({ password: '' }))
    if (password === session.password) return NextResponse.json({ ok: true })

    return NextResponse.json({ error: 'Sai mật khẩu' }, { status: 403 })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
