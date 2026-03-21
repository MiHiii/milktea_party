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
  session_id: string
  name: string
  bank_name: string | null
  bank_account: string | null
  qr_payload: string | null
  status: 'open' | 'locked' | 'paid'
  is_default: boolean
  sort_order: number
  created_at: string
}

export interface Session {
  id: string
  slug: string
  title: string
  host_device_id: string
  shop_link: string | null
  host_default_bank_name: string | null
  host_default_bank_account: string | null
  host_default_qr_payload: string | null
  status: 'open' | 'locked' | 'paid'
  discount_type: 'amount' | 'percent'
  discount_value: number
  shipping_fee: number
  batch_configs: Json
  is_split_batch: boolean
  use_default_qr_for_all: boolean
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
  order_batch_id: string | null
  item_name: string
  price: number
  quantity: number
  note: string | null
  ice: string | null
  sugar: string | null
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
      participants: {
        Row: Participant
        Insert: any
        Update: any
        Relationships: []
      }
      order_items: {
        Row: OrderItem
        Insert: any
        Update: any
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
