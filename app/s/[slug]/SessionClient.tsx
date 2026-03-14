'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Trash2, Lock, Unlock, CheckCircle, Share2, ExternalLink,
  Loader2, RefreshCw, ShoppingBag, Users, QrCode, Receipt,
  Calendar, Camera, Check, Clock, Copy, Crown, Download, Edit2, ImagePlus,
  ChevronDown, ChevronUp, ArrowLeft, Pencil, X as XIcon, Eye, EyeOff, Save, ScanLine, Settings
} from 'lucide-react'
import QRScannerSection from '@/components/QRScannerSection'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateDeviceId, getParticipantId, setParticipantId, isHost } from '@/lib/identity'
import { calculateBill, formatVND, calcSubtotal } from '@/lib/calc'
import { buildQrUrl, BANK_OPTIONS } from '@/lib/vietqr'
import { Session, Participant, OrderItem, BillEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ───────────────────────────── Types ─────────────────────────────
interface Props {
  initialSession: Session
  initialParticipants: Participant[]
  initialItems: OrderItem[]
}

const addItemSchema = z.object({
  itemName: z.string().min(1, 'Tên món không được để trống').max(200),
  price: z.preprocess((v) => Number(v), z.number().min(0, 'Giá phải >= 0')),
  quantity: z.preprocess((v) => Number(v), z.number().min(1).max(99)).default(1),
  note: z.string().max(200).optional().or(z.literal('')),
  ice: z.string().optional(),
  sugar: z.string().optional(),
  paySeparate: z.boolean().default(false),
})
type AddItemForm = {
  itemName: string
  price: number
  quantity: number
  note?: string
  ice?: string
  sugar?: string
  batchGroup?: string
  paySeparate: boolean
}

const discountSchema = z.object({
  discountType: z.enum(['amount', 'percent']),
  discountValue: z.preprocess((v) => Number(v), z.number().min(0)),
  shippingFee: z.preprocess((v) => Number(v), z.number().min(0)),
})
type DiscountForm = {
  discountType: 'amount' | 'percent'
  discountValue: number
  shippingFee: number
}

// ───────────────────────────── Status Badge ─────────────────────────────
function StatusBadge({ status }: { status: Session['status'] }) {
  if (status === 'open') return <Badge variant="open">🟢 Mở đơn</Badge>
  if (status === 'locked') return <Badge variant="locked">🔒 Đã chốt</Badge>
  return <Badge variant="paid">✅ Đã thanh toán</Badge>
}

// ───────────────────────────── QR Card ─────────────────────────────
function QrCard({ entry, session }: { entry: BillEntry; session: Session }) {
  const [isSeparate, setIsSeparate] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState<string | null>(null)

  const copyAmount = (amount: number, id: string) => {
    navigator.clipboard.writeText(String(amount))
    setCopiedAmount(id)
    setTimeout(() => setCopiedAmount(null), 2000)
  }

  const saveImage = (url: string, suffix: string = '') => {
    const a = document.createElement('a')
    a.href = url
    a.download = `QR_${entry.participant.name.replace(/\s+/g, '_')}${suffix}_${session.title.replace(/\s+/g, '_')}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const totalQrUrl = session.bank_name && session.bank_account
    ? buildQrUrl(session.bank_name, session.bank_account, entry.total, `${entry.participant.name} - ${session.title}`)
    : null

  return (
    <Card className="overflow-hidden relative shadow-2xl shadow-black/40 border-white/20 hover:border-sky-500/40 transition-colors">
      <CardHeader className="pb-3 bg-gradient-to-b from-white/[0.08] to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              {entry.participant.name}
              {entry.items.length > 1 && (
                <button
                  onClick={() => setIsSeparate(!isSeparate)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${isSeparate ? 'bg-sky-500 border-sky-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                >
                  {isSeparate ? 'Gộp lại' : 'Trả lẻ'}
                </button>
              )}
            </CardTitle>
            {entry.participant.is_paid && <Badge variant="paid" className="w-fit">✅ Đã chuyển khoản</Badge>}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">
              {isSeparate ? 'Từng món' : 'Tổng cần trả'}
            </span>
            <span className="text-sky-400 font-black text-2xl tabular-nums tracking-tight">
              {formatVND(entry.total)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-2">
        {!isSeparate ? (
          // ── Single QR View ──
          <>
            {totalQrUrl && (
              <div className="flex justify-center p-3 bg-white rounded-2xl mx-auto w-fit shadow-inner relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={totalQrUrl} alt={`QR cho ${entry.participant.name}`} className="w-48 h-48 sm:w-56 sm:h-56 object-cover mix-blend-multiply" loading="lazy" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                  <Button variant="secondary" onClick={() => saveImage(totalQrUrl)} className="gap-2">
                    <Save className="w-4 h-4" /> Lưu ảnh
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant={copiedAmount === 'total' ? "success" : "secondary"}
                size="lg"
                className="flex-1 font-bold shadow-lg"
                onClick={() => copyAmount(entry.total, 'total')}
              >
                {copiedAmount === 'total' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copiedAmount === 'total' ? 'Đã copy!' : 'Copy số tiền'}
              </Button>
            </div>
          </>
        ) : (
          // ── Itemized QR View ──
          <div className="flex flex-col gap-6">
            {entry.items.map((ib, idx) => {
              const itemQrUrl = session.bank_name && session.bank_account
                ? buildQrUrl(session.bank_name, session.bank_account, ib.total, `${entry.participant.name} - ${ib.item.item_name} - ${session.title}`)
                : null

              return (
                <div key={ib.item.id} className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-0.5">Món {idx + 1}</p>
                      <h4 className="text-white font-bold text-sm truncate">{ib.item.item_name}</h4>
                      <p className="text-white/40 text-[10px] italic">Gồm ship & giảm giá</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sky-400 font-black text-lg tabular-nums">{formatVND(ib.total)}</p>
                    </div>
                  </div>

                  {itemQrUrl && (
                    <div className="flex justify-center p-2 bg-white rounded-xl mx-auto w-fit shadow-inner relative group/qr">
                      <img src={itemQrUrl} alt={`QR cho ${ib.item.item_name}`} className="w-40 h-40 sm:w-48 sm:h-48 object-cover mix-blend-multiply" loading="lazy" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <Button size="sm" variant="secondary" onClick={() => saveImage(itemQrUrl, `_${ib.item.item_name}`)} className="h-8 gap-1.5 text-xs">
                          <Save className="w-3.5 h-3.5" /> Lưu
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    variant={copiedAmount === ib.item.id ? "success" : "outline"}
                    size="sm"
                    className={`w-full h-9 font-bold transition-all ${copiedAmount === ib.item.id ? '' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                    onClick={() => copyAmount(ib.total, ib.item.id)}
                  >
                    {copiedAmount === ib.item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedAmount === ib.item.id ? 'Đã copy!' : 'Copy tiền'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <div className="text-sm text-white/60 space-y-1.5 bg-black/20 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-white/40">Tạm tính:</span>
            <span className="tabular-nums font-medium text-white/80">{formatVND(entry.subtotal)}</span>
          </div>
          {entry.discountAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-white/40">Giảm giá:</span>
              <span className="tabular-nums font-medium text-emerald-400">-{formatVND(entry.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-white/40">Phí ship:</span>
            <span className="tabular-nums font-medium text-white/80">+{formatVND(entry.shippingShare)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ───────────────────────────── Bill Summary Table ─────────────────────────────
function BillSummary({ entries, session }: { entries: BillEntry[]; session: Session }) {
  const allItems = entries.flatMap(e => e.items)
  const batches = Array.from(new Set(allItems.map(ib => ib.item.batch_group || 'Đơn 1')))
  const grandTotal = entries.reduce((s, e) => s + e.total, 0)
  const configs = (session.batch_configs as Record<string, any>) || {}

  return (
    <Card className="overflow-hidden border-sky-500/10 shadow-2xl bg-[#0a0a0c]">
      <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-sky-400">
          <Receipt className="w-4 h-4" />
          Tổng kết đơn hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {batches.map((batchName, bIdx) => {
          const batchItems = allItems.filter(ib => (ib.item.batch_group || 'Đơn 1') === batchName)
          const batchTotal = batchItems.reduce((s, ib) => s + ib.total, 0)
          const batchSubtotal = batchItems.reduce((s, ib) => s + ib.subtotal, 0)
          const pIdsInBatch = Array.from(new Set(batchItems.map(ib => ib.item.participant_id)))

          const config = session.is_split_batch
            ? (configs[batchName] || { type: 'amount', value: 0, ship: 0 })
            : { type: session.discount_type, value: session.discount_value, ship: session.shipping_fee };

          const bDiscountValue = Number(config.value) || 0
          const bShipFee = Number(config.ship) || 0
          const bDiscountType = config.type || 'amount'

          return (
            <div key={batchName} className="flex flex-col">
              <div className="bg-sky-500/5 px-5 py-4 flex flex-col gap-2 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                    <span className="font-black text-sky-300 text-[11px] uppercase tracking-wider">{batchName}</span>
                  </div>
                  <span className="font-black text-white text-base tabular-nums">{formatVND(batchTotal)}</span>
                </div>

                {(bDiscountValue > 0 || bShipFee > 0) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 ml-3.5 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/20 uppercase font-black tracking-tighter">Món:</span>
                      <span className="text-[10px] text-white/50 font-bold tabular-nums">{formatVND(batchSubtotal)}</span>
                    </div>
                    {bDiscountValue > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-400/60 uppercase font-black tracking-tighter">🏷️ Giảm:</span>
                        <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
                          {bDiscountType === 'percent' ? `-${bDiscountValue}%` : `-${formatVND(bDiscountValue)}`}
                        </span>
                      </div>
                    )}
                    {bShipFee > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-amber-400/60 uppercase font-black tracking-tighter">📦 Ship:</span>
                        <span className="text-[10px] text-amber-500 font-bold tabular-nums">+{formatVND(bShipFee)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="divide-y divide-white/5">
                {pIdsInBatch.map(pId => {
                  const entry = entries.find(e => e.participant.id === pId)
                  if (!entry) return null

                  const pBatchItems = entry.items.filter(ib => (ib.item.batch_group || 'Đơn 1') === batchName)
                  const pSubtotal = pBatchItems.reduce((s, ib) => s + ib.subtotal, 0)
                  const pDiscountShare = pBatchItems.reduce((s, ib) => s + ib.discountAmount, 0)
                  const pShipShare = pBatchItems.reduce((s, ib) => s + ib.shippingShare, 0)
                  const pAdjustment = pShipShare - pDiscountShare
                  const pBatchTotal = pBatchItems.reduce((s, ib) => s + ib.total, 0)

                  return (
                    <div key={pId} className="group/p">
                      <div className="px-5 py-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {entry.participant.is_host && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            <span className="font-bold text-white text-[13px] leading-tight">
                              {entry.participant.name}
                            </span>
                            {entry.participant.is_paid && <Badge variant="paid" className="text-[9px] px-1.5 py-0">Đã trả</Badge>}
                          </div>
                          <span className="font-black text-sky-400 tabular-nums text-sm drop-shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                            {formatVND(pBatchTotal)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5">
                            <span className="block text-[9px] font-bold text-white/30 uppercase tracking-tighter mb-0.5">Món ăn</span>
                            <span className="block text-[11px] font-bold text-white/70 tabular-nums">{formatVND(pSubtotal)}</span>
                          </div>
                          <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5">
                            <span className="block text-[9px] font-bold text-white/30 uppercase tracking-tighter mb-0.5">Giảm/Ship</span>
                            <span className={`block text-[11px] font-bold tabular-nums ${pAdjustment < 0 ? 'text-emerald-400' : pAdjustment > 0 ? 'text-amber-400' : 'text-white/40'}`}>
                              {pAdjustment === 0 ? '–' : (pAdjustment < 0 ? `-${formatVND(Math.abs(pAdjustment))}` : `+${formatVND(pAdjustment)}`)}
                            </span>
                          </div>
                          <div className="bg-sky-500/10 rounded-xl p-2 border border-sky-500/10">
                            <span className="block text-[9px] font-bold text-sky-400/50 uppercase tracking-tighter mb-0.5">Cần trả</span>
                            <span className="block text-[11px] font-black text-sky-400 tabular-nums">{formatVND(pBatchTotal)}</span>
                          </div>
                        </div>

                        {/* Sub-items list */}
                        <div className="flex flex-col gap-1.5 mt-1 border-t border-white/[0.03] pt-3">
                          {pBatchItems.map(ib => (
                            <div key={ib.item.id} className="flex justify-between items-center text-[10px] text-white/40 group-hover:text-white/60 transition-colors">
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="truncate">{ib.item.quantity}x {ib.item.item_name}</span>
                              </div>
                              <span className="tabular-nums font-medium text-white/30">{formatVND(ib.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="bg-sky-500/10 p-6 flex justify-between items-center border-t border-sky-500/20 shadow-[inset_0_2px_20px_rgba(14,165,233,0.1)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-1">Tổng cộng đơn hàng</span>
            <span className="text-white/40 text-[11px] font-medium italic">Tất cả các đợt đặt món</span>
          </div>
          <span className="font-black text-white text-2xl tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {formatVND(grandTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ───────────────────────────── Main Client Component ─────────────────────────────
export default function SessionClient({ initialSession, initialParticipants, initialItems }: Props) {
  const [session, setSession] = useState<Session>(initialSession)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialItems)
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null)
  const [iAmHost, setIAmHost] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null)
  const [showBill, setShowBill] = useState(false)
  const [showQrs, setShowQrs] = useState(false)
  // Inline edit
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showAllMyItems, setShowAllMyItems] = useState(false)
  const [editDraft, setEditDraft] = useState<{ itemName: string; price: string; quantity: string; note: string; ice: string; sugar: string; batchGroup: string; paySeparate: boolean }>({ itemName: '', price: '', quantity: '', note: '', ice: '', sugar: '', batchGroup: 'Đơn 1', paySeparate: false })
  const [justAdded, setJustAdded] = useState(false)
  const [isScanningLive, setIsScanningLive] = useState(false)
  const [hasConfirmedCamera, setHasConfirmedCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // ── Parse QR Image ──
  const processQRData = useCallback((raw: string) => {
    let bankAccount = ''
    let bankBin = ''

    try {
      const parseTLV = (data: string) => {
        const res: Record<string, string> = {}
        let i = 0
        while (i + 4 <= data.length) {
          const tag = data.substring(i, i + 2)
          const len = parseInt(data.substring(i + 2, i + 4), 10)
          if (isNaN(len)) break
          res[tag] = data.substring(i + 4, i + 4 + len)
          i += 4 + len
        }
        return res
      }

      const mainTags = parseTLV(raw)
      const merchantInfoRaw = mainTags['38'] || mainTags['27'] || mainTags['28'] || mainTags['29']

      if (merchantInfoRaw) {
        const mTags = parseTLV(merchantInfoRaw)
        if (mTags['01']) {
          const pTags = parseTLV(mTags['01'])
          bankBin = pTags['00'] || ''
          bankAccount = pTags['01'] || ''
        } else {
          bankBin = mTags['00'] || ''
          bankAccount = mTags['01'] || ''
        }
      }

      if (!bankAccount) {
        const accMatch = raw.match(/(?:A\d{3}|BNK)(\d{6,})/) ||
          raw.match(/0006\d{6}01\d{2}(\d{6,})/) ||
          raw.match(/\d{4}QRIBFTTA\s*\w+\s+(\d+)/) ||
          raw.match(/\d{4}QRIBFTTA\s*\w+\s+(\d+)/) ||
          raw.match(/[Qq][Rr][-_][Bb][Aa][Nn][Kk][-_](\d+)/)
        if (accMatch) bankAccount = accMatch[1]
      }
    } catch (e) {
      console.error('QR Parse error', e)
    }

    if (bankAccount) {
      bankAccount = bankAccount.replace(/\D.*$/, '')
      setBankAccountInput(bankAccount)
      if (bankBin) {
        const bank = BANK_OPTIONS.find(b => b.bin === bankBin)
        if (bank) setBankNameInput(bank.code)
      } else {
        const bank = BANK_OPTIONS.find(b => raw.toUpperCase().includes(b.shortName) || raw.includes(b.code))
        if (bank) setBankNameInput(bank.code)
      }
      return true
    }
    return false
  }, [])

  // Host UI states
  const [hostPasswordDraft, setHostPasswordDraft] = useState('')
  const [showPasswordEdit, setShowPasswordEdit] = useState(false)
  const [newBatchDraft, setNewBatchDraft] = useState('')
  const [showNewBatch, setShowNewBatch] = useState(false)

  // Password gate
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)

  // Modals
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimCandidate, setClaimCandidate] = useState<Participant | null>(null)
  const [hostControlsOpen, setHostControlsOpen] = useState(false)
  const [hostTab, setHostTab] = useState<'total' | 'detail'>('total')
  const [finalTotal, setFinalTotal] = useState('')
  const [batchFinalTotals, setBatchFinalTotals] = useState<Record<string, string>>({})
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [bankNameInput, setBankNameInput] = useState('')
  const [bankAccountInput, setBankAccountInput] = useState('')

  // Name input ref
  const nameInputRef = useRef('')

  // Forms
  const addItemForm = useForm<AddItemForm>({ resolver: zodResolver(addItemSchema) as any, defaultValues: { quantity: 1, batchGroup: 'Đơn 1' } })
  const discountForm = useForm<DiscountForm>({
    resolver: zodResolver(discountSchema) as any,
    defaultValues: {
      discountType: session.discount_type,
      discountValue: session.discount_value,
      shippingFee: session.shipping_fee,
    },
  })

  const supabase = createClient()

  const [paymentMode, setPaymentMode] = useState<'per_session' | 'global'>('per_session')

  // ── On mount: identity resolution & password check ──
  useEffect(() => {
    // Check for global bank info
    const globalBankName = localStorage.getItem('global_bank_name')
    const globalBankAccount = localStorage.getItem('global_bank_account')
    if (globalBankName && globalBankAccount) {
      setPaymentMode('global')
      // If session bank is empty, we could potentially auto-fill but let's keep it separate for now
    }
    // Bypass password check for better UX as requested
    setPasswordVerified(true)

    const savedPid = getParticipantId(session.id)
    const amHost = isHost(session.host_device_id)
    setIAmHost(amHost)

    if (savedPid) {
      setMyParticipantId(savedPid)
      setExpandedParticipant(savedPid)
    } else if (amHost) {
      const hostP = participants.find(p => p.is_host)
      if (hostP) {
        setParticipantId(session.id, hostP.id)
        setMyParticipantId(hostP.id)
        setExpandedParticipant(hostP.id)
      } else {
        setNameModalOpen(true)
      }
    } else {
      setNameModalOpen(true)
    }
  }, [session.id, session.host_device_id])

  const [editingBatchName, setEditingBatchName] = useState<string | null>(null)
  const [batchNameDraft, setBatchNameDraft] = useState('')

  // ── Realtime subscriptions ──
  useEffect(() => {
    const channel = supabase
      .channel(`session:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrderItems(prev => [...prev, payload.new as OrderItem])
          } else if (payload.eventType === 'DELETE') {
            setOrderItems(prev => prev.filter(i => i.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setOrderItems(prev => prev.map(i => i.id === (payload.new as OrderItem).id ? payload.new as OrderItem : i))
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setParticipants(prev => [...prev, payload.new as Participant])
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setParticipants(prev => prev.map(p => p.id === (payload.new as Participant).id ? payload.new as Participant : p))
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          setSession(payload.new as Session)
          discountForm.reset({
            discountType: (payload.new as Session).discount_type,
            discountValue: (payload.new as Session).discount_value,
            shippingFee: (payload.new as Session).shipping_fee,
          })
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session.id])

  // ── Name claim logic ──
  const claimName = useCallback(async (name: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, name }),
      })
      const json = await res.json()
      if (json.status === 'exists') {
        setClaimCandidate(json.participant)
        setNameModalOpen(false)
        setClaimModalOpen(true)
      } else {
        setParticipantId(session.id, json.participant.id)
        setMyParticipantId(json.participant.id)
        setExpandedParticipant(json.participant.id)
        setNameModalOpen(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [session.id])

  const confirmClaim = useCallback(async () => {
    if (!claimCandidate) return
    setParticipantId(session.id, claimCandidate.id)
    setMyParticipantId(claimCandidate.id)
    setExpandedParticipant(claimCandidate.id)
    setClaimModalOpen(false)
    setClaimCandidate(null)
  }, [session.id, claimCandidate])

  // ── Add item ──
  const addItem = useCallback(async (data: AddItemForm) => {
    if (!myParticipantId || session.status !== 'open') return
    setIsLoading(true)
    try {
      await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: myParticipantId,
          sessionId: session.id,
          itemName: data.itemName,
          price: data.price,
          quantity: data.quantity,
          note: data.note || null,
          ice: data.ice || null,
          sugar: data.sugar || null,
          batch_group: session.is_split_batch && data.batchGroup ? data.batchGroup : 'Đơn 1',
          pay_separate: !!data.paySeparate,
        }),
      })
      addItemForm.reset({
        quantity: 1,
        itemName: '',
        price: undefined,
        note: '',
        ice: '',
        sugar: '',
        batchGroup: data.batchGroup || 'Đơn 1',
        paySeparate: false
      })
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [myParticipantId, session.id, session.status, addItemForm])

  // ── Delete item ──
  const deletingItems = useRef(new Set<string>())
  const deleteItem = useCallback(async (itemId: string) => {
    if (deletingItems.current.has(itemId)) return
    deletingItems.current.add(itemId)
    setOrderItems(prev => prev.filter(i => i.id !== itemId))
    try {
      await fetch(`/api/order-items/${itemId}`, { method: 'DELETE' })
    } catch {
      // Reversion handled by realtime
    } finally {
      deletingItems.current.delete(itemId)
    }
  }, [])

  // ── Edit item ──
  const startEdit = useCallback((item: OrderItem) => {
    setEditingItemId(item.id)
    setEditDraft({ 
      itemName: item.item_name, 
      price: String(item.price), 
      quantity: String(item.quantity), 
      note: item.note || '', 
      ice: item.ice || '', 
      sugar: item.sugar || '', 
      batchGroup: item.batch_group || 'Đơn 1', 
      paySeparate: !!item.pay_separate 
    })
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
          batch_group: session.is_split_batch ? editDraft.batchGroup : 'Đơn 1',
          pay_separate: !!editDraft.paySeparate,
        }),
      })
      setEditingItemId(null)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [editDraft, session.is_split_batch])

  // ── Host: update discount/ship ──
  const updateDiscountShip = useCallback(async (data: DiscountForm) => {
    setIsLoading(true)
    try {
      await fetch(`/api/sessions/${session.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostDeviceId: getOrCreateDeviceId(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          shippingFee: data.shippingFee,
        }),
      })
      setHostControlsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }, [session.slug])

  // ── Password Gate ──
  const verifyPassword = useCallback(async () => {
    setCheckingPassword(true)
    setPasswordError('')
    try {
      const res = await fetch(`/api/sessions/${session.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      if (res.ok) {
        sessionStorage.setItem(`session_verified_${session.id}`, 'true')
        setPasswordVerified(true)
      } else {
        const json = await res.json()
        setPasswordError(json.error || 'Sai mật khẩu')
      }
    } finally {
      setCheckingPassword(false)
    }
  }, [session.slug, passwordInput, session.id])

  // ── Host: lock order ──
  const lockOrder = useCallback(async () => {
    // Check if we should use global info
    const globalBankName = localStorage.getItem('global_bank_name')
    const globalBankAccount = localStorage.getItem('global_bank_account')

    if (!session.bank_name || !session.bank_account) {
      if (globalBankName && globalBankAccount) {
        // Auto-fill from global
        setIsLoading(true)
        try {
          await fetch(`/api/sessions/${session.slug}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hostDeviceId: getOrCreateDeviceId(),
              bankName: globalBankName,
              bankAccount: globalBankAccount,
            }),
          })
          setSession(prev => ({ ...prev, bank_name: globalBankName, bank_account: globalBankAccount }))
        } finally {
          setIsLoading(false)
        }
      } else {
        setBankModalOpen(true)
        return
      }
    }
    if (!confirm('Chốt đơn? Mọi người sẽ không thể thêm món nữa.')) return
    setIsLoading(true)
    try {
      await fetch(`/api/sessions/${session.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'locked' }),
      })
      setShowBill(true)
      setShowQrs(true)
    } finally {
      setIsLoading(false)
    }
  }, [session.slug, session.bank_name, session.bank_account, session.is_split_batch])

  const reopenOrder = useCallback(async () => {
    if (!confirm('Mở lại đơn? Mọi người sẽ có thể thêm/xoá món.')) return
    setIsLoading(true)
    try {
      await fetch(`/api/sessions/${session.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'open' }),
      })
      setShowBill(false)
      setShowQrs(false)
    } finally {
      setIsLoading(false)
    }
  }, [session.slug])

  const saveBankAndLock = useCallback(async () => {
    if (!bankNameInput || !bankAccountInput) return
    setIsLoading(true)
    try {
      // If global mode is on or user chose to save, we'd save to localStorage
      // For now let's just save to localStorage every time they manually enter it
      localStorage.setItem('global_bank_name', bankNameInput)
      localStorage.setItem('global_bank_account', bankAccountInput)

      await fetch(`/api/sessions/${session.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostDeviceId: getOrCreateDeviceId(),
          bankName: bankNameInput,
          bankAccount: bankAccountInput,
        }),
      })
      setSession(prev => ({ ...prev, bank_name: bankNameInput, bank_account: bankAccountInput }))
      setBankModalOpen(false)
      if (!confirm('Chốt đơn? Mọi người sẽ không thể thêm món nữa.')) {
        setIsLoading(false)
        return
      }
      await fetch(`/api/sessions/${session.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'locked' }),
      })
      setShowBill(true)
      setShowQrs(true)
    } finally {
      setIsLoading(false)
    }
  }, [session.slug, bankNameInput, bankAccountInput])

  const markPaid = useCallback(async (participantId: string, isPaid: boolean) => {
    await fetch('/api/participants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, isPaid }),
    })
  }, [])

  const markAllPaid = useCallback(async () => {
    await Promise.all(
      participants.filter(p => !p.is_paid).map(p => markPaid(p.id, true))
    )
  }, [participants, markPaid])

  const removeParticipant = useCallback(async (participantId: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xoá ${name} khỏi đơn?`)) return
    setIsLoading(true)
    try {
      await fetch(`/api/participants/${participantId}`, { method: 'DELETE' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markSessionPaid = useCallback(async () => {
    if (!confirm('Đánh dấu toàn bộ đơn là đã thanh toán?')) return
    await markAllPaid()
    setIsLoading(true)
    try {
      await fetch(`/api/sessions/${session.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), status: 'paid' }),
      })
    } finally {
      setIsLoading(false)
    }
  }, [session.slug, markAllPaid])

  const shareLink = useCallback(() => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: session.title, url })
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [session.title])

  const copySessionId = useCallback(() => {
    navigator.clipboard.writeText(session.slug)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }, [session.slug])

  // ── Calculation ──
  const billEntries: BillEntry[] = calculateBill(session, participants, orderItems)
  const myBill = billEntries.find(e => e.participant.id === myParticipantId)
  
  const configuredBatches = Object.keys((session.batch_configs as Record<string, any>) || {})
  const usedBatches = orderItems.map(i => i.batch_group || 'Đơn 1')
  const uniqueBatches = Array.from(new Set([...configuredBatches, ...usedBatches]))
  if (uniqueBatches.length === 0) uniqueBatches.push('Đơn 1')

  const myItems = orderItems
    .filter(i => i.participant_id === myParticipantId)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  const canEdit = session.status === 'open' && !!myParticipantId

  if (!passwordVerified) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-2xl flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-sky-400" />
            </div>
            <CardTitle className="text-lg">Đơn có mật khẩu</CardTitle>
            <p className="text-sm text-white/50 mt-1">Nhập mật khẩu để vào xem đơn <span className="font-semibold text-white/70">{session.title}</span></p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError('') }}
                onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                placeholder="Mật khẩu..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-sky-500/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>}
            <Button onClick={verifyPassword} disabled={checkingPassword || !passwordInput} className="w-full">
              {checkingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Vào đơn
            </Button>
            <a href="/" className="text-center text-xs text-white/40 hover:text-white/60 mt-2 block">← Quay lại trang chủ</a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-dvh pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <button
                onClick={copySessionId}
                className="group flex items-center gap-1.5 text-white/60 hover:text-white/90 font-mono text-xs bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md transition-colors"
                title="Bấm để copy ID"
              >
                <span className="select-none">#</span>{session.slug}
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
              <h1 className="font-bold text-white truncate text-sm sm:text-base">{session.title}</h1>
              <StatusBadge status={session.status} />
              {iAmHost && <Badge variant="host"><Crown className="w-3 h-3" />Host</Badge>}
            </div>
            {session.shop_link && (
              <a href={session.shop_link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-0.5">
                <ExternalLink className="w-3 h-3" /> Xem menu
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span title="Live">
              <span className="live-dot inline-block w-2 h-2 bg-emerald-400 rounded-full" />
            </span>
            {iAmHost && (
              <Button variant="outline" size="icon" onClick={() => setHostControlsOpen(true)} title="Cài đặt Host">
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={shareLink} title="Chia sẻ link">
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-3 flex flex-col gap-3">
        {/* Banner for unpaid */}
        {session.status !== 'open' && myBill && !myBill.participant.is_paid && myBill.total > 0 && (
          <div className="bg-gradient-to-r from-sky-600/30 to-indigo-600/30 border border-sky-500/30 rounded-2xl p-5 text-center slide-up">
            <p className="text-sm text-white/70 mb-1">Bạn cần thanh toán</p>
            <p className="text-3xl font-black text-white tabular-nums">{formatVND(myBill.total)}</p>
            <p className="text-xs text-white/40 mt-2">Cuộn xuống để xem mã QR chuyển khoản</p>
          </div>
        )}

        {/* Add item card */}
        {canEdit && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                Gọi của bạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addItemForm.handleSubmit(addItem)} className="flex flex-col gap-3">
                <Input
                  id="itemName"
                  placeholder="Tên món (ví dụ: Trà sữa Thái)"
                  error={addItemForm.formState.errors.itemName?.message}
                  {...addItemForm.register('itemName')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="price"
                    type="number"
                    placeholder="Giá (đồng)"
                    min="0"
                    error={addItemForm.formState.errors.price?.message}
                    {...addItemForm.register('price')}
                  />
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Số lượng"
                    min="1"
                    max="99"
                    error={addItemForm.formState.errors.quantity?.message}
                    {...addItemForm.register('quantity')}
                  />
                </div>
                <Input
                  id="note"
                  placeholder="Topping (trân châu, thạch...)"
                  {...addItemForm.register('note')}
                />
                {session.is_split_batch && (
                  <div className="flex flex-col gap-1.5 px-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Chia đơn</span>
                    <select
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-200 focus:outline-none focus:border-emerald-500/50 appearance-none"
                      {...addItemForm.register('batchGroup')}
                    >
                      {uniqueBatches.map(b => (
                        <option key={b} value={b} className="bg-slate-900 text-white">{b}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-1.5 px-1">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Đường</span>
                    <select
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 appearance-none"
                      {...addItemForm.register('sugar')}
                    >
                      <option value="" className="bg-slate-900 text-white">Bình thường</option>
                      <option value="100%" className="bg-slate-900 text-white">100% Đường</option>
                      <option value="70%" className="bg-slate-900 text-white">70% Đường</option>
                      <option value="50%" className="bg-slate-900 text-white">50% Đường</option>
                      <option value="30%" className="bg-slate-900 text-white">30% Đường</option>
                      <option value="0%" className="bg-slate-900 text-white">Không đường</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 px-1">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Đá</span>
                    <select
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 appearance-none"
                      {...addItemForm.register('ice')}
                    >
                      <option value="" className="bg-slate-900 text-white">Bình thường</option>
                      <option value="100%" className="bg-slate-900 text-white">100% Đá</option>
                      <option value="70%" className="bg-slate-900 text-white">70% Đá</option>
                      <option value="50%" className="bg-slate-900 text-white">50% Đá</option>
                      <option value="30%" className="bg-slate-900 text-white">30% Đá (Ít)</option>
                      <option value="0%" className="bg-slate-900 text-white">Không đá</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1 px-1 mt-1">
                  <input
                    id="paySeparate"
                    type="checkbox"
                    {...addItemForm.register('paySeparate')}
                    className="custom-checkbox"
                  />
                  <label htmlFor="paySeparate" className="text-xs text-white/60 cursor-pointer select-none">
                    Thanh toán riêng (chia mã QR lẻ)
                  </label>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full relative overflow-hidden transition-all">
                  {justAdded && (
                    <div className="absolute inset-0 bg-emerald-500 text-white flex items-center justify-center gap-2 z-10 fade-in fade-out">
                      <CheckCircle className="w-4 h-4" /> Đã thêm!
                    </div>
                  )}
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Thêm món
                </Button>
              </form>

              {/* My items list */}
              {myItems.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Món đã gọi ({myItems.length})</p>
                    {myItems.length > 1 && (
                      <button
                        onClick={() => setShowAllMyItems(!showAllMyItems)}
                        className="text-[10px] text-sky-400/70 hover:text-sky-400 font-bold uppercase flex items-center gap-1 transition-colors active:scale-95"
                      >
                        {showAllMyItems ? 'Thu gọn' : `Chi tiết (${myItems.length})`}
                        <ChevronDown className={`w-3 h-3 chevron-rotate ${showAllMyItems ? 'active' : ''}`} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {/* First item */}
                    {myItems[0] && (
                      <div className="slide-up">
                        {editingItemId === myItems[0].id ? (
                          <div className="flex flex-col gap-2 bg-sky-500/10 border border-sky-500/25 rounded-xl px-3 py-3">
                            <input
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sky-500/50"
                              value={editDraft.itemName}
                              onChange={e => setEditDraft(d => ({ ...d, itemName: e.target.value }))}
                              placeholder="Tên món"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="number" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" value={editDraft.price} onChange={e => setEditDraft(d => ({ ...d, price: e.target.value }))} placeholder="Giá" />
                              <input type="number" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" value={editDraft.quantity} onChange={e => setEditDraft(d => ({ ...d, quantity: e.target.value }))} placeholder="SL" />
                            </div>
                            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" value={editDraft.note} onChange={e => setEditDraft(d => ({ ...d, note: e.target.value }))} placeholder="Topping" />
                            <div className="flex gap-2 mt-2">
                              <Button className="flex-1 h-9 text-xs" onClick={() => saveEdit(myItems[0].id)} disabled={isLoading}>
                                <Save className="w-3 h-3 mr-1.5" /> Lưu
                              </Button>
                              <Button variant="outline" className="h-9 px-3" onClick={() => setEditingItemId(null)}>Huỷ</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="group/item bg-white/5 rounded-xl p-3 border border-white/5 hover:border-sky-500/20 hover:bg-white/[0.07] transition-all relative">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!myItems[0].pay_separate}
                                onChange={async (e) => {
                                  const checked = e.target.checked
                                  setOrderItems(prev => prev.map(i => i.id === myItems[0].id ? { ...i, pay_separate: checked } : i))
                                  await fetch(`/api/order-items/${myItems[0].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pay_separate: checked }) })
                                }}
                                className="custom-checkbox"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-white truncate leading-tight">{myItems[0].item_name}</h4>
                                    <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mt-0.5">
                                      <span className="text-[11px] font-bold text-sky-400">{formatVND(myItems[0].price)} × {myItems[0].quantity}</span>
                                      {session.is_split_batch && <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 uppercase">{myItems[0].batch_group || 'Đơn 1'}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end shrink-0">
                                    <span className="text-sm font-black text-white tabular-nums">{formatVND(myItems[0].price * myItems[0].quantity)}</span>
                                  </div>
                                </div>
                                {(myItems[0].note || myItems[0].ice || myItems[0].sugar) && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5 items-center opacity-70">
                                    {myItems[0].note && <span className="text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded-md italic truncate max-w-[150px]">{myItems[0].note}</span>}
                                    {myItems[0].ice && <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">🧊 {myItems[0].ice} Đá</span>}
                                    {myItems[0].sugar && <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">🍭 {myItems[0].sugar} Đường</span>}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-all shrink-0">
                                <button onClick={() => startEdit(myItems[0])} className="p-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-white/30 hover:text-sky-400 border border-white/5 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteItem(myItems[0].id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 border border-white/5 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Remaining items */}
                    {myItems.length > 1 && (
                      <div className={`grid transition-all duration-300 ease-in-out ${showAllMyItems ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                        <div className="overflow-hidden min-h-0 flex flex-col gap-2 pt-2">
                          {myItems.slice(1).map(item => (
                            <div key={item.id} className="group/item bg-white/5 rounded-xl p-3 border border-white/5 hover:border-sky-500/20 transition-all relative">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={!!item.pay_separate}
                                  onChange={async (e) => {
                                    const checked = e.target.checked
                                    setOrderItems(prev => prev.map(i => i.id === item.id ? { ...i, pay_separate: checked } : i))
                                    await fetch(`/api/order-items/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pay_separate: checked }) })
                                  }}
                                  className="custom-checkbox"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-bold text-white truncate leading-tight">{item.item_name}</h4>
                                      <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mt-0.5">
                                        <span className="text-[11px] font-bold text-sky-400">{formatVND(item.price)} × {item.quantity}</span>
                                        {session.is_split_batch && <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 uppercase">{item.batch_group || 'Đơn 1'}</span>}
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end shrink-0">
                                      <span className="text-sm font-black text-white tabular-nums">{formatVND(item.price * item.quantity)}</span>
                                    </div>
                                  </div>
                                  {(item.note || item.ice || item.sugar) && (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center opacity-70">
                                      {item.note && <span className="text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded-md italic truncate max-w-[150px]">{item.note}</span>}
                                      {item.ice && <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">🧊 {item.ice} Đá</span>}
                                      {item.sugar && <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">🍭 {item.sugar} Đường</span>}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-all shrink-0">
                                  <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-white/30 hover:text-sky-400 border border-white/5 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 border border-white/5 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {myBill && (
                    <div className="flex justify-between items-center mt-2 px-3 py-2 bg-sky-500/10 rounded-xl border border-sky-500/20">
                      <span className="text-sm text-sky-300">Tổng tiền của bạn</span>
                      <span className="font-black text-sky-400 text-lg tabular-nums">{formatVND(myBill.total)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All participants card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Đơn hàng ({participants.length} người)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {participants.map(p => {
                const pItems = orderItems.filter(i => i.participant_id === p.id)
                const isExpanded = expandedParticipant === p.id
                return (
                  <div key={p.id} className="group">
                    <div className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer" onClick={() => setExpandedParticipant(isExpanded ? null : p.id)}>
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sm font-bold text-sky-300">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {p.is_host && <Crown className="w-3 h-3 text-amber-400" />}
                          <span className="font-medium text-white text-sm">{p.name}</span>
                          {p.id === myParticipantId && <span className="text-xs text-sky-400">(bạn)</span>}
                        </div>
                        <p className="text-xs text-white/40">{pItems.length} món · {formatVND(calcSubtotal(pItems))}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.is_paid && <Badge variant="paid" className="text-[10px] px-1.5">✓ Đã trả</Badge>}
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30 chevron-rotate active" /> : <ChevronDown className="w-4 h-4 text-white/30 chevron-rotate" />}
                      </div>
                    </div>
                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                      <div className="overflow-hidden min-h-0 px-4 pb-2.5">
                        {pItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-white/[0.03] last:border-0 border-dashed">
                             <div className="flex items-center gap-2 truncate">
                               <span className="shrink-0 flex items-center justify-center bg-white/5 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white/30 border border-white/5">{item.quantity}</span>
                               <span className="text-white/70 text-xs truncate">{item.item_name}</span>
                             </div>
                             <span className="tabular-nums text-white/40 text-xs">{formatVND(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {billEntries.length > 0 && (session.status !== 'open' || showBill) && (
          <BillSummary entries={billEntries} session={session} />
        )}

        {session.status !== 'open' && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-white flex items-center gap-2"><QrCode className="w-5 h-5 text-sky-400" />Mã QR thanh toán</h2>
            {myBill && (myBill.subtotal > 0 || myBill.shippingShare > 0) && <QrCard entry={myBill} session={session} />}
            {(showQrs || iAmHost) && billEntries.filter(e => e.participant.id !== myParticipantId && (e.subtotal > 0 || e.shippingShare > 0)).map(e => <QrCard key={e.participant.id} entry={e} session={session} />)}
          </div>
        )}

        {iAmHost && (
          <div className="flex flex-col gap-3 mt-4">
            {session.status === 'open' ? (
              <Button variant="warning" size="lg" onClick={lockOrder} disabled={isLoading} className="w-full text-lg font-bold shadow-lg py-6">
                <Lock className="w-5 h-5 mr-2" /> Chốt đơn
              </Button>
            ) : session.status === 'locked' ? (
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={() => setShowQrs(!showQrs)} className="flex-1 py-6">{showQrs ? 'Ẩn QR' : 'Xem QR'}</Button>
                <Button variant="success" size="lg" onClick={markSessionPaid} disabled={isLoading} className="flex-1 py-6">Đã nhận đủ tiền</Button>
              </div>
            ) : (
              <div className="text-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">✅ Đơn đã hoàn thành!</div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Dialog open={hostControlsOpen} onOpenChange={setHostControlsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚙️ Cài đặt Host</DialogTitle>
            <DialogDescription>Quản lý các tuỳ chọn của đơn và tính toán số tiền chốt.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.07]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Users className="w-5 h-5" /></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Chia nhiều đơn</span>
                    <span className="text-[11px] text-white/40">Gom nhóm món (Đơn 1, Đơn 2...)</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={session.is_split_batch} onChange={async (e) => {
                    const isSplit = e.target.checked
                    await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), isSplitBatch: isSplit }) })
                    setSession(prev => ({ ...prev, is_split_batch: isSplit }))
                  }} />
                  <div className="w-10 h-5.5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className={`flex flex-col bg-white/5 rounded-2xl border border-white/5 transition-all ${showPasswordEdit ? 'ring-1 ring-sky-500/30' : ''}`}>
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400"><Lock className="w-5 h-5" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">Bảo vệ mật khẩu</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase ${session.has_password ? 'text-sky-400' : 'text-white/20'}`}>
                          {session.has_password ? 'Đang bật' : 'Đang tắt'}
                        </span>
                        {session.has_password && !showPasswordEdit && (
                          <button onClick={() => { setShowPasswordEdit(true); setHostPasswordDraft('') }} className="text-[10px] text-white/40 hover:text-white/60 underline decoration-white/20 underline-offset-2">Đổi</button>
                        )}
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={!!session.has_password || showPasswordEdit} onChange={async (e) => {
                      const hasPwd = e.target.checked
                      if (!hasPwd) {
                        setIsLoading(true)
                        try {
                          await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), password: null }) })
                          setSession(prev => ({ ...prev, has_password: false }))
                          setShowPasswordEdit(false)
                        } finally { setIsLoading(false) }
                      } else {
                        setShowPasswordEdit(true)
                        setHostPasswordDraft('')
                      }
                    }} />
                    <div className="w-10 h-5.5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>
                {showPasswordEdit && (
                  <div className="px-3.5 pb-3.5 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="relative w-40">
                        <Input
                          autoFocus
                          placeholder={session.has_password ? "Mật khẩu mới..." : "Nhập mật khẩu..."}
                          className="h-9 text-xs bg-black/40 pr-8"
                          value={hostPasswordDraft}
                          onChange={e => setHostPasswordDraft(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && hostPasswordDraft) {
                              setIsLoading(true)
                              try {
                                await fetch(`/api/sessions/${session.slug}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), password: hostPasswordDraft }),
                                })
                                setSession(prev => ({ ...prev, has_password: true }))
                                setShowPasswordEdit(false)
                              } finally {
                                setIsLoading(false)
                              }
                            }
                          }}
                        />
                        {showPasswordEdit && session.has_password && (
                          <button
                            onClick={() => setShowPasswordEdit(false)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="h-9 px-6 text-xs font-bold shrink-0"
                        disabled={!hostPasswordDraft || isLoading}
                        onClick={async () => {
                          setIsLoading(true)
                          try {
                            await fetch(`/api/sessions/${session.slug}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), password: hostPasswordDraft }),
                            })
                            setSession(prev => ({ ...prev, has_password: true }))
                            setShowPasswordEdit(false)
                          } finally {
                            setIsLoading(false)
                          }
                        }}
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lưu mật khẩu'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col bg-white/5 rounded-2xl border border-white/5 transition-all">
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">Mã nhận tiền</span>
                      <span className={`text-[10px] font-bold uppercase ${paymentMode === 'global' ? 'text-amber-400' : 'text-white/20'}`}>
                        {paymentMode === 'global' ? 'Tài khoản chung' : 'Mỗi đơn một mã'}
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={paymentMode === 'global'} onChange={(e) => {
                      const mode = e.target.checked ? 'global' : 'per_session'
                      setPaymentMode(mode)
                      if (mode === 'per_session') {
                        localStorage.removeItem('global_bank_name')
                        localStorage.removeItem('global_bank_account')
                      }
                    }} />
                    <div className="w-10 h-5.5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                {paymentMode === 'global' && (
                  <div className="px-3.5 pb-3.5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex gap-2">
                      <Select
                        value={localStorage.getItem('global_bank_name') || bankNameInput}
                        onValueChange={(val) => {
                          setBankNameInput(val)
                          localStorage.setItem('global_bank_name', val)
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs bg-black/40 border-white/10 flex-1">
                          <SelectValue placeholder="Ngân hàng..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BANK_OPTIONS.map((b) => (
                            <SelectItem key={b.code} value={b.code}>{b.shortName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Số tài khoản..."
                        className="h-9 text-xs bg-black/40 border-white/10 flex-[1.5]"
                        value={localStorage.getItem('global_bank_account') || bankAccountInput}
                        onChange={(e) => {
                          setBankAccountInput(e.target.value)
                          localStorage.setItem('global_bank_account', e.target.value)
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-9 w-full text-xs font-bold"
                      onClick={async () => {
                        setIsLoading(true)
                        try {
                          const name = localStorage.getItem('global_bank_name')
                          const acc = localStorage.getItem('global_bank_account')
                          if (name && acc) {
                            await fetch(`/api/sessions/${session.slug}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                hostDeviceId: getOrCreateDeviceId(),
                                bankName: name,
                                bankAccount: acc,
                              }),
                            })
                            setSession(prev => ({ ...prev, bank_name: name, bank_account: acc }))
                          }
                        } finally {
                          setIsLoading(false)
                        }
                      }}
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lưu tài khoản chung'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[13px] font-black uppercase tracking-wider text-white/50">Tính tiền & Giảm giá</h3>
              <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                <button type="button" className={`text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all ${hostTab === 'total' ? 'bg-white/10 text-white' : 'text-white/30'}`} onClick={() => setHostTab('total')}>Tổng tiền</button>
                <button type="button" className={`text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all ${hostTab === 'detail' ? 'bg-white/10 text-white' : 'text-white/30'}`} onClick={() => setHostTab('detail')}>Chi tiết</button>
              </div>
            </div>

            <div className="min-h-[200px]">
              {hostTab === 'total' && (() => {
                const itemsGrandTotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
                const handleFinalTotalSubmit = async (e: React.FormEvent) => {
                  e.preventDefault()
                  setIsLoading(true)
                  try {
                    if (session.is_split_batch) {
                      const newConfigs: Record<string, any> = { ...((session.batch_configs as Record<string, any>) || {}) }
                      uniqueBatches.forEach(batch => {
                        const val = batchFinalTotals[batch]
                        if (val && Number(val) >= 0) {
                          const bTotal = Number(val)
                          const bItemsTotal = orderItems.filter(i => (i.batch_group || 'Đơn 1') === batch).reduce((s, i) => s + i.price * i.quantity, 0)
                          if (bTotal >= bItemsTotal) newConfigs[batch] = { type: 'amount', value: 0, ship: bTotal - bItemsTotal }
                          else newConfigs[batch] = { type: 'amount', value: bItemsTotal - bTotal, ship: 0 }
                        }
                      })
                      await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: newConfigs }) })
                      setSession(prev => ({ ...prev, batch_configs: newConfigs }))
                      setHostControlsOpen(false)
                    } else {
                      const total = Number(finalTotal)
                      if (!total || total < 0) return
                      const discountValue = total < itemsGrandTotal ? itemsGrandTotal - total : 0
                      const shippingFee = total > itemsGrandTotal ? total - itemsGrandTotal : 0
                      await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), discountType: 'amount', discountValue, shippingFee }) })
                      setSession(prev => ({ ...prev, discount_value: discountValue, shipping_fee: shippingFee }))
                      setHostControlsOpen(false)
                    }
                  } finally {
                    setIsLoading(false)
                  }
                }
                return (
                  <form onSubmit={handleFinalTotalSubmit} className="flex flex-col gap-4">
                    {session.is_split_batch ? (
                      <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
                        {uniqueBatches.map(batch => {
                          const bItemsTotal = orderItems.filter(i => (i.batch_group || 'Đơn 1') === batch).reduce((s, i) => s + i.price * i.quantity, 0)
                          const val = batchFinalTotals[batch] || ''
                          return (
                            <div key={batch} className="flex flex-col gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center h-6">
                            {editingBatchName === batch ? (
                              <div className="flex items-center gap-1 flex-1">
                                <Input
                                  autoFocus
                                  className="h-7 text-xs bg-black/40 border-sky-500/30 px-2 flex-1"
                                  value={batchNameDraft}
                                  onChange={e => setBatchNameDraft(e.target.value)}
                                  onKeyDown={async e => {
                                    if (e.key === 'Enter' && batchNameDraft && batchNameDraft !== batch) {
                                      setIsLoading(true)
                                      try {
                                        const newBatchName = batchNameDraft.trim() || 'Đơn 1'
                                        // Update batch_configs
                                        const currentConfigs = (session.batch_configs as Record<string, any>) || {}
                                        const newConfigs = { ...currentConfigs }
                                        if (newConfigs[batch]) {
                                          newConfigs[newBatchName] = newConfigs[batch]
                                          delete newConfigs[batch]
                                        }
                                        // Update session
                                        await fetch(`/api/sessions/${session.slug}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: newConfigs }),
                                        })
                                        setSession(prev => ({ ...prev, batch_configs: newConfigs }))
                                        // Update all items in this batch
                                        const itemsToUpdate = orderItems.filter(i => (i.batch_group || 'Đơn 1') === batch)
                                        await Promise.all(itemsToUpdate.map(item =>
                                          fetch(`/api/order-items/${item.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ batch_group: newBatchName }),
                                          })
                                        ))
                                        setEditingBatchName(null)
                                      } finally {
                                        setIsLoading(false)
                                      }
                                    } else if (e.key === 'Escape') {
                                      setEditingBatchName(null)
                                    }
                                  }}
                                  onBlur={() => setEditingBatchName(null)}
                                />
                              </div>
                            ) : (
                              <span
                                className="text-xs font-black text-emerald-400 uppercase cursor-pointer hover:text-emerald-300 flex items-center gap-1 group/batch"
                                onClick={() => { setEditingBatchName(batch); setBatchNameDraft(batch) }}
                                title="Bấm để đổi tên"
                              >
                                {batch}
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/batch:opacity-50 transition-opacity" />
                              </span>
                            )}
                            <span className="text-xs font-bold text-white/40">Món: {formatVND(bItemsTotal)}</span>
                          </div>
                              <Input placeholder="Tiền thực trả" type="number" className="h-11 bg-black/40" value={val} onChange={e => setBatchFinalTotals(prev => ({ ...prev, [batch]: e.target.value }))} />
                            </div>
                          )
                        })}
                        {showNewBatch ? (
                          <div className="bg-white/5 p-3.5 rounded-2xl border border-dashed border-sky-500/30 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between gap-3">
                              <div className="relative w-40">
                                <Input
                                  autoFocus
                                  placeholder="Tên đơn mới..."
                                  className="h-9 text-xs bg-black/40 border-none"
                                  value={newBatchDraft}
                                  onChange={e => setNewBatchDraft(e.target.value)}
                                  onKeyDown={async e => {
                                    if (e.key === 'Enter' && newBatchDraft && !uniqueBatches.includes(newBatchDraft)) {
                                      setIsLoading(true)
                                      try {
                                        const currentConfigs = (session.batch_configs as Record<string, any>) || {}
                                        const newConfigs = { ...currentConfigs, [newBatchDraft]: { type: 'amount', value: 0, ship: 0 } }
                                        await fetch(`/api/sessions/${session.slug}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: newConfigs }),
                                        })
                                        setSession(prev => ({ ...prev, batch_configs: newConfigs }))
                                        setNewBatchDraft('')
                                        setShowNewBatch(false)
                                      } finally {
                                        setIsLoading(false)
                                      }
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-9 px-6 text-xs font-bold"
                                  disabled={!newBatchDraft || uniqueBatches.includes(newBatchDraft) || isLoading}
                                  onClick={async () => {
                                    setIsLoading(true)
                                    try {
                                      const currentConfigs = (session.batch_configs as Record<string, any>) || {}
                                      const newConfigs = { ...currentConfigs, [newBatchDraft]: { type: 'amount', value: 0, ship: 0 } }
                                      await fetch(`/api/sessions/${session.slug}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: newConfigs }),
                                      })
                                      setSession(prev => ({ ...prev, batch_configs: newConfigs }))
                                      setNewBatchDraft('')
                                      setShowNewBatch(false)
                                    } finally {
                                      setIsLoading(false)
                                    }
                                  }}
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Thêm đơn'}
                                </Button>
                                <button type="button" onClick={() => setShowNewBatch(false)} className="p-2 text-white/30 hover:text-white/60 shrink-0">
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setShowNewBatch(true)} className="w-full h-12 rounded-2xl border-2 border-dashed border-white/5 text-white/30 flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
                            <Plus className="w-4 h-4" /> Thêm đợt đơn mới
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-5 bg-white/5 rounded-2xl text-center">
                          <p className="text-[10px] text-white/30 uppercase">Tổng giá món ăn</p>
                          <p className="text-3xl font-black text-white">{formatVND(itemsGrandTotal)}</p>
                        </div>
                        <Input id="finalTotal" label="Số tiền thực trả" type="number" className="h-12 bg-black/40" value={finalTotal} onChange={e => setFinalTotal(e.target.value)} />
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setHostControlsOpen(false)}>Huỷ</Button>
                      <Button type="submit" disabled={isLoading} className="flex-[2] h-12">Áp dụng</Button>
                    </div>
                  </form>
                )
              })()}

              {hostTab === 'detail' && (() => {
                if (!session.is_split_batch) {
                  return (
                    <form onSubmit={discountForm.handleSubmit(updateDiscountShip)} className="flex flex-col gap-4">
                      <Input id="discountValue" label="Giá trị giảm" type="number" {...discountForm.register('discountValue')} />
                      <Input id="shippingFee" label="Phí ship" type="number" {...discountForm.register('shippingFee')} />
                      <DialogFooter><Button type="submit" disabled={isLoading}>Lưu</Button></DialogFooter>
                    </form>
                  )
                } else {
                  const uniqueBatches = Array.from(new Set(orderItems.map(i => i.batch_group || 'Đơn 1')))
                  if (uniqueBatches.length === 0) uniqueBatches.push('Đơn 1')
                  const currentConfigs = (session.batch_configs as Record<string, any>) || {}
                  const updateBatchConfig = async (e: React.FormEvent) => {
                    e.preventDefault(); setIsLoading(true)
                    const formData = new FormData(e.target as HTMLFormElement)
                    const newConfigs: Record<string, any> = {}
                    uniqueBatches.forEach(batch => {
                      newConfigs[batch] = { type: 'amount', value: Number(formData.get(`value_${batch}`)), ship: Number(formData.get(`ship_${batch}`)) }
                    })
                    await fetch(`/api/sessions/${session.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostDeviceId: getOrCreateDeviceId(), batchConfigs: newConfigs }) })
                    setHostControlsOpen(false); setIsLoading(false)
                  }
                  return (
                    <form onSubmit={updateBatchConfig} className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto">
                      {uniqueBatches.map(batch => {
                        const cfg = currentConfigs[batch] || { value: 0, ship: 0 }
                        return (
                          <div key={batch} className="flex flex-col gap-3 bg-white/5 p-3 rounded-xl border border-white/5 relative">
                            <span className="text-xs font-bold text-sky-400">{batch}</span>
                            <div className="grid grid-cols-2 gap-3">
                              <Input name={`value_${batch}`} label="Giảm" type="number" defaultValue={cfg.value} />
                              <Input name={`ship_${batch}`} label="Ship" type="number" defaultValue={cfg.ship} />
                            </div>
                          </div>
                        )
                      })}
                      <DialogFooter><Button type="submit" disabled={isLoading}>Lưu tất cả</Button></DialogFooter>
                    </form>
                  )
                }
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name Entry Modal */}
      <Dialog open={nameModalOpen} onOpenChange={() => { }}>
        <DialogContent className="[&>button:last-child]:hidden">
          <DialogHeader><DialogTitle>👋 Bạn là ai?</DialogTitle><DialogDescription>Nhập tên để tham gia</DialogDescription></DialogHeader>
          <Input id="joinName" label="Tên của bạn" placeholder="Hùng, An, Bình..." onChange={e => nameInputRef.current = e.target.value} onKeyDown={e => e.key === 'Enter' && claimName(nameInputRef.current)} autoFocus />
          <DialogFooter><Button onClick={() => claimName(nameInputRef.current)} disabled={isLoading} className="w-full">Tham gia →</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Confirm Modal */}
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>🤔 Đây có phải là bạn?</DialogTitle><DialogDescription>Tên &ldquo;{claimCandidate?.name}&rdquo; đã có trong đơn.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => { setClaimModalOpen(false); setNameModalOpen(true) }}>Không, tôi khác</Button><Button onClick={confirmClaim}>Đúng là tôi!</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Modal */}
      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>🏦 Thông tin ngân hàng</DialogTitle><DialogDescription>Nhập để mọi người chuyển khoản.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4">
            <Select value={bankNameInput} onValueChange={setBankNameInput}><SelectTrigger id="bankNameModal"><SelectValue placeholder="Chọn ngân hàng..." /></SelectTrigger><SelectContent>{BANK_OPTIONS.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}</SelectContent></Select>
            <QRScannerSection isScanningLive={isScanningLive} hasConfirmedCamera={hasConfirmedCamera} setIsScanningLive={setIsScanningLive} setCameraError={setCameraError} processQRData={processQRData} />
            <Input id="bankAccountModal" label="Số tài khoản" value={bankAccountInput} onChange={e => setBankAccountInput(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBankModalOpen(false)}>Huỷ</Button><Button onClick={saveBankAndLock} disabled={isLoading || !bankNameInput || !bankAccountInput}>Lưu & Chốt đơn</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
