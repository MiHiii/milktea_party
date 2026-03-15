'use client'

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle, Share2, ExternalLink, Loader2, ShoppingBag, Users, QrCode, Receipt,
  Lock, Crown, ChevronDown, ArrowLeft, Settings, Eye, EyeOff, Check, Copy, Camera, Image as ImageIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateDeviceId, getParticipantId, setParticipantId, isHost } from '@/lib/identity'
import { calculateBill, formatVND, calcSubtotal } from '@/lib/calc'
import { BANK_OPTIONS, parseVietQR } from '@/lib/vietqr'
import { Session, Participant, OrderItem as OrderItemType, BillEntry, OrderBatch } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import jsQR from 'jsqr'

// Import Sub-components
import { OrderItem } from '@/components/session/OrderItem'
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
  order_batch_id: z.string().uuid().nullable().optional(),
  pay_separate: z.boolean().default(true),
})

const discountSchema = z.object({
  discountType: z.enum(['amount', 'percent']),
  discountValue: z.coerce.number().min(0),
  shippingFee: z.coerce.number().min(0),
})

const PERCENT_OPTIONS = ['0%', '30%', '50%', '70%', '100%']

export default function SessionClient({ initialSession, initialParticipants, initialItems, initialBatches = [] }: Props) {
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<Session>(initialSession)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [orderItems, setOrderItems] = useState<OrderItemType[]>(initialItems)
  const [orderBatches, setOrderBatches] = useState<OrderBatch[]>(initialBatches)
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null)
  const [iAmHost, setIAmHost] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null)
  const [showBill, setShowBill] = useState(false)
  const [showQrs, setShowQrs] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showAllMyItems, setShowAllMyItems] = useState(false)
  const [editDraft, setEditDraft] = useState({ itemName: '', price: '', quantity: '', note: '', ice: '50%', sugar: '50%', order_batch_id: null as string | null, pay_separate: false })
  const [justAdded, setJustAdded] = useState(false)
  const [hostControlsOpen, setHostControlsOpen] = useState(false)
  const [finalTotal, setFinalTotal] = useState('')
  const [batchFinalTotals, setBatchFinalTotals] = useState<Record<string, string>>({})
  const [batchNameDraft, setBatchNameDraft] = useState('')
  const [showNewBatch, setShowNewBatch] = useState(false)
  const [newBatchDraft, setNewBatchDraft] = useState('')
  const [bankNameInput, setBankNameInput] = useState(initialSession.host_default_bank_name || '')
  const [bankAccountInput, setBankAccountInput] = useState(initialSession.host_default_bank_account || '')
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
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showBillSummary, setShowBillSummary] = useState(false)
  const [personalDiscounts, setPersonalDiscounts] = useState<Record<string, { type: 'amount' | 'percent', value: number }>>({})
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, description: ReactNode, onConfirm: () => void, variant?: 'primary' | 'destructive' }>({ isOpen: false, title: '', description: '', onConfirm: () => {} })
  
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [isProcessingQR, setIsProcessingQR] = useState(false)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef('')

  const showWarning = (title: string, description: string) => {
    setConfirmConfig({ isOpen: true, title, description, variant: 'primary', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) })
  }

  useEffect(() => { return () => { if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl) } }, [qrPreviewUrl])

  const isHostUser = mounted ? session.host_device_id === getOrCreateDeviceId() : false
  const canEdit = session.status === 'open'
  const isLocked = session.status === 'locked'
  const hasBankInfo = !!session.host_default_bank_account

  useEffect(() => {
    setMounted(true)
    if (initialSession.has_password) {
      const isHost = initialSession.host_device_id === getOrCreateDeviceId()
      const isVerified = sessionStorage.getItem(`session_verified_${initialSession.id}`) === 'true'
      if (!isHost && !isVerified) setPasswordVerified(false)
    }
  }, [initialSession.id, initialSession.has_password, initialSession.host_device_id])

  useEffect(() => {
    if (session.batch_configs && typeof session.batch_configs === 'object') {
      const cfg = session.batch_configs as any
      if (cfg.personalDiscounts) setPersonalDiscounts(cfg.personalDiscounts)
    }
  }, [session.id, session.batch_configs])

  const processQRData = useCallback((data: string, batchId: string | null = null) => {
    const { bankCode, accountNumber } = parseVietQR(data)
    if (batchId) {
      const b = orderBatches.find(bt => bt.id === batchId)
      onUpdateBatchBank(batchId, bankCode || b?.bank_name || '', accountNumber || b?.bank_account || '', data)
    } else {
      if (bankCode) setBankNameInput(bankCode)
      if (accountNumber) setBankAccountInput(accountNumber)
    }
    return !!(bankCode || accountNumber)
  }, [orderBatches])

  const handleScanQR = useCallback((file: File) => {
    if (!file) return
    const objectUrl = URL.createObjectURL(file); setQrPreviewUrl(objectUrl); setIsProcessingQR(true)
    const reader = new FileReader(); reader.onload = (event) => {
      const img = new Image(); img.onload = () => {
        const analyze = (w: number, h: number, crop = false) => {
          const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return null
          if (crop) { const s = Math.min(img.width, img.height) * 0.8; ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, w, h) }
          else ctx.drawImage(img, 0, 0, w, h)
          return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)
        }
        let w = img.width; let h = img.height; const MAX = 800
        if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w *= r; h *= r }
        let code = analyze(Math.floor(w), Math.floor(h))
        if (!code) code = analyze(Math.floor(img.width * (450 / img.width)), Math.floor(img.height * (450 / img.height)))
        if (!code) code = analyze(600, 600, true)
        if (code) { if (!processQRData(code.data, selectedBatchId)) alert('Không tìm thấy STK hợp lệ.') }
        else alert('Không nhận diện được mã QR.')
        setIsProcessingQR(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [processQRData, selectedBatchId])

  const addItemForm = useForm({ resolver: zodResolver(addItemSchema) as any, defaultValues: { quantity: 1, itemName: '', price: '' as any, sugar: '50%', ice: '50%', order_batch_id: null, pay_separate: true } })
  const discountForm = useForm({ resolver: zodResolver(discountSchema) as any, defaultValues: { discountType: session.discount_type, discountValue: session.discount_value, shippingFee: session.shipping_fee } })

  useEffect(() => { if (orderBatches.length > 0 && !addItemForm.getValues('order_batch_id')) addItemForm.setValue('order_batch_id', orderBatches[0].id) }, [orderBatches, addItemForm])

  const deleteItem = useCallback(async (itemId: string) => { setOrderItems(prev => prev.filter(i => i.id !== itemId)); try { await fetch(`/api/order-items/${itemId}`, { method: 'DELETE' }) } catch { } }, [])
  const startEdit = useCallback((item: OrderItemType) => { setEditingItemId(item.id); setEditDraft({ itemName: item.item_name, price: String(item.price), quantity: String(item.quantity), note: item.note || '', ice: item.ice || '50%', sugar: item.sugar || '50%', order_batch_id: item.order_batch_id, pay_separate: !!item.pay_separate }) }, [])
  const saveEdit = useCallback(async (itemId: string) => { if (Number(editDraft.price) % 100 !== 0) { showWarning('Số tiền không hợp lệ', 'Vui lòng nhập số tiền chia hết cho 100'); return } setIsLoading(true); try { await fetch(`/api/order-items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName: editDraft.itemName, price: Number(editDraft.price), quantity: Number(editDraft.quantity), note: editDraft.note || null, ice: editDraft.ice || null, sugar: editDraft.sugar || null, order_batch_id: session.is_split_batch ? editDraft.order_batch_id : (orderBatches?.[0]?.id || null), pay_separate: !!editDraft.pay_separate }) }); setEditingItemId(null) } finally { setIsLoading(false) } }, [editDraft, session.is_split_batch, orderBatches])
  const addItem = useCallback(async (data: any) => { if (Number(data.price) % 100 !== 0) { showWarning('Số tiền không hợp lệ', 'Vui lòng nhập số tiền chia hết cho 100'); return } if (!myParticipantId) return; setIsLoading(true); try { const res = await fetch('/api/order-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id, participantId: myParticipantId, itemName: data.itemName, price: Number(data.price), quantity: data.quantity, note: data.note || null, ice: data.ice || null, sugar: data.sugar || null, order_batch_id: session.is_split_batch ? data.order_batch_id : (orderBatches?.[0]?.id || null), pay_separate: !!data.pay_separate }) }); if (res.ok) { addItemForm.reset({ ...addItemForm.getValues(), itemName: '', price: '' as any, note: '' }); setJustAdded(true); setTimeout(() => setJustAdded(false), 2000) } } finally { setIsLoading(false) } }, [session.id, myParticipantId, session.is_split_batch, orderBatches, addItemForm])

  const copyToClipboard = useCallback((text: string) => { const el = document.createElement("textarea"); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el) }, [])
  const shareLink = useCallback(() => { const url = window.location.href; if (navigator.share) navigator.share({ title: session.title, url }); else { copyToClipboard(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } }, [session.title, copyToClipboard])
  const copySessionId = useCallback(() => { copyToClipboard(session.slug); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000) }, [session.slug, copyToClipboard])

  const lockOrder = useCallback(async () => { 
    if (!hasBankInfo) { alert('Vui lòng bổ sung thông tin bank.'); setHostControlsOpen(true); return }
    setConfirmConfig({ isOpen: true, title: 'Chốt đơn?', description: 'Mọi người sẽ không thể sửa món nữa.', variant: 'primary', onConfirm: async () => { setIsLoading(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'locked' }) }); setConfirmConfig(prev => ({ ...prev, isOpen: false })) } finally { setIsLoading(false) } } })
  }, [session.slug, hasBankInfo])

  const markSessionPaid = useCallback(async () => { setConfirmConfig({ isOpen: true, title: 'Hoàn thành đơn?', description: 'Đánh dấu tất cả là đã thanh toán.', variant: 'primary', onConfirm: async () => { setIsLoading(true); try { await Promise.all(participants.filter(p => !p.is_paid).map(p => fetch('/api/participants', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: p.id, isPaid: true }) }))); await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'paid' }) }); setConfirmConfig(prev => ({ ...prev, isOpen: false })) } finally { setIsLoading(false) } } }) }, [session.slug, participants])
  const reopenOrder = useCallback(async () => { setConfirmConfig({ isOpen: true, title: 'Mở lại đơn?', description: 'Cho phép mọi người sửa món.', variant: 'primary', onConfirm: async () => { setIsLoading(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'open' }) }); setConfirmConfig(prev => ({ ...prev, isOpen: false })) } finally { setIsLoading(false) } } }) }, [session.slug])

  const claimName = useCallback(async (name: string) => { if (!name.trim()) return; setIsLoading(true); try { const existing = participants.find(p => p.name.toLowerCase() === name.trim().toLowerCase()); if (existing) { setClaimCandidate(existing); setClaimModalOpen(true); setNameModalOpen(false); return } const res = await fetch('/api/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id, name: name.trim() }) }); const data = await res.json(); if (data.participant?.id) { setParticipantId(session.id, data.participant.id); setMyParticipantId(data.participant.id); setExpandedParticipant(data.participant.id); setNameModalOpen(false) } } finally { setIsLoading(false) } }, [session.id, participants])
  const confirmClaim = useCallback(() => { if (claimCandidate) { setParticipantId(session.id, claimCandidate.id); setMyParticipantId(claimCandidate.id); setExpandedParticipant(claimCandidate.id); setClaimModalOpen(false) } }, [session.id, claimCandidate])

  const onAddBatch = useCallback(async () => { if (!newBatchDraft) return; setIsLoading(true); try { await fetch(`/api/order-batches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), sessionId: session.id, name: newBatchDraft }) }); setNewBatchDraft(''); setShowNewBatch(false) } finally { setIsLoading(false) } }, [session.id, newBatchDraft])
  const onDeleteBatch = useCallback(async (batchId: string, name: string) => {
    // Tìm các đơn đang mượn thông tin từ đơn này
    const paymentSources = (session.batch_configs as any)?.paymentSources || {}
    const linkedBatches = orderBatches.filter(b => paymentSources[b.id] === batchId)
    const linkedNames = linkedBatches.map(b => `[${b.name}]`).join(', ')

    const defB = orderBatches.find(b => b.is_default)
    const defBName = defB ? `[${defB.name}] (đơn mặc định)` : 'đơn mặc định'

    setConfirmConfig({
      isOpen: true, 
      title: 'Xoá đợt đơn?', 
      description: (
        <div className="space-y-2 text-white/60">
          <p>Xoá "{name}" và toàn bộ món bên trong?</p>
          {linkedBatches.length > 0 && (
            <p className="text-[10px] text-amber-400 font-bold bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
              ⚠️ Lưu ý: {linkedNames} đang dùng chung QR của đơn này và sẽ bị chuyển về dùng STK của {defBName} sau khi xóa.
            </p>
          )}
        </div>
      ), 
      variant: 'destructive', 
      onConfirm: async () => { 
        setIsLoading(true); 
        try { 
          // 1. Cập nhật lại configs để redirect các đơn mượn về Đơn mặc định (Default Batch)
          if (linkedBatches.length > 0 && defB) {
            const newSources = { ...paymentSources }
            linkedBatches.forEach(b => { newSources[b.id] = defB.id })
            const newConfigs = { ...(session.batch_configs as any || {}), paymentSources: newSources }
            
            await fetch(`/api/sessions/${session.slug}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: newConfigs })
            })
          }

          // 2. Thực hiện xóa Batch
          await fetch(`/api/order-batches/${batchId}?hostDeviceId=${getOrCreateDeviceId()}`, { method: 'DELETE' }); 
          setConfirmConfig(prev => ({ ...prev, isOpen: false })) 
        } finally { setIsLoading(false) } 
      } 
    })
  }, [session.slug, session.batch_configs, orderBatches])

  const onUpdateBatchName = useCallback(async (batchId: string, newName: string) => { try { await fetch(`/api/order-batches/${batchId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), name: newName.trim() }) }) } catch (e) { } }, [])
  const onUpdateBatchBank = useCallback(async (batchId: string, n: string, a: string, q: string) => { try { await fetch(`/api/order-batches/${batchId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), bankName: n, bankAccount: a, qrPayload: q }) }) } catch (e) { } }, [])
  const onSaveGlobalBank = useCallback(async (name?: string, account?: string) => { 
    try { 
      const bName = name !== undefined ? name : bankNameInput;
      const bAcc = account !== undefined ? account : bankAccountInput;
      const res = await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), bankName: bName, bankAccount: bAcc }) });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
          setBankNameInput(data.session.host_default_bank_name || '');
          setBankAccountInput(data.session.host_default_bank_account || '');
        }
      }
    } catch (e) { } 
  }, [session.slug, bankNameInput, bankAccountInput])

  const onToggleSplitBatch = useCallback(async (isSplit: boolean) => {
    if (!isSplit) { 
      setConfirmConfig({ 
        isOpen: true, title: 'Tắt chia đơn?', description: 'Gộp mọi món về Đơn 1.', variant: 'destructive', 
        onConfirm: async () => { 
          setIsToggling(true); 
          try { 
            const res = await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), isSplitBatch: false }) }); 
            if (res.ok) {
              const data = await res.json();
              if (data.session) {
                setSession(data.session);
                setBankNameInput(data.session.host_default_bank_name || '');
                setBankAccountInput(data.session.host_default_bank_account || '');
              }
            }
            setConfirmConfig(prev => ({ ...prev, isOpen: false })) 
          } finally { setIsToggling(false) } 
        } 
      }); 
      return 
    }
    setIsToggling(true); 
    try { 
      const res = await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), isSplitBatch: true }) });
      if (res.ok) {
        const data = await res.json();
        if (data.session) setSession(data.session);
      }
    } finally { setIsToggling(false) }
  }, [session.slug])

  const onTogglePassword = useCallback(async (en: boolean) => { if (!en) { setIsLoading(true); try { const res = await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), password: null }) }); if (res.ok) { const data = await res.json(); if (data.session) setSession(data.session) } setShowPasswordEdit(false) } finally { setIsLoading(false) } } else { setShowPasswordEdit(true); setHostPasswordDraft('') } }, [session.slug])
  const onSavePassword = useCallback(async () => { if (!hostPasswordDraft) return; setIsLoading(true); try { const res = await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), password: hostPasswordDraft }) }); if (res.ok) { const data = await res.json(); if (data.session) setSession(data.session) } setShowPasswordEdit(false) } finally { setIsLoading(false) } }, [session.slug, hostPasswordDraft])

  const onSaveBatchTotal = useCallback(async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault(); 
    setIsLoading(true); try {
      if (session.is_split_batch) {
        const nC: Record<string, any> = { ...((session.batch_configs as Record<string, any>) || {}) }
        orderBatches.forEach(batch => { const val = batchFinalTotals[batch.id] || ''; if (val && Number(val) >= 0) { const bT = Number(val); const bIT = orderItems.filter(i => i.order_batch_id === batch.id).reduce((s, i) => s + i.price * i.quantity, 0); if (bT >= bIT) nC[batch.name] = { type: 'amount', value: 0, ship: bT - bIT }; else nC[batch.name] = { type: 'amount', value: bIT - bT, ship: 0 } } })
        const res = await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: nC }) });
        if (res.ok) { const data = await res.json(); if (data.session) setSession(data.session) }
        setHostControlsOpen(false)
      } else {
        const iGT = orderItems.reduce((s, i) => s + i.price * i.quantity, 0); const t = Number(finalTotal);
        if (t && t >= 0) { 
          const dV = t < iGT ? iGT - t : 0; 
          const sF = t > iGT ? t - iGT : 0; 
          const res = await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), discountType: 'amount', discountValue: dV, shippingFee: sF }) }); 
          if (res.ok) { const data = await res.json(); if (data.session) setSession(data.session) }
        } 
        setHostControlsOpen(false)
      }
    } finally { setIsLoading(false) }
  }, [session.slug, session.is_split_batch, session.batch_configs, orderBatches, batchFinalTotals, orderItems, finalTotal])

  const verifyPassword = useCallback(async () => { setCheckingPassword(true); try { const res = await fetch(`/api/sessions/${session.slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordInput }) }); if (res.ok) { sessionStorage.setItem(`session_verified_${session.id}`, 'true'); setPasswordVerified(true) } else { const j = await res.json(); setPasswordError(j.error || 'Sai mật khẩu') } } finally { setCheckingPassword(false) } }, [session.slug, passwordInput, session.id])

  useEffect(() => {
    const savedPid = getParticipantId(session.id); const amHost = isHost(session.host_device_id); setIAmHost(amHost)
    if (savedPid) { setMyParticipantId(savedPid); setExpandedParticipant(savedPid) } else if (amHost) { const hostP = participants.find(p => p.is_host); if (hostP) { setParticipantId(session.id, hostP.id); setMyParticipantId(hostP.id); setExpandedParticipant(hostP.id) } else setNameModalOpen(true) } else setNameModalOpen(true)
    const channel = supabase.channel(`session:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `session_id=eq.${session.id}` }, (p) => { if (p.eventType === 'INSERT') setOrderItems(prev => [...prev, p.new as OrderItemType]); else if (p.eventType === 'DELETE') setOrderItems(prev => prev.filter(i => i.id !== p.old.id)); else if (p.eventType === 'UPDATE') setOrderItems(prev => prev.map(i => i.id === (p.new as OrderItemType).id ? p.new as OrderItemType : i)) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` }, (p) => { if (p.eventType === 'INSERT') setParticipants(prev => [...prev, p.new as Participant]); else if (p.eventType === 'DELETE') setParticipants(prev => prev.filter(par => par.id !== p.old.id)); else if (p.eventType === 'UPDATE') setParticipants(prev => prev.map(par => par.id === (p.new as Participant).id ? p.new as Participant : par)) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches', filter: `session_id=eq.${session.id}` }, (p) => { if (p.eventType === 'INSERT') setOrderBatches(prev => [...prev, p.new as OrderBatch]); else if (p.eventType === 'DELETE') setOrderBatches(prev => prev.filter(b => b.id !== p.old.id)); else if (p.eventType === 'UPDATE') setOrderBatches(prev => prev.map(b => b.id === (p.new as OrderBatch).id ? p.new as OrderBatch : b)) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` }, (p) => { setSession(p.new as Session) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id, session.host_device_id, participants, supabase])

  const billEntries: BillEntry[] = calculateBill(session, participants, orderItems, orderBatches)
  const myItems = orderItems.filter(item => item.participant_id === myParticipantId)
  const myBill = billEntries.find(e => e.participant.id === myParticipantId)

  if (!passwordVerified) return ( <div className="min-h-dvh flex items-center justify-center px-4"> <Card className="w-full max-w-sm rounded-[2.5rem] bg-slate-900 border-white/10 p-6 shadow-2xl"> <CardHeader className="text-center pb-3"> <div className="mx-auto w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-2xl flex items-center justify-center mb-3"><Lock className="w-6 h-6 text-sky-400" /></div> <CardTitle className="text-lg">Đơn có mật khẩu</CardTitle> </CardHeader> <CardContent className="flex flex-col gap-3"> <div className="relative"> <input type={showPassword ? 'text' : 'password'} value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setPasswordError('') }} placeholder="Mật khẩu..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500/50 pr-10" /> <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button> </div> {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>} <Button onClick={verifyPassword} disabled={checkingPassword || !passwordInput} className="w-full rounded-2xl h-11 font-bold bg-blue-600 hover:bg-blue-500">Vào đơn</Button> </CardContent> </Card> </div> )

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
              {isHostUser && <Badge variant="host" className="bg-amber-500/20 text-amber-400 border-amber-500/20"><Crown className="w-3 h-3" />Host</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span><span className="live-dot inline-block w-2 h-2 bg-emerald-400 rounded-full" /></span>
            {isHostUser && <Button variant="outline" size="icon" onClick={() => setHostControlsOpen(true)} className="rounded-xl"><Settings className="w-4 h-4" /></Button>}
            <Button variant="outline" size="icon" onClick={shareLink} className="rounded-xl">{copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}</Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-3 flex flex-col gap-3">
        {session.status !== 'open' && myBill && !myBill.participant.is_paid && myBill.total > 0 && ( <div className="bg-gradient-to-r from-sky-600/30 to-indigo-600/30 border border-sky-500/30 rounded-[2.5rem] p-6 text-center shadow-2xl"> <p className="text-sm text-white/70 mb-1">Bạn cần thanh toán</p> <p className="text-4xl font-black text-white tabular-nums">{formatVND(myBill.total)}</p> </div> )}
        {canEdit && ( <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.02]"> <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-sky-400" />Gọi của bạn</CardTitle></CardHeader> <CardContent> <OrderForm session={session} orderBatches={orderBatches} form={addItemForm} onSubmit={addItem} onClear={() => addItemForm.reset()} isLoading={isLoading} justAdded={justAdded} PERCENT_OPTIONS={PERCENT_OPTIONS} /> </CardContent> </Card> )}
        <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.02]"> <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" />Đơn hàng ({participants.length} người)</CardTitle></CardHeader> <CardContent className="p-0"> <div className="divide-y divide-white/5"> {participants.map(p => (<ParticipantItem key={p.id} participant={p} items={orderItems.filter(i => i.participant_id === p.id)} session={session} orderBatches={orderBatches} myParticipantId={myParticipantId} iAmHost={isHostUser} isExpanded={expandedParticipant === p.id} onToggleExpand={() => setExpandedParticipant(expandedParticipant === p.id ? null : p.id)} editingItemId={editingItemId} editDraft={editDraft} setEditDraft={setEditDraft} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingItemId(null)} onDeleteItem={deleteItem} onCopyItem={(i) => { addItemForm.reset({ itemName: i.item_name, price: i.price, quantity: i.quantity, note: i.note || '', ice: i.ice || '50%', sugar: i.sugar || '50%', order_batch_id: i.order_batch_id, pay_separate: !!i.pay_separate }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} isLoading={isLoading} PERCENT_OPTIONS={PERCENT_OPTIONS} />))} </div> </CardContent> </Card>
        {billEntries.length > 0 && orderItems.length > 0 && ( <div className="flex flex-col gap-3"> <button onClick={() => setShowBillSummary(!showBillSummary)} className="w-full h-14 rounded-[1.5rem] bg-sky-500/10 border border-sky-500/20 text-sky-400 font-black uppercase text-xs flex items-center justify-center gap-2 transition-all"><Receipt className="w-4 h-4" />{showBillSummary ? 'Ẩn bảng tạm tính' : 'Xem bảng tạm tính'}<ChevronDown className={`w-4 h-4 transition-all ${showBillSummary ? 'rotate-180' : ''}`} /></button> {showBillSummary && <BillSummary entries={billEntries} session={session} batches={orderBatches} />} </div> )}
        <QrSection session={session} orderBatches={orderBatches} myParticipantId={myParticipantId} iAmHost={isHostUser} showQrs={showQrs} myBill={myBill} billEntries={billEntries} copyToClipboard={copyToClipboard} />
        {isHostUser && ( <div className="flex flex-col gap-3 mt-4"> {session.status === 'open' ? (<Button variant="warning" size="lg" onClick={lockOrder} disabled={isLoading} className="w-full text-lg font-bold py-7 rounded-[2rem] uppercase tracking-widest"><Lock className="w-5 h-5 mr-2" /> Chốt đơn</Button>) : session.status === 'locked' ? (<div className="flex gap-3"><Button variant="outline" size="lg" onClick={() => setShowQrs(!showQrs)} className="flex-1 py-7 rounded-[2rem] font-bold uppercase">QR</Button><Button variant="success" size="lg" onClick={markSessionPaid} disabled={isLoading} className="flex-1 py-7 rounded-[2rem] font-bold uppercase">Hoàn thành</Button></div>) : (<div className="text-center py-6 bg-emerald-500/10 rounded-[2rem] font-black text-emerald-400 uppercase">✅ Hoàn thành!</div>)} {session.status !== 'open' && (<button onClick={reopenOrder} className="mt-2 text-[10px] text-white/20 hover:text-sky-400 uppercase font-black text-center w-full">Mở lại đơn?</button>)} </div> )}
      </div>

      <HostSettings 
        session={session} orderBatches={orderBatches} orderItems={orderItems} isLoading={isLoading} isToggling={isToggling} isProcessingQR={isProcessingQR} qrPreviewUrl={qrPreviewUrl} 
        open={hostControlsOpen} onOpenChange={setHostControlsOpen} finalTotal={finalTotal} setFinalTotal={setFinalTotal} batchFinalTotals={batchFinalTotals} setBatchFinalTotals={setBatchFinalTotals} 
        batchNameDraft={batchNameDraft} setBatchNameDraft={setBatchNameDraft} showNewBatch={showNewBatch} setShowNewBatch={setShowNewBatch} newBatchDraft={newBatchDraft} setNewBatchDraft={setNewBatchDraft} 
        bankNameInput={bankNameInput} setBankNameInput={setBankNameInput} bankAccountInput={bankAccountInput} setBankAccountInput={setBankAccountInput} 
        showPasswordEdit={showPasswordEdit} hostPasswordDraft={hostPasswordDraft} setHostPasswordDraft={setHostPasswordDraft} 
        onSaveBatchTotal={onSaveBatchTotal} onAddBatch={onAddBatch} onDeleteBatch={onDeleteBatch} onUpdateBatchName={onUpdateBatchName} onUpdateBatchBank={onUpdateBatchBank} 
        onToggleSplitBatch={onToggleSplitBatch} onTogglePassword={onTogglePassword} onSavePassword={onSavePassword} onSaveGlobalBank={onSaveGlobalBank} 
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
