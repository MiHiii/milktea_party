-- 1. Dọn dẹp dữ liệu cũ (nếu có trùng lặp)
-- Giữ lại batch mặc định cũ nhất cho mỗi session, các batch mặc định khác chuyển về false
WITH duplicate_defaults AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) as rnk
    FROM order_batches
    WHERE is_default = true
)
UPDATE order_batches
SET is_default = false
WHERE id IN (
    SELECT id FROM duplicate_defaults WHERE rnk > 1
);

-- 2. Thêm Unique Index có điều kiện
-- Index này chỉ áp dụng khi is_default = true, cho phép nhiều is_default = false trong cùng session
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_batch_per_session 
ON order_batches (session_id) 
WHERE (is_default = true);
