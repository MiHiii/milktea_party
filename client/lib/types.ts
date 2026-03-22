export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Domain Types ──────────────────────────────────────────────────────────

export interface OrderBatch {
  id: string
  sessionId: string
  name: string
  bankName: string | null
  bankAccount: string | null
  qrPayload: string | null
  status: 'open' | 'locked' | 'paid'
  isDefault: boolean
  sortOrder: number
  createdAt: string
}

export interface Session {
  id: string
  slug: string
  roomId: string
  title: string
  hostDeviceId: string
  shopLink: string | null
  hostDefaultBankName: string | null
  hostDefaultBankAccount: string | null
  hostDefaultQrPayload: string | null
  status: 'open' | 'locked' | 'paid'
  discountType: 'amount' | 'percent'
  discountValue: number
  shippingFee: number
  batchConfigs: Json
  isSplitBatch: boolean
  useDefaultQrForAll: boolean
  hasPassword?: boolean
  password?: string | null // For session creation/verification
  createdAt: string
}

export interface Participant {
  id: string
  sessionId: string
  deviceId: string
  name: string
  isHost: boolean
  isPaid: boolean
  lastActive: string
}

export interface OrderItem {
  id: string
  participantId: string
  sessionId: string
  orderBatchId: string | null
  itemName: string
  price: number
  quantity: number
  note: string | null
  ice: string | null
  sugar: string | null
  paySeparate: boolean
  createdAt: string
}

export interface ParticipantWithItems extends Participant {
  orderItems: OrderItem[]
}

export interface ItemBill {
  item: OrderItem
  subtotal: number
  discountAmount: number
  shippingShare: number
  total: number
}

export interface BillEntry {
  participant: Participant
  subtotal: number
  discountAmount: number
  shippingShare: number
  total: number
  items: ItemBill[]
}

// ─── API Request Types ───────────────────────────────────────────────────

export interface CreateSessionRequest extends Partial<Session> {
  hostName: string
  password?: string | null
}

// ─── Supabase Database type (used for legacy compatibility if needed) ───────────

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: Session
        Insert: any
        Update: any
        Relationships: []
      }
      order_batches: {
        Row: OrderBatch
        Insert: any
        Update: any
        Relationships: []
      }
    }
  }
}
