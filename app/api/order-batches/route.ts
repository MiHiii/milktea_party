import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateBatchSchema = z.object({
  hostDeviceId: z.string().min(1),
  sessionId: z.string().uuid(),
  name: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = CreateBatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Verify host
  const { data: session } = await (supabase.from('sessions') as any)
    .select('id, host_device_id')
    .eq('id', parsed.data.sessionId)
    .maybeSingle()

  if (!session || session.host_device_id !== parsed.data.hostDeviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Check for duplicate name
  const { data: existing } = await (supabase.from('order_batches') as any)
    .select('id')
    .eq('session_id', session.id)
    .ilike('name', parsed.data.name.trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Tên đơn này đã tồn tại' }, { status: 400 })
  }

  // 3. Create batch
  const { data: batch, error } = await (supabase.from('order_batches') as any)
    .insert({
      session_id: session.id,
      name: parsed.data.name,
      is_default: false
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }

  return NextResponse.json({ batch })
}
