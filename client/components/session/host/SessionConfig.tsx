'use client'

import * as React from 'react'
import { Session } from '@/lib/types'
import { Users, Lock, Loader2, Crown, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getHostSecret } from '@/lib/identity'

interface SessionConfigProps {
  session: Session
  hasSubOrders: boolean
  isToggling: boolean
  isLoading: boolean
  showPasswordEdit: boolean
  hostPasswordDraft: string
  setHostPasswordDraft: (val: string) => void
  onToggleSplitBatch: (isSplit: boolean) => void
  onTogglePassword: (enabled: boolean) => void
  onSavePassword: () => void
  slug: string
}

export function SessionConfig({
  session,
  hasSubOrders,
  isToggling,
  isLoading,
  showPasswordEdit,
  hostPasswordDraft,
  setHostPasswordDraft,
  onToggleSplitBatch,
  onTogglePassword,
  onSavePassword,
  slug
}: SessionConfigProps) {
  const [showSecret, setShowSecret] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const adminSecret = getHostSecret(slug)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Cấu hình phiên</label>
        {adminSecret && (
          <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Crown className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 font-mono tracking-widest">{showSecret ? adminSecret : '******'}</span>
            <button onClick={() => setShowSecret(!showSecret)} className="text-amber-400/50 hover:text-amber-400">
              {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <button onClick={() => copyToClipboard(adminSecret)} className="text-amber-400/50 hover:text-amber-400">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>
      {adminSecret && (
        <p className="text-[10px] text-white/20 mt-[-12px] px-1 italic">
          * Dùng mã này để khôi phục quyền Host nếu bạn đổi trình duyệt hoặc mất dữ liệu thiết bị.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className={`p-4 rounded-3xl flex items-center justify-between border-white/10 transition-all ${hasSubOrders ? 'bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'bg-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${hasSubOrders ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Chia đơn con</span>
              <span className="text-[10px] text-white/30 font-bold uppercase">{hasSubOrders ? 'Đang bật' : 'Đang tắt'}</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={hasSubOrders} 
              onChange={(e) => onToggleSplitBatch(e.target.checked)} 
              disabled={isToggling} 
            />
            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-emerald-500 transition-colors relative">
              <div className={`absolute top-[3px] left-[3px] bg-white rounded-full h-4.5 w-4.5 transition-all shadow-lg ${hasSubOrders ? 'translate-x-[20px]' : ''}`} />
            </div>
          </label>
        </Card>

        <Card className={`p-4 rounded-3xl flex items-center justify-between border-white/10 transition-all ${session.hasPassword ? 'bg-sky-500/5 ring-1 ring-sky-500/20' : 'bg-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${session.hasPassword ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/20'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Mật khẩu Host</span>
              <span className="text-[10px] text-white/30 font-bold uppercase">{session.hasPassword ? 'Đã khoá' : 'Công khai'}</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={!!session.hasPassword || showPasswordEdit} onChange={(e) => onTogglePassword(e.target.checked)} />
            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-sky-500 transition-colors relative">
              <div className={`absolute top-[3px] left-[3px] bg-white rounded-full h-4.5 w-4.5 transition-all shadow-lg ${!!session.hasPassword || showPasswordEdit ? 'translate-x-[20px]' : ''}`} />
            </div>
          </label>
        </Card>
      </div>

      {showPasswordEdit && (
        <div className="flex items-center gap-2 animate-in slide-in-from-top-2 p-1">
          <Input autoFocus placeholder="Thiết lập mật khẩu mới..." className="h-11 bg-black/40 border-white/10 rounded-2xl px-4 text-sm" value={hostPasswordDraft} onChange={e => setHostPasswordDraft(e.target.value)} />
          <Button className="h-11 px-6 bg-sky-600 hover:bg-sky-500 rounded-2xl font-bold uppercase text-xs" onClick={onSavePassword} disabled={!hostPasswordDraft || isLoading}>Lưu</Button>
        </div>
      )}
    </section>
  )
}
