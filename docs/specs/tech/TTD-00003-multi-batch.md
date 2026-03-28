# 🏗️ TTD-00003: Multi-batch Transition & Order Grouping

**Status:** `DRAFT` | **Owner:** /architect | **Date:** 2026-03-28
**Reference:** [REQ-00003 Refined](docs/specs/business/REQ-00003-order-management.md#2-req-00003-orderbatch--grouping-logic-refined)

---

## 1. Database Schema Changes
Bổ sung các cột quản lý tài chính cho từng đợt đơn.

```sql
ALTER TABLE order_batches 
ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0,
ADD COLUMN shipping_fee BIGINT NOT NULL DEFAULT 0;
```

## 2. Luồng Chuyển đổi Trạng thái (Transition Flow)

Toàn bộ logic chuyển đổi phải được thực hiện trong **Database Transaction** (`Serializable` hoặc `Read Committed` với `FOR UPDATE` lock trên Session).

### 2.1 Bật chế độ đa đơn (Toggle ON)
1. **Lock Session:** `SELECT * FROM sessions WHERE id = ? FOR UPDATE`.
2. **Create Default Batch:** Tạo bản ghi `order_batches` với `name = 'Đơn 1'`, `is_default = true`.
3. **Migrate Items:** Cập nhật toàn bộ `order_items` của session này, set `order_batch_id` thành ID của batch vừa tạo.
4. **Update Session:** Set `is_split_batch = true`.

### 2.2 Tắt chế độ đa đơn (Toggle OFF)
1. **Validation:** Chỉ cho phép nếu `session.status == 'open'`.
2. **Clear Items:** Cập nhật toàn bộ `order_items`, set `order_batch_id = NULL`.
3. **Cleanup:** Xóa toàn bộ `order_batches` thuộc session.
4. **Update Session:** Set `is_split_batch = false`.

## 3. Quản lý Batch và Di chuyển món

### 3.1 Xóa Batch (Hành động dự phòng)
- Khi một Batch bị xóa, hệ thống **không xóa món**.
- Tất cả `order_items` thuộc Batch đó phải được di chuyển sang Batch có `is_default = true`.
- Nếu không tìm thấy Batch mặc định (lỗi logic), hệ thống phải tự động chỉ định Batch còn lại sớm nhất làm mặc định.

## 4. API Endpoints

### `POST /api/order-batches`
- **Body:**
```json
{
  "sessionId": "uuid",
  "name": "string",
  "discountAmount": "int64",
  "shippingFee": "int64"
}
```

### `PUT /api/order-batches/:id`
Cho phép cập nhật linh hoạt tên và chi phí của từng đợt đơn.

## 5. WebSocket Broadcasting
Để tối ưu hiệu năng, không broadcast cho từng món bị di chuyển. Chỉ gửi một event duy nhất:
- `type: "batch_mode_changed"`
- `payload: { "isSplitBatch": boolean, "batches": [...] }`

---
*TTD này là cơ sở để thực hiện nâng cấp REQ-00003.*
