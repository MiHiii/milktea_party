SET search_path TO milktea;

ALTER TABLE order_batches 
ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0,
ADD COLUMN shipping_fee BIGINT NOT NULL DEFAULT 0;

-- Index for faster lookups when migrating items
CREATE INDEX idx_order_items_batch_id ON order_items(order_batch_id);
