-- 1. Cập nhật bảng order_batches
ALTER TABLE order_batches 
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Thêm check constraint nếu chưa có (dùng do block để tránh lỗi nếu đã tồn tại)
DO $$ 
BEGIN 
    ALTER TABLE order_batches ADD CONSTRAINT order_batches_status_check CHECK (status IN ('open', 'locked', 'paid'));
EXCEPTION 
    WHEN duplicate_object THEN null; 
END $$;

-- Đánh dấu batch đầu tiên hiện có là default (dựa trên created_at cũ nhất)
UPDATE order_batches ob
SET is_default = true
WHERE ob.id = (
  SELECT id FROM order_batches 
  WHERE session_id = ob.session_id 
  ORDER BY created_at ASC LIMIT 1
);

-- 2. Cập nhật bảng sessions
ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS use_default_qr_for_all boolean NOT NULL DEFAULT true;

ALTER COLUMN is_split_batch SET DEFAULT false;

-- Fix dữ liệu cũ
UPDATE sessions SET is_split_batch = false WHERE is_split_batch IS NULL;

-- 3. Function to handle atomic split batch toggle
CREATE OR REPLACE FUNCTION toggle_session_split_batch(
    target_session_id uuid,
    is_enabling boolean
) RETURNS void AS $$
DECLARE
    default_batch_id uuid;
BEGIN
    IF is_enabling THEN
        -- Action ON: Tìm hoặc tạo batch mặc định
        SELECT id INTO default_batch_id 
        FROM order_batches 
        WHERE session_id = target_session_id AND is_default = true 
        LIMIT 1;

        IF default_batch_id IS NULL THEN
            INSERT INTO order_batches (session_id, name, is_default, sort_order)
            VALUES (target_session_id, 'Đơn 1', true, 0)
            RETURNING id INTO default_batch_id;
        END IF;

        -- Di chuyển các món đang ở Batch NULL sang Batch mặc định
        UPDATE order_items 
        SET order_batch_id = default_batch_id
        where session_id = target_session_id and order_batch_id is null;
        
    ELSE
        -- Action OFF: Chuyển tất cả về mặc định và xóa các batch phụ
        SELECT id INTO default_batch_id 
        FROM order_batches 
        WHERE session_id = target_session_id AND is_default = true 
        LIMIT 1;

        IF default_batch_id IS NOT NULL THEN
            -- Chuyển tất cả món về mặc định
            UPDATE order_items 
            SET order_batch_id = default_batch_id
            WHERE session_id = target_session_id;
            
            -- Xóa các batch không phải mặc định
            DELETE FROM order_batches 
            WHERE session_id = target_session_id AND is_default = false;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
