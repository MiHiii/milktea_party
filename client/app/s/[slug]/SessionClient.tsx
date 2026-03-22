'use client'

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle, Share2, ExternalLink, Loader2, ShoppingBag, Users, QrCode, Receipt,
  Lock, Crown, ChevronDown, ArrowLeft, Settings, Eye, EyeOff, Check, Copy, Camera, Image as ImageIcon, ShoppingCart
} from 'lucide-react'
import { getOrCreateDeviceId, getParticipantId, setParticipantId, isHost } from '@/lib/identity'
import { calculateBill, formatVND } from '@/lib/calc'
import { BANK_OPTIONS, parseVietQR } from '@/lib/vietqr'
import { Session, Participant, OrderItem as OrderItemType, BillEntry, OrderBatch } from '@/lib/types'
import { api, createWS } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import jsQR from 'jsqr'

// Import Sub-components
import { OrderForm } from '@/components/session/OrderForm'
import { ParticipantItem } from '@/components/session/ParticipantItem'
import { HostSettings } from '@/components/session/HostSettings'
import { QrSection } from '@/components/session/QrSection'
import { BillSummary } from '@/components/session/BillSummary'
import { ConfirmModal } from '@/components/session/ConfirmModal'
import { ActionSheet } from '@/components/ui/ActionSheet'

interface Props {
  initialSession: Session
  initialParticipants: Participant[]
  initialItems: OrderItemType[]
  initialBatches: OrderBatch[]
}

const addItemSchema = z.object({
  itemName: z.string().min(1, 'Tên món không được để trống').max(200),
  price: z.coerce.number().min(0, 'Giá phải >= 0'),
  quantity: z.coerce.number().min(1).max(99).default(1),
  note: z.string().max(200).optional().or(z.literal('')),
  ice: z.string().optional(),
  sugar: z.string().optional(),
  orderBatchId: z.string().uuid().nullable().optional(),
  paySeparate: z.boolean().default(true),
})

const PERCENT_OPTIONS = ['0%', '30%', '50%', '70%', '100%']

export default function SessionClient({ initialSession, initialParticipants, initialItems, initialBatches = [] }: Props) {
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<Session>(initialSession)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants || [])
  const [orderItems, setOrderItems] = useState<OrderItemType[]>(initialItems || [])
  const [orderBatches, setOrderBatches] = useState<OrderBatch[]>(initialBatches || [])
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null)
  const [iAmHost, setIAmHost] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null)
  const [showQrs, setShowQrs] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ itemName: '', price: '', quantity: '', note: '', ice: '50%', sugar: '50%', orderBatchId: null as string | null, paySeparate: false })
  const [justAdded, setJustAdded] = useState(false)
  const [hostControlsOpen, setHostControlsOpen] = useState(false)
  const [finalTotal, setFinalTotal] = useState('')
  const [batchFinalTotals, setBatchFinalTotals] = useState<Record<string, string>>({})
  const [batchNameDraft, setBatchNameDraft] = useState('')
  const [showNewBatch, setShowNewBatch] = useState(false)
  const [newBatchDraft, setNewBatchDraft] = useState('')
  const [bankNameInput, setBankNameInput] = useState(initialSession.hostDefaultBankName || '')
  const [bankAccountInput, setBankAccountInput] = useState(initialSession.hostDefaultBankAccount || '')
  const [showPasswordEdit, setShowPasswordEdit] = useState(false)
  const [hostPasswordDraft, setHostPasswordDraft] = useState('')
  const [passwordVerified, setPasswordVerified] = useState(true)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimCandidate, setClaimCandidate] = useState<Participant | null>(null)
  const [showBillSummary, setShowBillSummary] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, description: ReactNode, onConfirm: () => void, variant?: 'primary' | 'destructive' }>({ isOpen: false, title: '', description: '', onConfirm: () => {} })
  
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [isProcessingQR, setIsProcessingQR] = useState(false)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  const [showChangeToast, setShowChangeToast] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef('')

  const showWarning = (title: string, description: ReactNode) => {
    setConfirmConfig({ isOpen: true, title, description, variant: 'primary', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) })
  }

  // 1. Initial State & Logic Cleanup
  useEffect(() => {
    setMounted(true)
    const amHost = isHost(initialSession.hostDeviceId)
    setIAmHost(amHost)

    if (initialSession.hasPassword) {
      const isVerified = sessionStorage.getItem(`sessionVerified_${initialSession.id}`) === 'true'
      if (!amHost && !isVerified) setPasswordVerified(false)
    }

    const savedPid = getParticipantId(initialSession.id)
    if (savedPid) {
      setMyParticipantId(savedPid)
      setExpandedParticipant(savedPid)
    } else if (amHost) {
      const hostP = initialParticipants.find(p => p.isHost)
      if (hostP) {
        setParticipantId(initialSession.id, hostP.id)
        setMyParticipantId(hostP.id)
        setExpandedParticipant(hostP.id)
      } else setNameModalOpen(true)
    } else setNameModalOpen(true)
  }, [initialSession, initialParticipants])

  // 2. WebSocket & Realtime Sync
  useEffect(() => {
    if (!mounted) return

    const ws = createWS(session.id)
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const payload = msg.payload

        switch (msg.type) {
          case 'session_updated':
            setSession(prev => ({ ...prev, ...payload }))
            break
          case 'participant_created':
            setParticipants(prev => prev.some(p => p.id === payload.id) ? prev : [...prev, payload])
            break
          case 'order_item_created':
            setOrderItems(prev => prev.some(i => i.id === payload.id) ? prev : [...prev, payload])
            break
          case 'order_item_updated':
            setOrderItems(prev => prev.map(i => i.id === payload.id ? payload : i))
            break
          case 'order_item_deleted':
            setOrderItems(prev => prev.filter(i => i.id !== payload.id))
            break
          case 'order_batch_created':
            setOrderBatches(prev => prev.some(b => b.id === payload.id) ? prev : [...prev, payload])
            break
          case 'order_batch_updated':
            setOrderBatches(prev => prev.map(b => b.id === payload.id ? payload : b))
            break
          case 'order_batch_deleted':
            setOrderBatches(prev => prev.filter(b => b.id !== payload.id))
            break
        }
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    const heartbeat = setInterval(() => {
      const pid = getParticipantId(session.id)
      if (pid) api.participants.heartbeat(pid).catch(() => {})
    }, 30000)

    return () => {
      ws.close()
      clearInterval(heartbeat)
    }
  }, [mounted, session.id])

  // 3. Form & UI Actions
  const addItemForm = useForm({ 
    resolver: zodResolver(addItemSchema) as any, 
    defaultValues: { quantity: 1, itemName: '', price: '' as any, note: '', sugar: '50%', ice: '50%', orderBatchId: null as string | null, paySeparate: true } 
  })

  useEffect(() => { 
    if (orderBatches.length > 0 && !addItemForm.getValues('orderBatchId')) {
      const def = orderBatches.find(b => b.isDefault) || orderBatches[0]
      addItemForm.setValue('orderBatchId', def.id)
    }
  }, [orderBatches, addItemForm])

  const deleteItem = useCallback(async (itemId: string) => { 
    try { await api.orderItems.delete(itemId) } catch { } 
  }, [])
  
  const startEdit = useCallback((item: OrderItemType) => { 
    setEditingItemId(item.id)
    setEditDraft({ 
      itemName: item.itemName, 
      price: String(item.price), 
      quantity: String(item.quantity), 
      note: item.note || '', 
      ice: item.ice || '50%', 
      sugar: item.sugar || '50%', 
      orderBatchId: item.orderBatchId, 
      paySeparate: !!item.paySeparate 
    }) 
  }, [])
  
  const saveEdit = useCallback(async (itemId: string) => { 
    if (Number(editDraft.price) % 100 !== 0) { showWarning('Số tiền không hợp lệ', 'Vui lòng nhập số tiền chia hết cho 100'); return } 
    setIsLoading(true)
    try { 
      await api.orderItems.update(itemId, { 
        itemName: editDraft.itemName, 
        price: Number(editDraft.price), 
        quantity: Number(editDraft.quantity), 
        note: editDraft.note || null, 
        ice: editDraft.ice || null, 
        sugar: editDraft.sugar || null, 
        orderBatchId: editDraft.orderBatchId,
        paySeparate: !!editDraft.paySeparate 
      })
      setEditingItemId(null)
    } finally { setIsLoading(false) } 
  }, [editDraft])
  
  const addItem = useCallback(async (data: any) => { 
    if (Number(data.price) % 100 !== 0) { showWarning('Số tiền không hợp lệ', 'Vui lòng nhập số tiền chia hết cho 100'); return } 
    if (!myParticipantId) return 
    setIsLoading(true)
    try { 
      await api.orderItems.create({ 
        sessionId: session.id, 
        participantId: myParticipantId, 
        itemName: data.itemName, 
        price: Number(data.price), 
        quantity: data.quantity, 
        note: data.note || null, 
        ice: data.ice || null, 
        sugar: data.sugar || null, 
        orderBatchId: data.orderBatchId,
        paySeparate: !!data.paySeparate 
      })
      addItemForm.reset({ ...addItemForm.getValues(), itemName: '', price: '' as any, note: '' })
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 2000)
    } finally { setIsLoading(false) } 
  }, [session.id, myParticipantId, addItemForm])

  const copyToClipboard = useCallback((text: string) => { 
    const el = document.createElement("textarea")
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }, [])

  const shareLink = useCallback(() => { 
    const url = window.location.href
    if (navigator.share) navigator.share({ title: session.title, url })
    else { 
      copyToClipboard(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } 
  }, [session.title, copyToClipboard])

  const copySessionId = useCallback(() => { 
    copyToClipboard(session.slug)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }, [session.slug, copyToClipboard])

  // 4. Host Logic
  const lockOrder = useCallback(async () => { 
    if (!session.hostDefaultBankAccount || !session.hostDefaultBankName) {
      showWarning('Thiếu thông tin Bank', 'Vui lòng bổ sung STK và Ngân hàng của Host.')
      setHostControlsOpen(true)
      return
    }

    setConfirmConfig({ 
      isOpen: true, 
      title: 'Chốt đơn?', 
      description: 'Mọi người sẽ không thể sửa món nữa.',
      variant: 'primary', 
      onConfirm: async () => { 
        setIsLoading(true)
        try { 
          await api.sessions.update(session.id, { status: 'locked' })
          setConfirmConfig(prev => ({ ...prev, isOpen: false })) 
        } finally { setIsLoading(false) } 
      } 
    })
  }, [session])

  const markSessionPaid = useCallback(async () => { 
    setConfirmConfig({ 
      isOpen: true, title: 'Hoàn thành đơn?', description: 'Đánh dấu tất cả là đã thanh toán.', variant: 'primary', 
      onConfirm: async () => { 
        setIsLoading(true)
        try { 
          await api.sessions.update(session.id, { status: 'paid' })
          setConfirmConfig(prev => ({ ...prev, isOpen: false })) 
        } finally { setIsLoading(false) } 
      } 
    }) 
  }, [session])

  const reopenOrder = useCallback(async () => { 
    setConfirmConfig({ 
      isOpen: true, title: 'Mở lại đơn?', description: 'Cho phép mọi người sửa món.', variant: 'primary', 
      onConfirm: async () => { 
        setIsLoading(true)
        try { 
          await api.sessions.update(session.id, { status: 'open' })
          setConfirmConfig(prev => ({ ...prev, isOpen: false })) 
        } finally { setIsLoading(false) } 
      } 
    }) 
  }, [session])

  const claimName = useCallback(async (name: string) => { 
    if (!name.trim()) return
    setIsLoading(true)
    try { 
      const existing = participants.find(p => p.name.toLowerCase() === name.trim().toLowerCase())
      if (existing) { 
        setClaimCandidate(existing)
        setClaimModalOpen(true)
        setNameModalOpen(false)
        return 
      } 
      const res = await api.participants.create({ sessionId: session.id, name: name.trim() })
      if (res?.id) { 
        setParticipantId(session.id, res.id)
        setMyParticipantId(res.id)
        setExpandedParticipant(res.id)
        setNameModalOpen(false) 
      } 
    } finally { setIsLoading(false) } 
  }, [session.id, participants])

  const confirmClaim = useCallback(() => { 
    if (claimCandidate) { 
      setParticipantId(session.id, claimCandidate.id)
      setMyParticipantId(claimCandidate.id)
      setExpandedParticipant(claimCandidate.id)
      setClaimModalOpen(false) 
    } 
  }, [session.id, claimCandidate])

  // Other host actions (Batch, Bank, Password) using api object...
  const onAddBatch = useCallback(async () => { 
    if (!newBatchDraft) return
    setIsLoading(true)
    try { 
      await api.orderBatches.create({ sessionId: session.id, name: newBatchDraft })
      setNewBatchDraft('')
      setShowNewBatch(false) 
    } finally { setIsLoading(false) } 
  }, [session.id, newBatchDraft])

  const onDeleteBatch = useCallback(async (batchId: string, name: string) => {
    setConfirmConfig({
      isOpen: true, title: 'Xoá đợt đơn?', description: `Xoá "${name}" và toàn bộ món bên trong?`, variant: 'destructive', 
      onConfirm: async () => { 
        setIsLoading(true)
        try { 
          await api.orderBatches.delete(batchId)
          setConfirmConfig(prev => ({ ...prev, isOpen: false })) 
        } finally { setIsLoading(false) } 
      } 
    })
  }, [])

  const onUpdateBatchBank = useCallback(async (batchId: string, n: string, a: string, q: string) => { 
    try { await api.orderBatches.update(batchId, { bankName: n, bankAccount: a, qrPayload: q }) } catch { } 
  }, [])

  const onSaveGlobalBank = useCallback(async (name?: string, account?: string) => { 
    try { 
      const bName = name !== undefined ? name : bankNameInput
      const bAcc = account !== undefined ? account : bankAccountInput
      await api.sessions.update(session.id, { hostDefaultBankName: bName, hostDefaultBankAccount: bAcc })
    } catch { } 
  }, [session.id, bankNameInput, bankAccountInput])

  const onToggleSplitBatch = useCallback(async (isSplit: boolean) => {
    setIsToggling(true)
    // Optimistic Update
    setSession(prev => ({ ...prev, isSplitBatch: isSplit }))
    
    try { 
      await api.sessions.update(session.id, { 
        isSplitBatch: isSplit
      }) 
    } catch (e) {
      // Rollback on error
      setSession(prev => ({ ...prev, isSplitBatch: !isSplit }))
    } finally { 
      setIsToggling(false) 
    }
  }, [session.id])

  const onSaveBatchTotal = useCallback(async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault()
    setIsLoading(true)
    try {
      if (session.isSplitBatch) {
        const nC: Record<string, any> = { ...((session.batchConfigs as Record<string, any>) || {}) }
        orderBatches.forEach(batch => { 
          const val = batchFinalTotals[batch.id] || ''
          if (val && Number(val) >= 0) { 
            const bT = Number(val)
            const bIT = orderItems.filter(i => i.orderBatchId === batch.id).reduce((s, i) => s + i.price * i.quantity, 0)
            nC[batch.name] = bT >= bIT ? { type: 'amount', value: 0, ship: bT - bIT } : { type: 'amount', value: bIT - bT, ship: 0 }
          } 
        })
        await api.sessions.update(session.id, { batchConfigs: nC })
      } else {
        const iGT = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
        const t = Number(finalTotal)
        if (t && t >= 0) { 
          const dV = t < iGT ? iGT - t : 0
          const sF = t > iGT ? t - iGT : 0
          await api.sessions.update(session.id, { 
            discountType: 'amount', 
            discountValue: dV, 
            shippingFee: sF 
          })
        } 
      }
      setHostControlsOpen(false)
    } finally { setIsLoading(false) }
  }, [session, orderBatches, batchFinalTotals, orderItems, finalTotal])

  const verifyPassword = useCallback(async () => {
    setCheckingPassword(true)
    try {
      await api.sessions.verifyPassword(session.slug, passwordInput)
      sessionStorage.setItem(`sessionVerified_${session.id}`, 'true')
      setPasswordVerified(true)
    } catch (e: any) {
      setPasswordError(e.message || 'Sai mật khẩu')
    } finally { setCheckingPassword(false) }
  }, [session, passwordInput])

  const handleScanQR = useCallback(async (file: File) => {
    setIsProcessingQR(true)
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, canvas.width, canvas.height)
          if (code) {
            const result = parseVietQR(code.data)
            if (result.bankAccount && result.bankName) {
              if (selectedBatchId) {
                onUpdateBatchBank(selectedBatchId, result.bankName, result.bankAccount, code.data)
              } else {
                setBankNameInput(result.bankName)
                setBankAccountInput(result.bankAccount)
                onSaveGlobalBank(result.bankName, result.bankAccount)
              }
              alert('🛍️ Đã nhận diện được số tài khoản!')
            } else {
              alert('Nhận diện được mã nhưng không tìm thấy số tài khoản hợp lệ.')
            }
          } else {
            alert('Không nhận diện được mã QR. Bạn hãy thử chụp lại rõ hơn nhé!')
          }
        }
        img.src = e.target?.result as string
        setQrPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } finally {
      setIsProcessingQR(false)
      setShowActionSheet(false)
    }
  }, [selectedBatchId, onUpdateBatchBank, onSaveGlobalBank])

  // 5. Derived State
  const billEntries: BillEntry[] = calculateBill(session, participants, orderItems, orderBatches)
  const myBill = billEntries.find(e => e.participant.id === myParticipantId)
  const canEdit = session.status === 'open'

  if (!passwordVerified) return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <Card className="w-full max-w-sm rounded-[2.5rem] bg-slate-900 border-white/10 p-6 shadow-2xl">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-2xl flex items-center justify-center mb-3"><Lock className="w-6 h-6 text-sky-400" /></div>
          <CardTitle className="text-lg">Đơn có mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              value={passwordInput} 
              onChange={e => { setPasswordInput(e.target.value); setPasswordError('') }} 
              placeholder="Mật khẩu..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500/50 pr-10" 
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>}
          <Button onClick={verifyPassword} disabled={checkingPassword || !passwordInput} className="w-full rounded-2xl h-11 font-bold bg-blue-600 hover:bg-blue-500">Vào đơn</Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-dvh pb-8">
      <header className="sticky top-0 z-30 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/" className="text-white/50 hover:text-white"><ArrowLeft className="w-5 h-5" /></a>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <button onClick={copySessionId} className="group flex items-center gap-1.5 text-white/60 font-mono text-xs bg-white/5 px-2 py-0.5 rounded-md"># {session.slug} {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}</button>
              <h1 className="font-bold text-white truncate text-sm sm:text-base">{session.title}</h1>
              <Badge variant={session.status === 'open' ? 'open' : (session.status === 'locked' ? 'locked' : 'paid')}>{session.status === 'open' ? '🟢 Mở đơn' : (session.status === 'locked' ? '🔒 Đã chốt' : '✅ Đã thanh toán')}</Badge>
              {iAmHost && <Badge variant="host" className="bg-amber-500/20 text-amber-400 border-amber-500/20"><Crown className="w-3 h-3" />Host</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span><span className="live-dot inline-block w-2 h-2 bg-emerald-400 rounded-full" /></span>
            {iAmHost && <Button variant="outline" size="icon" onClick={() => setHostControlsOpen(true)} className="rounded-xl"><Settings className="w-4 h-4" /></Button>}
            <Button variant="outline" size="icon" onClick={shareLink} className="rounded-xl">{copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}</Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-3 flex flex-col gap-3">
        {session.status !== 'open' && myBill && !myBill.participant.isPaid && myBill.total > 0 && ( 
          <div className="bg-gradient-to-r from-sky-600/30 to-indigo-600/30 border border-sky-500/30 rounded-[2.5rem] p-6 text-center shadow-2xl"> 
            <p className="text-sm text-white/70 mb-1">Bạn cần thanh toán</p> 
            <p className="text-4xl font-black text-white tabular-nums">{formatVND(myBill.total)}</p> 
          </div> 
        )}
        
        {canEdit && ( 
          <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.02]"> 
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-sky-400" />Gọi của bạn</CardTitle></CardHeader> 
            <CardContent> 
              <OrderForm session={session} orderBatches={orderBatches} form={addItemForm} onSubmit={addItem} onClear={() => addItemForm.reset()} isLoading={isLoading} justAdded={justAdded} PERCENT_OPTIONS={PERCENT_OPTIONS} /> 
            </CardContent> 
          </Card> 
        )}

        <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.02]"> 
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" />Đơn hàng ({participants.length} người)</CardTitle></CardHeader> 
          <CardContent className="p-0"> 
            <div className="divide-y divide-white/5"> 
              {participants.map(p => (
                <ParticipantItem 
                  key={p.id} participant={p} items={orderItems.filter(i => i.participantId === p.id)} session={session} orderBatches={orderBatches} 
                  myParticipantId={myParticipantId} iAmHost={iAmHost} isExpanded={expandedParticipant === p.id} onToggleExpand={() => setExpandedParticipant(expandedParticipant === p.id ? null : p.id)} 
                  editingItemId={editingItemId} editDraft={editDraft} setEditDraft={setEditDraft} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingItemId(null)} 
                  onDeleteItem={deleteItem} onCopyItem={(i) => { addItemForm.reset({ itemName: i.itemName, price: i.price, quantity: i.quantity, note: i.note || '', ice: i.ice || '50%', sugar: i.sugar || '50%', orderBatchId: i.orderBatchId, paySeparate: !!i.paySeparate }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} 
                  onTogglePaid={() => {}} isLoading={isLoading} PERCENT_OPTIONS={PERCENT_OPTIONS} 
                />
              ))} 
            </div> 
          </CardContent> 
        </Card>

        {billEntries.length > 0 && orderItems.length > 0 && ( 
          <div className="flex flex-col gap-3"> 
            <button onClick={() => setShowBillSummary(!showBillSummary)} className="w-full h-14 rounded-[1.5rem] bg-sky-500/10 border border-sky-500/20 text-sky-400 font-black uppercase text-xs flex items-center justify-center gap-2 transition-all">
              <Receipt className="w-4 h-4" />{showBillSummary ? 'Ẩn bảng tạm tính' : 'Xem bảng tạm tính'}
              <ChevronDown className={`w-4 h-4 transition-all ${showBillSummary ? 'rotate-180' : ''}`} />
            </button> 
            {showBillSummary && <BillSummary entries={billEntries} session={session} batches={orderBatches} />} 
          </div> 
        )}

        <QrSection session={session} orderBatches={orderBatches} myParticipantId={myParticipantId} iAmHost={iAmHost} showQrs={showQrs} myBill={myBill} billEntries={billEntries} copyToClipboard={copyToClipboard} />
        
        {iAmHost && ( 
          <div className="flex flex-col gap-3 mt-4"> 
            {session.status === 'open' ? (
              <Button variant="warning" size="lg" onClick={lockOrder} disabled={isLoading} className="w-full text-lg font-bold py-7 rounded-[2rem] uppercase tracking-widest"><Lock className="w-5 h-5 mr-2" /> Chốt đơn</Button>
            ) : session.status === 'locked' ? (
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={() => setShowQrs(!showQrs)} className="flex-1 py-7 rounded-[2rem] font-bold uppercase">QR</Button>
                <Button variant="success" size="lg" onClick={markSessionPaid} disabled={isLoading} className="flex-1 py-7 rounded-[2rem] font-bold uppercase">Hoàn thành</Button>
              </div>
            ) : (
              <div className="text-center py-6 bg-emerald-500/10 rounded-[2rem] font-black text-emerald-400 uppercase">✅ Hoàn thành!</div>
            )} 
            {session.status !== 'open' && (
              <button onClick={reopenOrder} className="mt-2 text-[10px] text-white/20 hover:text-sky-400 uppercase font-black text-center w-full">Mở lại đơn?</button>
            )} 
          </div> 
        )}
      </div>

      <HostSettings 
        session={session} orderBatches={orderBatches} orderItems={orderItems} isLoading={isLoading} isToggling={isToggling} isProcessingQR={isProcessingQR} qrPreviewUrl={qrPreviewUrl} 
        open={hostControlsOpen} onOpenChange={setHostControlsOpen} finalTotal={finalTotal} setFinalTotal={setFinalTotal} batchFinalTotals={batchFinalTotals} setBatchFinalTotals={setBatchFinalTotals} 
        batchNameDraft={batchNameDraft} setBatchNameDraft={setBatchNameDraft} showNewBatch={showNewBatch} setShowNewBatch={setShowNewBatch} newBatchDraft={newBatchDraft} setNewBatchDraft={setNewBatchDraft} 
        bankNameInput={bankNameInput} setBankNameInput={setBankNameInput} bankAccountInput={bankAccountInput} setBankAccountInput={setBankAccountInput} 
        showPasswordEdit={showPasswordEdit} hostPasswordDraft={hostPasswordDraft} setHostPasswordDraft={setHostPasswordDraft} 
        onSaveBatchTotal={onSaveBatchTotal} onAddBatch={onAddBatch} onDeleteBatch={onDeleteBatch} onUpdateBatchName={() => {}} onUpdateBatchBank={onUpdateBatchBank} 
        onToggleSplitBatch={onToggleSplitBatch} onTogglePassword={() => {}} onSavePassword={() => {}} onSaveGlobalBank={onSaveGlobalBank} 
        onTriggerActionSheet={(bId) => { setSelectedBatchId(bId || null); setShowActionSheet(true) }} BANK_OPTIONS={BANK_OPTIONS} 
      />

      <Dialog open={nameModalOpen} onOpenChange={() => { }}>
        <DialogContent className="[&>button:last-child]:hidden rounded-[2.5rem] bg-slate-900 border-white/10">
          <DialogHeader><DialogTitle>👋 Bạn là ai?</DialogTitle></DialogHeader>
          <Input placeholder="Tên..." onChange={e => nameInputRef.current = e.target.value} onKeyDown={e => e.key === 'Enter' && claimName(nameInputRef.current)} className="rounded-2xl h-12" />
          <DialogFooter><Button onClick={() => claimName(nameInputRef.current)} disabled={isLoading} className="w-full rounded-2xl h-12 font-bold uppercase bg-blue-600">Tham gia</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="rounded-[2.5rem] bg-slate-900 border-white/10">
          <DialogHeader><DialogTitle>🤔 Là bạn?</DialogTitle><DialogDescription>Tên &ldquo;{claimCandidate?.name}&rdquo; đã có.</DialogDescription></DialogHeader>
          <DialogFooter className="flex gap-3"><Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => { setClaimModalOpen(false); setNameModalOpen(true) }}>Không</Button><Button className="flex-1 rounded-2xl h-12 font-bold bg-blue-600" onClick={confirmClaim}>Đúng!</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(v => ({ ...v, isOpen: false }))} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} description={confirmConfig.description} variant={confirmConfig.variant} isLoading={isLoading} />
      <ActionSheet isOpen={showActionSheet} onClose={() => setShowActionSheet(false)} title={selectedBatchId ? "Quét QR đơn" : "Quét QR Host"} options={[{ label: "Chụp ảnh", icon: <Camera className="w-5 h-5 text-sky-400" />, onClick: () => cameraInputRef.current?.click() }, { label: "Thư viện", icon: <ImageIcon className="w-5 h-5 text-emerald-400" />, onClick: () => fileInputRef.current?.click() }]} />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleScanQR(e.target.files[0])} />
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleScanQR(e.target.files[0])} />
    </div>
  )
}
