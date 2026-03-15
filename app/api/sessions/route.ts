import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/slug'
import { z } from 'zod'

const CreateSessionSchema = z.object({
  title: z.string().min(1).max(100),
  shopLink: z.string().url().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankAccount: z.string().optional().or(z.literal('')),
  shippingFee: z.coerce.number().min(0).default(0),
  hostDeviceId: z.string().min(1),
  hostName: z.string().min(1).max(50).default('Host'),
  password: z.string().optional().or(z.literal('')),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { title, shopLink, bankName, bankAccount, shippingFee, hostDeviceId, hostName, password } = parsed.data

    const supabase = await createClient()

    // Generate unique slug for the session (retry on collision)
    let slug = generateSlug()
    let attempts = 0
    while (attempts < 5) {
      const { data } = await supabase.from('sessions').select('id').eq('slug', slug).maybeSingle()
      if (!data) break
      slug = generateSlug()
      attempts++
    }

    // Let's just pass `password` into the session insert:

    const { data: session, error } = await (supabase.from('sessions') as any)
      .insert({
        slug,
        title,
        shop_link: shopLink || null,
        host_default_bank_name: bankName || null,
        host_default_bank_account: bankAccount || null,
        shipping_fee: shippingFee,
        host_device_id: hostDeviceId,
        status: 'open',
        discount_type: 'amount',
        discount_value: 0,
        password: password || null,
        is_split_batch: false,
      })
      .select('id, slug, title, host_device_id, status, host_default_bank_name, host_default_bank_account, host_default_qr_payload, discount_type, discount_value, shipping_fee, is_split_batch, use_default_qr_for_all, created_at')
      .single()

    if (error) {
      console.error('Session insert error:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Create host participant with the provided host name
    const { data: participant, error: pError } = await (supabase.from('participants') as any)
      .insert({
        session_id: session.id,
        name: hostName,
        is_host: true,
        is_paid: false,
      })
      .select()
      .single()

    if (pError) {
      console.error('Participant insert error:', pError)
    }

    return NextResponse.json({ session, participantId: participant?.id }, { status: 201 })
  } catch (e) {
    console.error('POST /api/sessions error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
