export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Domain Types ──────────────────────────────────────────────────────────

export interface Session {
  id: string
  slug: string
  title: string
  host_device_id: string
  shop_link: string | null
  bank_name: string | null
  bank_account: string | null
  qr_payload: string | null
  status: 'open' | 'locked' | 'paid'
  discount_type: 'amount' | 'percent'
  discount_value: number
  shipping_fee: number
  batch_configs: Json
  is_split_batch: boolean
  has_password?: boolean
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  name: string
  is_host: boolean
  is_paid: boolean
  last_active: string
}

export interface OrderItem {
  id: string
  participant_id: string
  session_id: string
  item_name: string
  price: number
  quantity: number
  note: string | null
  ice: string | null
  sugar: string | null
  batch_group: string
  pay_separate: boolean
  created_at: string
}

export interface ParticipantWithItems extends Participant {
  order_items: OrderItem[]
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

// ─── Supabase Database type (used for typed client) ───────────────────────

type SessionInsert = Omit<Session, 'id' | 'created_at' | 'qr_payload' | 'bank_name' | 'bank_account' | 'shop_link'> & Partial<Pick<Session, 'qr_payload' | 'bank_name' | 'bank_account' | 'shop_link'>>
type SessionUpdate = Partial<SessionInsert>

type ParticipantInsert = Omit<Participant, 'id' | 'last_active'> & Partial<Pick<Participant, 'last_active'>>
type ParticipantUpdate = Partial<ParticipantInsert>

type OrderItemInsert = Omit<OrderItem, 'id' | 'created_at' | 'note'> & Partial<Pick<OrderItem, 'note'>>
type OrderItemUpdate = Partial<OrderItemInsert>

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: Session
        Insert: SessionInsert
        Update: SessionUpdate
        Relationships: []
      }
      participants: {
        Row: Participant
        Insert: ParticipantInsert
        Update: ParticipantUpdate
        Relationships: []
      }
      order_items: {
        Row: OrderItem
        Insert: OrderItemInsert
        Update: OrderItemUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
