'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  paySeparate: z.boolean().default(true),
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
  const [editDraft, setEditDraft] = useState({ itemName: '', price: '', quantity: '', note: '', ice: '50%', sugar: '50%', orderBatchId: null as string | null, paySeparate: false })
  const [justAdded, setJustAdded] = useState(false)
  const [hostControlsOpen, setHostControlsOpen] = useState(false)
  const [hostTab, setHostTab] = useState<'total' | 'detail'>('total')
  const [finalTotal, setFinalTotal] = useState('')
  const [batchFinalTotals, setBatchFinalTotals] = useState<Record<string, string>>({})
  const [editingBatchName, setEditingBatchName] = useState<string | null>(null)
  const [batchNameDraft, setBatchNameDraft] = useState('')
  const [showNewBatch, setShowNewBatch] = useState(false)
  const [newBatchDraft, setNewBatchDraft] = useState('')
  const [paymentMode, setPaymentMode] = useState<'global' | 'per_session'>('per_session')
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
  const [expandedPayment, setExpandedPayment] = useState(false)
  const [personalDiscounts, setPersonalDiscounts] = useState<Record<string, { type: 'amount' | 'percent', value: number }>>({})
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, description: string, onConfirm: () => void, variant?: 'primary' | 'destructive' }>({ isOpen: false, title: '', description: '', onConfirm: () => {} })
  
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [isProcessingQR, setIsProcessingQR] = useState(false)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef('')

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl)
    }
  }, [qrPreviewUrl])

  // Guardrails - safe for SSR
  const isHostUser = mounted ? session.host_device_id === getOrCreateDeviceId() : false
  const canEdit = session.status === 'open'
  const isLocked = session.status === 'locked'
  const hasBankInfo = !!session.host_default_bank_account
  const isUsingCommonQR = session.use_default_qr_for_all

  useEffect(() => {
    setMounted(true)
    if (bankNameInput && bankAccountInput) setExpandedPayment(true)
    
    if (initialSession.has_password) {
      const isHost = initialSession.host_device_id === getOrCreateDeviceId()
      const isVerified = sessionStorage.getItem(`session_verified_${initialSession.id}`) === 'true'
      if (!isHost && !isVerified) setPasswordVerified(false)
    }
  }, [])

  // Initialize personal discounts
  useEffect(() => {
    if (session.batch_configs && typeof session.batch_configs === 'object') {
      const cfg = session.batch_configs as any
      if (cfg.personalDiscounts) {
        setPersonalDiscounts(cfg.personalDiscounts)
      }
    }
  }, [session.id])

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
    const objectUrl = URL.createObjectURL(file)
    setQrPreviewUrl(objectUrl)
    setIsProcessingQR(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const analyze = (w: number, h: number, crop = false) => {
          const canvas = document.createElement('canvas')
          canvas.width = w; canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return null
          if (crop) {
            const sourceSize = Math.min(img.width, img.height) * 0.8
            const sx = (img.width - sourceSize) / 2
            const sy = (img.height - sourceSize) / 2
            ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, w, h)
          } else {
            ctx.drawImage(img, 0, 0, w, h)
          }
          return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)
        }
        let w = img.width; let h = img.height; const MAX_DIM = 800
        if (w > MAX_DIM || h > MAX_DIM) { const r = Math.min(MAX_DIM / w, MAX_DIM / h); w *= r; h *= r }
        let code = analyze(Math.floor(w), Math.floor(h))
        if (!code) { const r2 = Math.min(450 / img.width, 450 / img.height); code = analyze(Math.floor(img.width * r2), Math.floor(img.height * r2)) }
        if (!code) code = analyze(600, 600, true)
        if (code) { const success = processQRData(code.data, selectedBatchId); if (!success) alert('Nhận diện được mã nhưng không tìm thấy số tài khoản hợp lệ.') }
        else { alert('Không nhận diện được mã QR. Bạn hãy thử chụp lại rõ hơn nhé!') }
        setIsProcessingQR(false)
      }
      img.onerror = () => setIsProcessingQR(false)
      img.src = event.target?.result as string
    }
    reader.onerror = () => setIsProcessingQR(false)
    reader.readAsDataURL(file)
  }, [processQRData, selectedBatchId])

  const onUpdatePersonalDiscount = useCallback((pId: string, type: 'amount' | 'percent', value: number) => {
    setPersonalDiscounts(prev => ({ ...prev, [pId]: { type, value } }))
  }, [])

  const addItemForm = useForm({ resolver: zodResolver(addItemSchema) as any, defaultValues: { quantity: 1, itemName: '', price: '' as any, sugar: '50%', ice: '50%', order_batch_id: null, paySeparate: true } })
  const discountForm = useForm({ resolver: zodResolver(discountSchema) as any, defaultValues: { discountType: session.discount_type, discountValue: session.discount_value, shippingFee: session.shipping_fee } })

  useEffect(() => {
    if (orderBatches.length > 0 && !addItemForm.getValues('order_batch_id')) {
      addItemForm.setValue('order_batch_id', orderBatches[0].id)
    }
  }, [orderBatches, addItemForm])

  const clearForm = useCallback(() => { addItemForm.reset({ quantity: 1, itemName: '', price: '' as any, note: '', ice: '50%', sugar: '50%', order_batch_id: orderBatches[0]?.id || null, paySeparate: true }) }, [addItemForm, orderBatches])
  
  const copyItemToForm = useCallback((item: OrderItemType) => { 
    addItemForm.reset({ itemName: item.item_name, price: item.price, quantity: item.quantity, note: item.note || '', ice: item.ice || '50%', sugar: item.sugar || '50%', order_batch_id: item.order_batch_id, paySeparate: !!item.pay_separate })
    window.scrollTo({ top: 0, behavior: 'smooth' }) 
  }, [addItemForm])

  const deleteItem = useCallback(async (itemId: string) => { 
    setOrderItems(prev => prev.filter(i => i.id !== itemId))
    try { await fetch(`/api/order-items/${itemId}`, { method: 'DELETE' }) } catch { } 
  }, [])

  const startEdit = useCallback((item: OrderItemType) => { 
    setEditingItemId(item.id)
    setEditDraft({ itemName: item.item_name, price: String(item.price), quantity: String(item.quantity), note: item.note || '', ice: item.ice || '50%', sugar: item.sugar || '50%', orderBatchId: item.order_batch_id, paySeparate: !!item.pay_separate }) 
  }, [])

  const saveEdit = useCallback(async (itemId: string) => { 
    setIsLoading(true)
    try { 
      await fetch(`/api/order-items/${itemId}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          itemName: editDraft.itemName, 
          price: Number(editDraft.price), 
          quantity: Number(editDraft.quantity), 
          note: editDraft.note || null, 
          ice: editDraft.ice || null, 
          sugar: editDraft.sugar || null, 
          order_batch_id: session.is_split_batch ? editDraft.orderBatchId : (orderBatches?.[0]?.id || null), 
          pay_separate: !!editDraft.paySeparate 
        }) 
      })
      setEditingItemId(null) 
    } catch (e) { console.error(e) } finally { setIsLoading(false) } 
  }, [editDraft, session.is_split_batch, orderBatches])

  const addItem = useCallback(async (data: any) => {
    if (!myParticipantId) return; setIsLoading(true);
    try {
      const res = await fetch('/api/order-items', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          sessionId: session.id, 
          participantId: myParticipantId, 
          itemName: data.itemName, 
          price: Number(data.price), 
          quantity: data.quantity, 
          note: data.note || null, 
          ice: data.ice || null, 
          sugar: data.sugar || null, 
          orderBatchId: session.is_split_batch ? data.order_batch_id : (orderBatches?.[0]?.id || null), 
          paySeparate: !!data.paySeparate 
        }) 
      });
      if (res.ok) { clearForm(); setJustAdded(true); setTimeout(() => setJustAdded(false), 2000) }
    } finally { setIsLoading(false) }
  }, [session.id, myParticipantId, session.is_split_batch, orderBatches, clearForm])

  const copyToClipboard = useCallback((text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
        document.body.removeChild(textArea);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
      document.body.removeChild(textArea);
    }
  }, [])

  const shareLink = useCallback(() => { 
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) navigator.share({ title: session.title, url })
    else { copyToClipboard(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } 
  }, [session.title, copyToClipboard])

  const copySessionId = useCallback(() => { 
    copyToClipboard(session.slug); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000) 
  }, [session.slug, copyToClipboard])

  const lockOrder = useCallback(async () => { 
    if (!hasBankInfo) { alert('Vui lòng bổ sung thông tin tài khoản ngân hàng trước khi chốt đơn.'); setExpandedPayment(true); setHostControlsOpen(true); return }
    if (session.is_split_batch && !session.use_default_qr_for_all) {
      const activeBatchIds = new Set(orderItems.map(i => i.order_batch_id).filter(Boolean))
      const incompleteBatches = orderBatches.filter(b => activeBatchIds.has(b.id) && !b.bank_account)
      if (incompleteBatches.length > 0) { alert(`Đơn "${incompleteBatches[0].name}" chưa có thông tin ngân hàng. Vui lòng bổ sung trong Cài đặt Host > Chi tiết.`); setHostTab('detail'); setHostControlsOpen(true); return }
    }
    setConfirmConfig({
      isOpen: true, title: 'Chốt đơn?', description: 'Mọi người sẽ không thể thêm hoặc sửa món nữa sau khi chốt đơn.', variant: 'primary',
      onConfirm: async () => { setIsLoading(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'locked' }) }); setShowBillSummary(true); setConfirmConfig(prev => ({ ...prev, isOpen: false })) } finally { setIsLoading(false) } }
    })
  }, [session.slug, hasBankInfo, session.is_split_batch, session.use_default_qr_for_all, orderBatches, orderItems])

  const markSessionPaid = useCallback(async () => { 
    setConfirmConfig({
      isOpen: true, title: 'Hoàn thành đơn?', description: 'Đánh dấu toàn bộ đơn là đã thanh toán và kết thúc phiên đặt món này.', variant: 'primary',
      onConfirm: async () => { setIsLoading(true); try { await Promise.all(participants.filter(p => !p.is_paid).map(p => fetch('/api/participants', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: p.id, isPaid: true }) }))); await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'paid' }) }); setConfirmConfig(prev => ({ ...prev, isOpen: false })) } finally { setIsLoading(false) } }
    })
  }, [session.slug, participants])

  const reopenOrder = useCallback(async () => { 
    setConfirmConfig({
      isOpen: true, title: 'Mở lại đơn?', description: 'Mọi người sẽ có thể tiếp tục thêm, sửa và xoá món ăn.', variant: 'primary',
      onConfirm: async () => { setIsLoading(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'open' }) }); setShowBill(false); setShowQrs(false); setConfirmConfig(prev => ({ ...prev, isOpen: false })) } finally { setIsLoading(false) } }
    })
  }, [session.slug])

  const saveBankAndLock = useCallback(async () => { 
    if (!bankNameInput || !bankAccountInput) return; 
    setIsLoading(true); 
    try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), bankName: bankNameInput, bankAccount: bankAccountInput }) }); setBankModalOpen(false); lockOrder() } finally { setIsLoading(false) } 
  }, [session.slug, bankNameInput, bankAccountInput, lockOrder])

  const claimName = useCallback(async (name: string) => {
    if (!name.trim()) return; setIsLoading(true);
    try {
      const existing = participants.find(p => p.name.toLowerCase() === name.trim().toLowerCase())
      if (existing) { setClaimCandidate(existing); setClaimModalOpen(true); setNameModalOpen(false); return }
      const res = await fetch('/api/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id, name: name.trim() }) })
      const p = await res.json(); setParticipantId(session.id, p.id); setMyParticipantId(p.id); setExpandedParticipant(p.id); setNameModalOpen(false)
    } finally { setIsLoading(false) }
  }, [session.id, participants])

  const confirmClaim = useCallback(() => { if (claimCandidate) { setParticipantId(session.id, claimCandidate.id); setMyParticipantId(claimCandidate.id); setExpandedParticipant(claimCandidate.id); setClaimModalOpen(false) } }, [session.id, claimCandidate])

  const updateDiscountShip = useCallback(async (data: any) => { 
    setIsLoading(true); try { 
      const nC: Record<string, any> = { ...((session.batch_configs as Record<string, any>) || {}), personalDiscounts }
      await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), discountType: data.discountType, discountValue: data.discountValue, shippingFee: data.shippingFee, batchConfigs: nC }) }); setHostControlsOpen(false) 
    } finally { setIsLoading(false) } 
  }, [session.slug, personalDiscounts, session.batch_configs])

  const onAddBatch = useCallback(async () => {
    if (!newBatchDraft) return; setIsLoading(true); try {
      const res = await fetch(`/api/order-batches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), sessionId: session.id, name: newBatchDraft }) });
      if (!res.ok) { const json = await res.json(); alert(json.error || 'Lỗi khi thêm đơn') } else { setNewBatchDraft(''); setShowNewBatch(false) }
    } finally { setIsLoading(false) }
  }, [session.id, newBatchDraft])

  const onDeleteBatch = useCallback(async (batchId: string, name: string) => {
    setConfirmConfig({
      isOpen: true, title: 'Xoá đợt đơn?', description: `Bạn có chắc muốn xoá "${name}"? Tất cả món ăn trong đơn này cũng sẽ bị xoá vĩnh viễn.`, variant: 'destructive',
      onConfirm: async () => { setIsLoading(true); try {
          const res = await fetch(`/api/order-batches/${batchId}?hostDeviceId=${getOrCreateDeviceId()}`, { method: 'DELETE' });
          if (res.ok) { setOrderBatches(prev => prev.filter(b => b.id !== batchId)); setOrderItems(prev => prev.filter(i => i.order_batch_id !== batchId)); setConfirmConfig(prev => ({ ...prev, isOpen: false })) }
        } finally { setIsLoading(false) } }
    })
  }, [])

  const onUpdateBatchName = useCallback(async (batchId: string, newName: string) => { try { await fetch(`/api/order-batches/${batchId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), name: newName.trim() || 'Đơn' }) }); } finally { setIsLoading(false) } }, [])

  const onUpdateBatchBank = useCallback(async (batchId: string, name: string, account: string, qrPayload: string) => {
    setIsLoading(true); try { await fetch(`/api/order-batches/${batchId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), bankName: name, bankAccount: account, qrPayload }) }); } finally { setIsLoading(false) }
  }, [])

  const onToggleSplitBatch = useCallback(async (isSplit: boolean) => {
    if (!isSplit) {
      setConfirmConfig({
        isOpen: true, title: 'Tắt chia đơn?', description: 'Tất cả các món ăn sẽ được gộp chung về một đơn duy nhất. Các đợt đơn phụ sẽ bị xoá.', variant: 'destructive',
        onConfirm: async () => { setIsToggling(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), isSplitBatch: false }) }); setConfirmConfig(prev => ({ ...prev, isOpen: false })) } finally { setIsToggling(false) } }
      }); return
    }
    setIsToggling(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), isSplitBatch: isSplit }) }); } catch (e) { console.error(e) } finally { setIsToggling(false) }
  }, [session.slug])

  const onToggleDefaultQr = useCallback(async (useDefault: boolean) => { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), useDefaultQrForAll: useDefault }) }); }, [session.slug])

  const onTogglePassword = useCallback(async (enabled: boolean) => {
    if (!enabled) { setIsLoading(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), password: null }) }); setShowPasswordEdit(false) } finally { setIsLoading(false) } } 
    else { setShowPasswordEdit(true); setHostPasswordDraft('') }
  }, [session.slug])

  const onSavePassword = useCallback(async () => { if (!hostPasswordDraft) return; setIsLoading(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), password: hostPasswordDraft }) }); setShowPasswordEdit(false) } finally { setIsLoading(false) } }, [session.slug, hostPasswordDraft])

  const onSaveGlobalBank = useCallback(async () => { setIsLoading(true); try { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), bankName: bankNameInput, bankAccount: bankAccountInput }) }); } finally { setIsLoading(false) } }, [session.slug, bankNameInput, bankAccountInput])

  const onSaveBatchTotal = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); try {
      if (session.is_split_batch) {
        const nC: Record<string, any> = { ...((session.batch_configs as Record<string, any>) || {}) }
        orderBatches.forEach(batch => { const val = batchFinalTotals[batch.id] || ''; if (val && Number(val) >= 0) { const bT = Number(val); const bIT = orderItems.filter(i => i.order_batch_id === batch.id).reduce((s, i) => s + i.price * i.quantity, 0); if (bT >= bIT) nC[batch.name] = { type: 'amount', value: 0, ship: bT - bIT }; else nC[batch.name] = { type: 'amount', value: bIT - bT, ship: 0 } } })
        await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: nC }) }); setHostControlsOpen(false)
      } else {
        const iGT = orderItems.reduce((s, i) => s + i.price * i.quantity, 0); const t = Number(finalTotal); const nC: Record<string, any> = { ...((session.batch_configs as Record<string, any>) || {}), personalDiscounts }
        if (t && t >= 0) { const dV = t < iGT ? iGT - t : 0; const sF = t > iGT ? t - iGT : 0; await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), discountType: 'amount', discountValue: dV, shippingFee: sF, batchConfigs: nC }) }); } 
        else { await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: nC }) }); }
        setHostControlsOpen(false)
      }
    } finally { setIsLoading(false) }
  }, [session.slug, session.is_split_batch, session.batch_configs, orderBatches, batchFinalTotals, orderItems, finalTotal, personalDiscounts])

  const verifyPassword = useCallback(async () => { setCheckingPassword(true); setPasswordError(''); try { const res = await fetch(`/api/sessions/${session.slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordInput }) }); if (res.ok) { sessionStorage.setItem(`session_verified_${session.id}`, 'true'); setPasswordVerified(true) } else { const json = await res.json(); setPasswordError(json.error || 'Sai mật khẩu') } } finally { setCheckingPassword(false) } }, [session.slug, passwordInput, session.id])

  useEffect(() => {
    const savedPid = getParticipantId(session.id); const amHost = isHost(session.host_device_id); setIAmHost(amHost)
    if (savedPid) { setMyParticipantId(savedPid); setExpandedParticipant(savedPid) } else if (amHost) { const hostP = participants.find(p => p.is_host); if (hostP) { setParticipantId(session.id, hostP.id); setMyParticipantId(hostP.id); setExpandedParticipant(hostP.id) } else setNameModalOpen(true) } else setNameModalOpen(true)
    const channel = supabase.channel(`session:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `session_id=eq.${session.id}` }, (p) => { if (p.eventType === 'INSERT') setOrderItems(prev => [...prev, p.new as OrderItemType]); else if (p.eventType === 'DELETE') setOrderItems(prev => prev.filter(i => i.id !== p.old.id)); else if (p.eventType === 'UPDATE') setOrderItems(prev => prev.map(i => i.id === (p.new as OrderItemType).id ? p.new as OrderItemType : i)) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` }, (p) => { if (p.eventType === 'INSERT') setParticipants(prev => [...prev, p.new as Participant]); else if (p.eventType === 'DELETE') setParticipants(prev => prev.filter(par => par.id !== p.old.id)); else if (p.eventType === 'UPDATE') setParticipants(prev => prev.map(par => par.id === (p.new as Participant).id ? p.new as Participant : par)) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches', filter: `session_id=eq.${session.id}` }, (p) => { if (p.eventType === 'INSERT') setOrderBatches(prev => [...prev, p.new as OrderBatch]); else if (p.eventType === 'DELETE') setOrderBatches(prev => prev.filter(b => b.id !== p.old.id)); else if (p.eventType === 'UPDATE') setOrderBatches(prev => prev.map(b => b.id === (p.new as OrderBatch).id ? p.new as OrderBatch : b)) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` }, (p) => { setSession(p.new as Session); discountForm.reset({ discountType: (p.new as Session).discount_type, discountValue: (p.new as Session).discount_value, shippingFee: (p.new as Session).shipping_fee }) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id, session.host_device_id, participants, supabase, discountForm])

  const billEntries: BillEntry[] = calculateBill(session, participants, orderItems, orderBatches)
  const myItems = orderItems.filter(item => item.participant_id === myParticipantId)
  const myBill = billEntries.find(e => e.participant.id === myParticipantId)

  if (!passwordVerified) { return ( <div className="min-h-dvh flex items-center justify-center px-4"> <Card className="w-full max-w-sm rounded-[2.5rem] bg-slate-900 border-white/10 p-6 shadow-2xl"> <CardHeader className="text-center pb-3"> <div className="mx-auto w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-2xl flex items-center justify-center mb-3"><Lock className="w-6 h-6 text-sky-400" /></div> <CardTitle className="text-lg">Đơn có mật khẩu</CardTitle> </CardHeader> <CardContent className="flex flex-col gap-3"> <div className="relative"> <input type={showPassword ? 'text' : 'password'} value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setPasswordError('') }} placeholder="Mật khẩu..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500/50 pr-10" /> <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button> </div> {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>} <Button onClick={verifyPassword} disabled={checkingPassword || !passwordInput} className="w-full rounded-2xl h-11 font-bold bg-blue-600 hover:bg-blue-500">Vào đơn</Button> </CardContent> </Card> </div> ) }

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
            {session.shop_link && (<a href={session.shop_link} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-0.5"><ExternalLink className="w-3 h-3" /> Xem menu</a>)}
          </div>
          <div className="flex items-center gap-2">
            <span><span className="live-dot inline-block w-2 h-2 bg-emerald-400 rounded-full" /></span>
            {isHostUser && <Button variant="outline" size="icon" onClick={() => setHostControlsOpen(true)} className="rounded-xl"><Settings className="w-4 h-4" /></Button>}
            <Button variant="outline" size="icon" onClick={shareLink} className="rounded-xl">{copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}</Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-3 flex flex-col gap-3">
        {session.status !== 'open' && myBill && !myBill.participant.is_paid && myBill.total > 0 && ( <div className="bg-gradient-to-r from-sky-600/30 to-indigo-600/30 border border-sky-500/30 rounded-[2.5rem] p-6 text-center slide-up shadow-2xl"> <p className="text-sm text-white/70 mb-1">Bạn cần thanh toán</p> <p className="text-4xl font-black text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{formatVND(myBill.total)}</p> <p className="text-xs text-white/40 mt-3 font-medium uppercase tracking-widest">Cuộn xuống để xem mã QR</p> </div> )}

        {canEdit && ( <Card className="rounded-[2.5rem] overflow-hidden border-white/5 bg-white/[0.02]"> <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-sky-400" />Gọi của bạn</CardTitle></CardHeader> <CardContent> <OrderForm session={session} orderBatches={orderBatches} form={addItemForm} onSubmit={addItem} onClear={clearForm} isLoading={isLoading} justAdded={justAdded} PERCENT_OPTIONS={PERCENT_OPTIONS} /> {myItems.length > 0 && ( <div className="mt-4 flex flex-col gap-2"> <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] ml-1 mb-1">Món đã gọi ({myItems.length})</p> <div className="flex flex-col gap-2.5"> {(showAllMyItems ? myItems : myItems.slice(0, 3)).map((item) => ( <div key={item.id} className="slide-up"> <OrderItem item={item} session={session} orderBatches={orderBatches} myParticipantId={myParticipantId} iAmHost={isHostUser} isEditing={editingItemId === item.id} editDraft={editDraft} setEditDraft={setEditDraft} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingItemId(null)} onDeleteItem={deleteItem} onCopyItem={copyItemToForm} isLoading={isLoading} PERCENT_OPTIONS={PERCENT_OPTIONS} /> </div> ))} {myItems.length > 3 && (<button onClick={() => setShowAllMyItems(!showAllMyItems)} className="w-full py-2.5 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-all flex items-center justify-center gap-2"><ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showAllMyItems ? 'rotate-180' : ''}`} />{showAllMyItems ? 'Thu gọn' : `Xem thêm (+${myItems.length - 3} món)`}</button>)} </div> {myBill && (<div className="flex justify-between items-center mt-2 px-5 py-4 bg-black/40 rounded-[1.5rem] border-t-2 border-sky-500/30 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"><span className="text-xs font-black uppercase tracking-widest text-sky-400/60">Tổng tiền của bạn</span><span className="font-black text-sky-400 text-2xl tabular-nums drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]">{formatVND(myBill.total)}</span></div>)} </div> )} </CardContent> </Card> )}

        <Card className="rounded-[2.5rem] overflow-hidden border-white/5 bg-white/[0.02]"> <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" />Đơn hàng ({participants.length} người)</CardTitle></CardHeader> <CardContent className="p-0"> <div className="divide-y divide-white/5"> {participants.map(p => (<ParticipantItem key={p.id} participant={p} items={orderItems.filter(i => i.participant_id === p.id)} session={session} orderBatches={orderBatches} myParticipantId={myParticipantId} iAmHost={isHostUser} isExpanded={expandedParticipant === p.id} onToggleExpand={() => setExpandedParticipant(expandedParticipant === p.id ? null : p.id)} editingItemId={editingItemId} editDraft={editDraft} setEditDraft={setEditDraft} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingItemId(null)} onDeleteItem={deleteItem} onCopyItem={copyItemToForm} isLoading={isLoading} PERCENT_OPTIONS={PERCENT_OPTIONS} />))} </div> </CardContent> </Card>

        {billEntries.length > 0 && orderItems.length > 0 && ( <div className="flex flex-col gap-3"> <button onClick={() => setShowBillSummary(!showBillSummary)} className="w-full h-14 rounded-[1.5rem] bg-sky-500/10 border border-sky-500/20 text-sky-400 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"><Receipt className="w-4 h-4" />{showBillSummary ? 'Ẩn bảng tạm tính' : 'Xem bảng tạm tính'}<ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showBillSummary ? 'rotate-180' : ''}`} /></button> <div className={`grid transition-all duration-500 ease-in-out ${showBillSummary ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}><div className="overflow-hidden min-h-0"><BillSummary entries={billEntries} session={session} batches={orderBatches} /></div></div> </div> )}

        <QrSection session={session} orderBatches={orderBatches} myParticipantId={myParticipantId} iAmHost={isHostUser} showQrs={showQrs} myBill={myBill} billEntries={billEntries} copyToClipboard={copyToClipboard} />

        {isHostUser && ( <div className="flex flex-col gap-3 mt-4"> {session.status === 'open' ? (<Button variant="warning" size="lg" onClick={lockOrder} disabled={isLoading} className="w-full text-lg font-bold shadow-lg py-7 rounded-[2rem] uppercase tracking-widest"><Lock className="w-5 h-5 mr-2" /> Chốt đơn</Button>) : session.status === 'locked' ? (<div className="flex gap-3"><Button variant="outline" size="lg" onClick={() => setShowQrs(!showQrs)} className="flex-1 py-7 rounded-[2rem] font-bold uppercase tracking-wider">{showQrs ? 'Ẩn QR' : 'Xem QR'}</Button><Button variant="success" size="lg" onClick={markSessionPaid} disabled={isLoading} className="flex-1 py-7 rounded-[2rem] font-bold uppercase tracking-wider">Kết thúc đơn</Button></div>) : (<div className="text-center py-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 font-black text-emerald-400 uppercase tracking-widest">✅ Đơn đã hoàn thành!</div>)} {session.status !== 'open' && (<button onClick={reopenOrder} disabled={isLoading} className="mt-2 text-[10px] text-white/20 hover:text-sky-400 transition-colors uppercase font-black tracking-[0.2em] text-center w-full">{isLoading ? 'Đang xử lý...' : 'Mở lại và sửa đơn?'}</button>)} </div> )}
      </div>

      <HostSettings 
        session={session} 
        participants={participants} 
        orderBatches={orderBatches} 
        orderItems={orderItems} 
        isLoading={isLoading} 
        isToggling={isToggling} 
        isProcessingQR={isProcessingQR} 
        qrPreviewUrl={qrPreviewUrl} 
        open={hostControlsOpen} 
        onOpenChange={setHostControlsOpen} 
        hostTab={hostTab} 
        setHostTab={setHostTab} 
        expandedPayment={expandedPayment} 
        setExpandedPayment={setExpandedPayment} 
        finalTotal={finalTotal} 
        setFinalTotal={setFinalTotal} 
        batchFinalTotals={batchFinalTotals} 
        setBatchFinalTotals={setBatchFinalTotals} 
        editingBatchName={editingBatchName} 
        setEditingBatchName={setEditingBatchName} 
        batchNameDraft={batchNameDraft} 
        setBatchNameDraft={setBatchNameDraft} 
        showNewBatch={showNewBatch} 
        setShowNewBatch={setShowNewBatch} 
        newBatchDraft={newBatchDraft} 
        setNewBatchDraft={setNewBatchDraft} 
        paymentMode={paymentMode} 
        setPaymentMode={setPaymentMode} 
        bankNameInput={bankNameInput} 
        setBankNameInput={setBankNameInput} 
        bankAccountInput={bankAccountInput} 
        setBankAccountInput={setBankAccountInput} 
        showPasswordEdit={showPasswordEdit} 
        setShowPasswordEdit={setShowPasswordEdit} 
        hostPasswordDraft={hostPasswordDraft} 
        setHostPasswordDraft={setHostPasswordDraft} 
        discountForm={discountForm} 
        personalDiscounts={personalDiscounts} 
        onUpdatePersonalDiscount={onUpdatePersonalDiscount} 
        onUpdateDiscountShip={updateDiscountShip} 
        onSaveBatchTotal={onSaveBatchTotal} 
        onAddBatch={onAddBatch} 
        onDeleteBatch={onDeleteBatch} 
        onUpdateBatchName={onUpdateBatchName} 
        onUpdateBatchBank={onUpdateBatchBank} 
        onToggleSplitBatch={onToggleSplitBatch} 
        onToggleDefaultQr={onToggleDefaultQr} 
        onTogglePassword={onTogglePassword} 
        onSavePassword={onSavePassword} 
        onSaveGlobalBank={onSaveGlobalBank} 
        onTriggerActionSheet={(batchId) => { setSelectedBatchId(batchId || null); setShowActionSheet(true) }} 
        BANK_OPTIONS={BANK_OPTIONS} 
      />

      <Dialog open={nameModalOpen} onOpenChange={() => { }}>
        <DialogContent className="[&>button:last-child]:hidden rounded-[2.5rem] bg-slate-900 border-white/10">
          <DialogHeader><DialogTitle>👋 Bạn là ai?</DialogTitle></DialogHeader>
          <Input id="joinName" label="Tên của bạn" placeholder="Hùng, An, Bình..." onChange={e => nameInputRef.current = e.target.value} onKeyDown={e => e.key === 'Enter' && claimName(nameInputRef.current)} autoFocus className="rounded-2xl h-12" />
          <DialogFooter><Button onClick={() => claimName(nameInputRef.current)} disabled={isLoading} className="w-full rounded-2xl h-12 font-bold uppercase bg-blue-600">Tham gia →</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="rounded-[2.5rem] bg-slate-900 border-white/10">
          <DialogHeader><DialogTitle>🤔 Đây có phải là bạn?</DialogTitle><DialogDescription>Tên &ldquo;{claimCandidate?.name}&rdquo; đã có trong đơn.</DialogDescription></DialogHeader>
          <DialogFooter className="flex gap-3"><Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => { setClaimModalOpen(false); setNameModalOpen(true) }}>Không, tôi khác</Button><Button className="flex-1 rounded-2xl h-12 font-bold bg-blue-600" onClick={confirmClaim}>Đúng là tôi!</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent className="rounded-[2.5rem] bg-slate-900 border-white/10">
          <DialogHeader><DialogTitle>🏦 Thông tin ngân hàng</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <Select value={bankNameInput} onValueChange={setBankNameInput}>
              <SelectTrigger id="bankNameModal" className="rounded-2xl h-12"><SelectValue placeholder="Chọn ngân hàng..." /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10">{BANK_OPTIONS.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input id="bankAccountModal" label="Số tài khoản" value={bankAccountInput} onChange={e => setBankAccountInput(e.target.value)} className="rounded-2xl h-12" />
          </div>
          <DialogFooter><Button variant="outline" className="rounded-2xl h-12" onClick={() => setBankModalOpen(false)}>Huỷ</Button><Button onClick={saveBankAndLock} disabled={isLoading || !bankNameInput || !bankAccountInput} className="rounded-2xl h-12 font-bold bg-blue-600">Lưu & Chốt đơn</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="rounded-[2.5rem] bg-slate-900 border-white/10">
          <DialogHeader><DialogTitle className="text-rose-400">Xác nhận xoá món?</DialogTitle><DialogDescription>Hành động này không thể hoàn tác. Món ăn này sẽ biến mất khỏi đơn hàng.</DialogDescription></DialogHeader>
          <DialogFooter className="flex gap-3"><Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setDeleteConfirmId(null)}>Huỷ</Button><Button variant="destructive" className="flex-1 rounded-2xl h-12 font-bold uppercase" onClick={async () => { if (deleteConfirmId) { await deleteItem(deleteConfirmId); setDeleteConfirmId(null) } }}>Xoá ngay</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} description={confirmConfig.description} variant={confirmConfig.variant} isLoading={isLoading} />
      <ActionSheet isOpen={showActionSheet} onClose={() => setShowActionSheet(false)} title={selectedBatchId ? "Quét mã cho đơn này" : "Quét mã chính của Host"} options={[{ label: "Chụp ảnh QR", icon: <Camera className="w-5 h-5 text-sky-400" />, onClick: () => cameraInputRef.current?.click() }, { label: "Chọn từ thư viện", icon: <ImageIcon className="w-5 h-5 text-emerald-400" />, onClick: () => fileInputRef.current?.click() }]} />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleScanQR(e.target.files[0])} />
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleScanQR(e.target.files[0])} />
    </div>
  )
}
