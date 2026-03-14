-- Add pay_separate column to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS pay_separate BOOLEAN DEFAULT FALSE;
