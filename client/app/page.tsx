'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2, Plus, ChevronRight, Coffee, Users, Share2, Wallet,
  DoorOpen, ChevronDown, ChevronUp, Eye, EyeOff, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOrCreateDeviceId, setParticipantId } from '@/lib/identity'
import { api } from '@/lib/api'
import { generateSlug } from '@/lib/slug'

const schema = z.object({
  title: z.string().min(1, 'Tên đơn không được để trống').max(100),
  shopLink: z.string().url('Link không hợp lệ').optional().or(z.literal('')),
  hostName: z.string().min(1, 'Tên của bạn không được để trống').max(50),
  sessionPassword: z.string().max(100).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [createError, setCreateError] = useState('')

  // Join room state
  const [joinId, setJoinId] = useState('')
  const [joinError, setJoinError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { title: '', shopLink: '', hostName: '', sessionPassword: '' },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setCreateError('')
    try {
      const deviceId = getOrCreateDeviceId()

      const res = await api.sessions.create({
        slug: generateSlug(),
        title: data.title,
        shopLink: data.shopLink || null,
        host_device_id: deviceId,
        hostName: data.hostName,
        password: showPassword && data.sessionPassword ? data.sessionPassword : null,
      })

      // Go backend returns { session: domain.Session, participant: domain.Participant }
      if (res.participant?.id) {
        setParticipantId(res.session.id, res.participant.id)
      }

      router.push(`/s/${res.session.slug}`)
    } catch (e: any) {
      console.error(e)
      setCreateError(e.message || 'Có lỗi xảy ra khi tạo đơn. Vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Hero */}
      <header className="pt-20 pb-12 px-4 text-center fade-in slide-up">
        <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 rounded-full px-4 py-1.5 text-sm text-sky-300 mb-8 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <span className="live-dot inline-block w-2 h-2 bg-emerald-400 rounded-full" />
          Gọi đồ nhóm · Chia tiền siêu nhanh
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-indigo-400 mb-4 tracking-tight drop-shadow-sm">
          MilkTea Party 🧋
        </h1>
        <p className="text-white/60 text-lg max-w-sm mx-auto leading-relaxed">
          Tạo đơn, chia sẻ link, tự động chia tiền ship &amp; giảm giá. Không cần tài khoản!
        </p>
      </header>

      {/* Features */}
      <div className="grid grid-cols-3 gap-3 px-4 max-w-md mx-auto w-full mb-12 fade-in" style={{ animationDelay: '100ms' }}>
        {[
          { icon: Users, label: 'Cùng đặt' },
          { icon: Share2, label: 'Share link' },
          { icon: Wallet, label: 'Tự chia tiền' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="glass rounded-xl p-4 text-center flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
            <Icon className="w-6 h-6 text-sky-400" />
            <span className="text-xs text-white/70 font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Form area */}
      <div className="flex-1 px-4 pb-12 max-w-md mx-auto w-full flex flex-col gap-4">

        {/* Create form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-sky-400" />
              Tạo đơn mới
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                id="hostName"
                placeholder="Tên của bạn (Host)"
                className="rounded-2xl h-12"
                error={errors.hostName?.message}
                {...register('hostName')}
              />
              <Input
                id="title"
                placeholder="Tên đơn (v/d: Trà sữa chiều thứ 6)"
                className="rounded-2xl h-12"
                error={errors.title?.message}
                {...register('title')}
              />
              <Input
                id="shopLink"
                placeholder="Link shop / menu (tuỳ chọn)"
                className="rounded-2xl h-12"
                error={errors.shopLink?.message}
                {...register('shopLink')}
              />

              {/* Password option */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="custom-checkbox"
                  />
                  Bảo vệ bằng mật khẩu
                </label>

                {showPassword && (
                  <div className="relative animate-in slide-in-from-top-2 duration-200">
                    <input
                      id="sessionPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-sky-500/50 pr-10 text-sm"
                      {...register('sessionPassword')}
                    />
                  </div>
                )}
              </div>

              {createError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-xs text-rose-400 mt-2 animate-in fade-in slide-in-from-top-1">
                  {createError}
                </div>
              )}

              <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full rounded-2xl h-14 font-bold bg-blue-600 hover:bg-blue-500">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tạo...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Tạo nhóm ngay <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
              <a href="/history" className="text-xs text-white/40 hover:text-sky-400 flex items-center gap-1.5 transition-colors">
                <Clock className="w-3.5 h-3.5" /> Xem lịch sử các đơn cũ
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Join form */}
        <Card className="bg-white/5 border-white/10 mt-4 rounded-3xl">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2 mb-3">
              <DoorOpen className="w-4 h-4 text-emerald-400" />
              Vào đơn đã có
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  className="bg-black/20 font-mono text-sm placeholder:font-sans rounded-xl h-11"
                  placeholder="Nhập mã 6 số (123456) hoặc slug (ngon-sua-vits)"
                  value={joinId}
                  onChange={(e) => {
                    const val = e.target.value.trim().toLowerCase()
                    setJoinId(val)
                    setJoinError('')
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const slug = joinId.trim().replace(/^#/, '')
                      if (slug) router.push(`/s/${slug}`)
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  className="rounded-xl px-6"
                  onClick={() => {
                    const slug = joinId.trim().replace(/^#/, '')
                    if (slug) router.push(`/s/${slug}`)
                  }}
                  disabled={!joinId.trim()}
                >
                  Vào ngay
                </Button>
              </div>
              {joinError && <p className="text-xs text-rose-400 px-1">{joinError}</p>}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/20 text-[10px] mt-2">
          Gợi ý: Dùng trình duyệt thường (không ẩn danh) để lưu lại lịch sử
        </p>
      </div>
    </div>
  )
}
