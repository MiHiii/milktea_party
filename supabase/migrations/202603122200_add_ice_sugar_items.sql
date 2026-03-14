-- Migration: Add separate columns for Ice and Sugar to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS ice TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sugar TEXT;
