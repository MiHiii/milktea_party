import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { Session, Participant, OrderItem } from '@/lib/types'
import SessionClient from './SessionClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const session = await api.sessions.getBySlug(slug)
    return {
      title: session ? `${session.title} · MilkTea Party 🧋` : 'MilkTea Party 🧋',
    }
  } catch (e) {
    return { title: 'MilkTea Party 🧋' }
  }
}

export default async function SessionPage({ params }: Props) {
  const { slug } = await params
  
  let session: Session
  try {
    session = await api.sessions.getBySlug(slug)
  } catch (e) {
    notFound()
  }

  if (!session) notFound()

  const [participants, orderItems, orderBatches] = await Promise.all([
    api.participants.getBySession(session.id),
    api.orderItems.getBySession(session.id),
    api.orderBatches.getBySession(session.id),
  ])

  return (
    <SessionClient
      initialSession={session}
      initialParticipants={participants as Participant[]}
      initialItems={orderItems as OrderItem[]}
      initialBatches={orderBatches as any[]}
    />
  )
}

