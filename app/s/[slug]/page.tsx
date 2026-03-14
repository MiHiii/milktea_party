import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Session, Participant, OrderItem } from '@/lib/types'
import SessionClient from './SessionClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('sessions').select('title').eq('slug', slug).maybeSingle()
  return {
    title: data ? `${(data as { title: string }).title} · MilkTea Party 🧋` : 'MilkTea Party 🧋',
  }
}

export default async function SessionPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: sessionData } = await supabase
    .from('sessions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!sessionData) notFound()
  const session = sessionData as unknown as Session

  const [{ data: participantsData }, { data: orderItemsData }] = await Promise.all([
    supabase.from('participants').select('*').eq('session_id', session.id).order('last_active', { ascending: true }),
    supabase.from('order_items').select('*').eq('session_id', session.id).order('created_at', { ascending: true }),
  ])

  return (
    <SessionClient
      initialSession={session}
      initialParticipants={(participantsData || []) as unknown as Participant[]}
      initialItems={(orderItemsData || []) as unknown as OrderItem[]}
    />
  )
}

