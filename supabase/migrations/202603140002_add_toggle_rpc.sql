-- Function to handle atomic split batch toggle
create or replace function toggle_session_split_batch(
    target_session_id uuid,
    is_enabling boolean
) returns void as $$
declare
    default_batch_id uuid;
begin
    if is_enabling then
        -- 1. Tìm hoặc tạo batch mặc định
        select id into default_batch_id 
        from order_batches 
        where session_id = target_session_id and is_default = true 
        limit 1;

        if default_batch_id is null then
            insert into order_batches (session_id, name, is_default)
            values (target_session_id, 'Đơn 1', true)
            returning id into default_batch_id;
        end if;

        -- 2. Di chuyển các món đang ở Batch NULL sang Batch mặc định
        update order_items 
        set order_batch_id = default_batch_id
        where session_id = target_session_id and order_batch_id is null;
        
    else
        -- Action OFF: Chuyển tất cả về mặc định và xóa các batch phụ
        select id into default_batch_id 
        from order_batches 
        where session_id = target_session_id and is_default = true 
        limit 1;

        if default_batch_id is not null then
            -- Chuyển tất cả món về mặc định
            update order_items 
            set order_batch_id = default_batch_id
            where session_id = target_session_id;
            
            -- Xóa các batch không phải mặc định
            delete from order_batches 
            where session_id = target_session_id and is_default = false;
        end if;
    end if;
end;
$$ language plpgsql security definer;
