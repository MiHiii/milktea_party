-- Update order_items to cascade delete when a batch is deleted
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_order_batch_id_fkey,
ADD CONSTRAINT order_items_order_batch_id_fkey 
    FOREIGN KEY (order_batch_id) 
    REFERENCES order_batches(id) 
    ON DELETE CASCADE;
