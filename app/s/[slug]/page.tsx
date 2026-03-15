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
    .select('id, slug, title, host_device_id, shop_link, host_default_bank_name, host_default_bank_account, host_default_qr_payload, status, discount_type, discount_value, shipping_fee, is_split_batch, use_default_qr_for_all, password, batch_configs, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (!sessionData) notFound()
  const session = sessionData as unknown as Session

  const [{ data: participantsData }, { data: orderItemsData }, { data: orderBatchesData }] = await Promise.all([
    supabase.from('participants').select('id, session_id, name, is_host, is_paid, last_active').eq('session_id', session.id).order('last_active', { ascending: true }),
    supabase.from('order_items').select('id, participant_id, session_id, order_batch_id, item_name, price, quantity, note, ice, sugar, pay_separate, created_at').eq('session_id', session.id).order('created_at', { ascending: true }),
    supabase.from('order_batches').select('id, session_id, name, bank_name, bank_account, qr_payload, status, is_default, sort_order, created_at').eq('session_id', session.id).order('created_at', { ascending: true }),
  ])

  return (
    <SessionClient
      initialSession={session}
      initialParticipants={(participantsData || []) as unknown as Participant[]}
      initialItems={(orderItemsData || []) as unknown as OrderItem[]}
      initialBatches={(orderBatchesData || []) as unknown as any[]}
    />
  )
}

