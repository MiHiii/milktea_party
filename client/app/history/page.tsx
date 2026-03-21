'use client'

import { useEffect, useState } from 'react'
import { Clock, Crown, Users, ArrowRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateDeviceId, getParticipantId } from '@/lib/identity'
import { Session } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function StatusBadge({ status }: { status: Session['status'] }) {
  if (status === 'open') return <Badge variant="open">🟢 Mở đơn</Badge>
  if (status === 'locked') return <Badge variant="locked">🔒 Đã chốt</Badge>
  return <Badge variant="paid">✅ Đã thanh toán</Badge>
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      const deviceId = getOrCreateDeviceId()
      const supabase = createClient()

      // Find all sessions where user was host
      const { data: hostSessions } = await supabase
        .from('sessions')
        .select('id, slug, title, status, host_device_id, created_at')
        .eq('host_device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(50)

      // Find sessions where the user was a participant (via localStorage keys)
      const participationKeys = Object.keys(localStorage).filter(k => k.startsWith('p_id_'))
      const sessionIds = participationKeys.map(k => k.replace('p_id_', ''))

      let participantSessions: Session[] = []
      if (sessionIds.length > 0) {
        const { data } = await supabase
          .from('sessions')
          .select('id, slug, title, status, host_device_id, created_at')
          .in('id', sessionIds)
          .order('created_at', { ascending: false })
          .limit(50)
        participantSessions = (data as any) || []
      }

      // Merge and deduplicate
      const merged = [...(hostSessions || []), ...participantSessions]
      const seen = new Set<string>()
      const unique = merged.filter(s => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })

      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setSessions(unique)
      setLoading(false)
    }

    fetchHistory()
  }, [])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-dvh pb-10">
      {/* Header */}
      <header className="px-4 pt-12 pb-8 text-center">
        <a href="/" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 mb-6 text-sm transition-colors">
          ← Trang chủ
        </a>
        <h1 className="text-3xl font-black text-white mb-2">📋 Lịch sử đơn</h1>
        <p className="text-white/50 text-sm">Tất cả đơn bạn đã tạo hoặc tham gia</p>
      </header>

      <div className="max-w-xl mx-auto px-4 flex flex-col gap-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-sky-400/50" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium mb-1">Chưa có đơn nào</p>
                <p className="text-white/40 text-sm">Tạo đơn đầu tiên để bắt đầu nào!</p>
              </div>
              <Button asChild>
                <a href="/"><Plus className="w-4 h-4" /> Tạo đơn mới</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && sessions.map((session) => {
          const deviceId = getOrCreateDeviceId()
          const isHost = session.host_device_id === deviceId
          const myPid = getParticipantId(session.id)

          return (
            <a key={session.id} href={`/s/${session.slug}`} className="block group">
              <Card className="transition-all duration-200 group-hover:bg-white/15 group-hover:border-white/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex-1 min-w-0">{session.title}</CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={session.status} />
                      {isHost && <Badge variant="host"><Crown className="w-3 h-3" />Host</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(session.created_at)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />/{session.slug}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-sky-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </a>
          )
        })}
      </div>
    </div>
  )
}
