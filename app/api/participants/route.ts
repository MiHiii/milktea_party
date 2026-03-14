import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ClaimNameSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().min(1).max(50),
  isHost: z.boolean().optional().default(false),
})

// POST: Claim a name in a session
// Returns { status: 'created' | 'exists', participant }
export async function POST(request: Request) {
  const body = await request.json()
  const parsed = ClaimNameSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { sessionId, name, isHost } = parsed.data
  const supabase = await createClient()

  // Check if name already exists in this session (case-insensitive)
  const { data: existing } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .ilike('name', name)
    .maybeSingle()

  if (existing) {
    // Return existing participant with 'exists' flag for the "Is this you?" modal
    return NextResponse.json({ status: 'exists', participant: existing }, { status: 200 })
  }

  // Create new participant
  const { data: participant, error } = await (supabase.from('participants') as any)
    .insert({
      session_id: sessionId,
      name,
      is_host: isHost,
      is_paid: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 })
  }

  return NextResponse.json({ status: 'created', participant }, { status: 201 })
}

// PATCH: Update participant (isPaid and/or name)
export async function PATCH(request: Request) {
  const body = await request.json()
  const { participantId, isPaid, name } = body

  if (!participantId) {
    return NextResponse.json({ error: 'Missing participantId' }, { status: 400 })
  }

  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (isPaid !== undefined) updates.is_paid = isPaid
  if (name !== undefined) updates.name = name

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await (supabase.from('participants') as any)
    .update(updates)
    .eq('id', participantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ participant: data })
}
