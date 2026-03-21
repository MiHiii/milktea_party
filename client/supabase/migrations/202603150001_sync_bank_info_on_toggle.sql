-- Cập nhật hàm toggle_session_split_batch với logic copy bank info
CREATE OR REPLACE FUNCTION toggle_session_split_batch(
    target_session_id uuid,
    is_enabling boolean
) RETURNS void AS $$
DECLARE
    default_batch_id uuid;
    s_bank_name text;
    s_bank_acc text;
    s_qr text;
    b_bank_name text;
    b_bank_acc text;
    b_qr text;
BEGIN
    -- Lấy thông tin từ session
    SELECT host_default_bank_name, host_default_bank_account, host_default_qr_payload 
    INTO s_bank_name, s_bank_acc, s_qr
    FROM sessions WHERE id = target_session_id;

    IF is_enabling THEN
        -- Action ON: Tìm hoặc tạo batch mặc định
        SELECT id, bank_name, bank_account, qr_payload 
        INTO default_batch_id, b_bank_name, b_bank_acc, b_qr
        FROM order_batches 
        WHERE session_id = target_session_id AND is_default = true 
        LIMIT 1;

        IF default_batch_id IS NULL THEN
            -- Tạo Đơn 1 và kế thừa thông tin ngân hàng từ Host
            INSERT INTO order_batches (
                session_id, name, is_default, sort_order,
                bank_name, bank_account, qr_payload
            )
            VALUES (
                target_session_id, 'Đơn 1', true, 0,
                s_bank_name, s_bank_acc, s_qr
            )
            RETURNING id INTO default_batch_id;
        ELSE
            -- Nếu đã có Đơn 1 nhưng trống thông tin, có thể cân nhắc sync từ Host
            IF b_qr IS NULL AND s_qr IS NOT NULL THEN
                UPDATE order_batches 
                SET bank_name = s_bank_name, bank_account = s_bank_acc, qr_payload = s_qr
                WHERE id = default_batch_id;
            END IF;
        END IF;

        -- Di chuyển các món đang ở Batch NULL sang Đơn 1
        UPDATE order_items 
        SET order_batch_id = default_batch_id
        WHERE session_id = target_session_id AND order_batch_id IS NULL;
        
    ELSE
        -- Action OFF: Chuyển tất cả về Đơn 1 và đồng bộ ngược bank info cho Host
        SELECT id, bank_name, bank_account, qr_payload 
        INTO default_batch_id, b_bank_name, b_bank_acc, b_qr
        FROM order_batches 
        WHERE session_id = target_session_id AND is_default = true 
        LIMIT 1;

        IF default_batch_id IS NOT NULL THEN
            -- Cập nhật thông tin Host từ Đơn 1 (Nếu Đơn 1 có data)
            IF b_qr IS NOT NULL THEN
                UPDATE sessions 
                SET host_default_bank_name = b_bank_name, 
                    host_default_bank_account = b_bank_acc, 
                    host_default_qr_payload = b_qr
                WHERE id = target_session_id;
            END IF;

            -- Chuyển tất cả món về Đơn 1
            UPDATE order_items 
            SET order_batch_id = default_batch_id
            WHERE session_id = target_session_id;
            
            -- Xóa các đơn con khác (Cascade delete sẽ lo việc xóa món nếu có, 
            -- nhưng ở đây ta đã chuyển món về Đơn 1 rồi)
            DELETE FROM order_batches 
            WHERE session_id = target_session_id AND is_default = false;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
