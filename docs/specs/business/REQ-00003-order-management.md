# 📋 SPEC: Order Management & Batching
> **Registry IDs:** REQ-00003, REQ-00007, REQ-00008, REQ-00015
> **Owner:** /ba | **Version:** 1.0 | **Date:** 2026-03-25
> **Depends on:** `milktea-logic.md` §4 (Operations Logic)

---

## 1. Tổng quan

Spec này mô tả toàn bộ luồng quản lý đơn hàng: từ việc Guest thêm/sửa/xóa món, đến cơ chế gom đơn theo đợt (Batch), thanh toán riêng (Pay Separate), chống đặt trùng (Idempotency), và quyền Host sửa/xóa món Guest khi phòng đã khóa.

---

## 2. REQ-00003: OrderBatch & Grouping Logic (Refined)

### 2.1 Cơ chế Chuyển đổi (Conversion Logic)
Hệ thống linh hoạt chuyển đổi giữa đơn lẻ và đa đơn:
- **Bật Chia đơn:** Khi Host kích hoạt, hệ thống tạo "Đơn 1" làm mặc định và gom toàn bộ món hiện tại vào đó.
- **Tắt Chia đơn:** Xóa các đợt đơn, đưa toàn bộ món về trạng thái không thuộc Batch (null).

### 2.2 Quản lý Batch (Host Permissions)
- Host có quyền thêm/sửa/xóa các đợt đơn.
- Khi xóa một đợt đơn, các món bên trong tự động được chuyển về **Batch mặc định**.
- Mỗi Batch có: Tên, Thông tin ngân hàng riêng, Voucher riêng, và Phí ship riêng.

### 2.3 Phân bổ chi phí theo Batch
Đây là thay đổi quan trọng phục vụ REQ-00004:
- Voucher và Phí Ship được thiết lập **riêng cho từng Batch**.
- Một người tham gia vào nhiều Batch sẽ có bill cá nhân tổng hợp từ các Batch đó.
- Món `pay_separate = true` không thuộc bất kỳ Batch nào.

### 2.4 Data Model bổ sung
```sql
ALTER TABLE order_batches 
ADD COLUMN discount_amount BIGINT DEFAULT 0,
ADD COLUMN shipping_fee BIGINT DEFAULT 0;
```

### 2.4 API liên quan

| API | Endpoint | Mô tả |
|:---|:---|:---|
| API-00007 | `POST /api/order-batches` | Tạo batch mới |
| API-00017 | `GET /api/order-batches/session/:sid` | Liệt kê batch |
| API-00018 | `PUT /api/order-batches/:id` | Sửa batch info |
| API-00019 | `DELETE /api/order-batches/:id` | Xóa batch |

### 2.5 Acceptance Criteria
```gherkin
Given Session với is_split_batch = false
When Host bật "Chia đơn"
Then tạo 1 Batch mặc định "Đơn 1" (is_default=true)
And toàn bộ OrderItem.order_batch_id cập nhật vào Batch này

Given Session có 2 Batch
When Guest thêm món mới
Then món mới thuộc Batch mặc định (is_default=true)
```

---

## 3. REQ-00007: Pay Separate (Thanh toán riêng)

### 3.1 Mô tả

Một OrderItem có thể được đánh dấu `pay_separate = true`. Khi đó:
- **KHÔNG** tham gia phân bổ Voucher/Ship chung
- **KHÔNG** nằm trong Bill Batch của nhóm
- Có QR thanh toán riêng biệt
- Người đặt món tự chịu 100% giá gốc

### 3.2 Ví dụ tính toán

| Món | Người đặt | Giá | Qty | pay_separate | Tham gia phân bổ? |
|:---|:---|:---|:---|:---:|:---:|
| Trà sữa | Minh | 35.000 | 1 | ❌ | ✅ |
| Cà phê | Lan | 30.000 | 1 | ❌ | ✅ |
| **Bánh sinh nhật** | **Hùng** | **200.000** | **1** | **✅** | **❌** |

→ `T_base` = 35.000 + 30.000 = **65.000** (không tính bánh sinh nhật)
→ Voucher/Ship chỉ phân bổ trên 65.000
→ Hùng trả riêng 200.000 cho bánh sinh nhật

### 3.3 Việc cần làm cho /dev

**Backend:**
- Khi tính bill (API-00011 `/calculate`): **Lọc bỏ** items có `pay_separate = true` khỏi `T_base`
- Tạo QR riêng cho từng item `pay_separate = true`
- Validation: Không cho phép đặt `pay_separate = true` sau khi session LOCKED

**Frontend:**
- Toggle switch "Thanh toán riêng" bên cạnh mỗi món
- Hiển thị rõ ràng: món nào thanh toán riêng → highlight bằng badge/icon
- Trên màn hình Settlement: tách group "Thanh toán riêng" ra phía trên

### 3.4 Acceptance Criteria
```gherkin
Given OrderItem "Bánh sinh nhật" có pay_separate = true
When hệ thống tính bill
Then "Bánh sinh nhật" có QR riêng = 200.000đ
And Voucher/Ship không phân bổ vào món này

Given Session ở trạng thái LOCKED
When Guest cố bật pay_separate cho một món
Then nhận lỗi "Không thể thay đổi khi phòng đã khóa"
```

---

## 4. REQ-00008: Idempotency (Chống đặt trùng)

### 4.1 Mô tả

Mọi request tạo/sửa/xóa OrderItem phải gửi kèm `Idempotency-Key` header (UUID) để:
- Tránh tạo trùng món khi mạng lag (user bấm nhiều lần)
- Đảm bảo tính nhất quán dữ liệu

### 4.2 Hiện trạng code

- **Service interface** ĐÃ CÓ tham số `idempotencyKey string` ✅
  - `Create(ctx, item, idempotencyKey)`
  - `Update(ctx, item, idempotencyKey)`
  - `Delete(ctx, id, idempotencyKey)`

### 4.3 Cơ chế hoạt động

```
Client                                Server
  │                                      │
  │  POST /api/order-items               │
  │  Idempotency-Key: "abc-123"          │
  │  Body: { itemName: "Trà sữa" }      │
  │─────────────────────────────────────►│
  │                                      │── Check DB: "abc-123" đã tồn tại?
  │                                      │   ├─ Chưa → Tạo mới, lưu key
  │                                      │   └─ Rồi  → Trả về kết quả cũ (200 OK)
  │  201 Created / 200 OK               │
  │◄─────────────────────────────────────│
```

### 4.4 Việc cần làm cho /dev

**Backend:**
- Tạo bảng `idempotency_keys`:
```sql
CREATE TABLE idempotency_keys (
    key         VARCHAR(255) PRIMARY KEY,
    response    JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Auto-cleanup keys > 24h
CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at);
```

- Trong service: trước khi tạo item, check `idempotency_keys` table
- Nếu key đã tồn tại → return response cũ
- Nếu chưa → tạo item + lưu key + response

**Frontend:**
- Mỗi lần bấm "Thêm món" → generate `crypto.randomUUID()` làm `Idempotency-Key`
- Gửi kèm header: `Idempotency-Key: <uuid>`
- Nếu đang loading → disable nút bấm (UX layer)

### 4.5 Acceptance Criteria
```gherkin
Given Guest bấm "Thêm món" 2 lần liên tiếp (mạng lag)
When cả 2 request có cùng Idempotency-Key
Then chỉ tạo 1 OrderItem
And request thứ 2 trả về 200 OK (không phải 201)

Given Idempotency-Key "xyz-789" đã quá 24 giờ
When cleanup job chạy
Then key bị xóa khỏi bảng
```

---

## 5. REQ-00015: Host Edit/Delete Guest Items (khi LOCKED)

### 5.1 Mô tả

Khi Session ở trạng thái LOCKED hoặc ORDERED, Host có quyền:
- **Sửa giá** OrderItem (do quán đổi giá so với menu online)
- **Xóa** OrderItem (do quán hết món)
- **Sửa tên món** (do ghi nhầm)

Guest KHÔNG có quyền này ở trạng thái LOCKED.

### 5.2 Phân quyền chi tiết

| Hành động | Guest (OPEN) | Guest (LOCKED+) | Host (OPEN) | Host (LOCKED) | Host (ORDERED) |
|:---|:---:|:---:|:---:|:---:|:---:|
| Thêm món | ✅ | ❌ | ✅ | ❌ | ❌ |
| Sửa món của mình | ✅ | ❌ | ✅ | ✅ | ✅ |
| Xóa món của mình | ✅ | ❌ | ✅ | ✅ | ✅ |
| Sửa món **của Guest** | ❌ | ❌ | ❌ | ✅ | ✅ (giá) |
| Xóa món **của Guest** | ❌ | ❌ | ❌ | ✅ | ❌ |

### 5.3 Việc cần làm cho /dev

**Backend (`order_item_handler.go` / `order_item_service.go`):**
- Khi `PUT /api/order-items/:id` hoặc `DELETE /api/order-items/:id`:
  1. Lấy `X-Device-ID` từ header
  2. Lấy OrderItem → lấy Session
  3. Kiểm tra:
     - Nếu `session.status == "open"` → cho phép Owner của item (participant.device_id == X-Device-ID)
     - Nếu `session.status == "locked"/"ordered"` → chỉ cho phép Host (`session.host_device_id == X-Device-ID`)
  4. Nếu không phải owner hoặc host → return `403 Forbidden`

```go
func (s *orderItemService) Update(ctx context.Context, item *domain.OrderItem, idempotencyKey string) error {
    // Lấy session
    session, _ := s.sessionRepo.GetByID(ctx, item.SessionID)
    deviceID := ctx.Value("deviceID").(uuid.UUID)
    
    switch session.Status {
    case "open":
        // Chỉ owner mới được sửa
        participant, _ := s.participantRepo.GetByID(ctx, item.ParticipantID)
        if participant.DeviceID != deviceID {
            return ErrForbidden
        }
    case "locked", "ordered":
        // Chỉ Host mới được sửa
        if session.HostDeviceID != deviceID {
            return ErrForbidden
        }
    default:
        return ErrSessionNotEditable
    }
    // ... proceed with update
}
```

### 5.4 Acceptance Criteria
```gherkin
Given Session LOCKED, Host muốn sửa giá món "Trà sữa" của Guest Lan
When Host gọi PUT /api/order-items/:id với price mới
Then giá được cập nhật thành công
And Guest Lan nhận thông báo realtime "Host đã sửa giá món của bạn"

Given Session LOCKED, Guest Lan muốn sửa món của mình
When Lan gọi PUT /api/order-items/:id
Then nhận lỗi 403 "Phòng đã khóa, chỉ Host mới được sửa"
```

---

## 6. Validation Rules (BUG-00001 fix)

> ⚠️ **BUG-00001:** API-00005 cho phép quantity ≤ 0

**Backend validation cần áp dụng cho mọi OrderItem:**

```go
func validateOrderItem(item *domain.OrderItem) error {
    if item.Quantity <= 0 {
        return errors.New("quantity must be greater than 0")
    }
    if item.Price < 0 {
        return errors.New("price cannot be negative")
    }
    if strings.TrimSpace(item.ItemName) == "" {
        return errors.New("item name is required")
    }
    if len(item.ItemName) > 255 {
        return errors.New("item name too long")
    }
    return nil
}
```

---
*Spec này là nguồn chân lý cho /dev. Mọi thắc mắc liên hệ /ba.*


