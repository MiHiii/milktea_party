import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch participant to verify session is open
  const { data: participant } = await (supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .maybeSingle() as any)

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  if (participant.is_host) {
    return NextResponse.json({ error: 'Cannot remove host' }, { status: 400 })
  }

  const { data: session } = await (supabase
    .from('sessions')
    .select('status')
    .eq('id', participant.session_id)
    .maybeSingle() as any)

  if (!session || session.status !== 'open') {
    return NextResponse.json({ error: 'Session is locked' }, { status: 409 })
  }

  const { error } = await supabase.from('participants').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
