import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateSessionSchema = z.object({
  hostDeviceId: z.string().min(1),
  status: z.enum(['open', 'locked', 'paid']).optional(),
  discountType: z.enum(['amount', 'percent']).optional(),
  discountValue: z.number().min(0).optional(),
  shippingFee: z.number().min(0).optional(),
  hostName: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  isSplitBatch: z.boolean().optional(),
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
    .select('*')
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

  const sessionData = { ...session, has_password: !!session.password }
  delete sessionData.password

  return NextResponse.json({ session: sessionData, participants: participants || [], orderItems: orderItems || [] })
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

  // Verify host
  const { data: session } = await (supabase.from('sessions') as any)
    .select('id, host_device_id')
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
  if (parsed.data.bankName !== undefined) updates.bank_name = parsed.data.bankName
  if (parsed.data.bankAccount !== undefined) updates.bank_account = parsed.data.bankAccount
  if (parsed.data.isSplitBatch !== undefined) updates.is_split_batch = parsed.data.isSplitBatch
  if (parsed.data.batchConfigs !== undefined) updates.batch_configs = parsed.data.batchConfigs
  if (parsed.data.password !== undefined) updates.password = parsed.data.password

  const { data: updated, error } = await (supabase.from('sessions') as any)
    .update(updates)
    .eq('id', session.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // If locking, also update host participant name if provided
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

    // 1. Get the session
    const { data: session } = await (supabase.from('sessions') as any)
      .select('id, password')
      .eq('slug', slug)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!session.password) {
      return NextResponse.json({ ok: true })
    }

    const { password } = await request.json().catch(() => ({ password: '' }))

    if (password === session.password) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Sai mật khẩu' }, { status: 403 })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

