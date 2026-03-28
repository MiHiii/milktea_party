# 📋 SPEC: Session Lifecycle & Access Control
> **Registry IDs:** REQ-00001, REQ-00009, REQ-00010, REQ-00014, REQ-00019
> **Owner:** /ba | **Version:** 1.0 | **Date:** 2026-03-25
> **Depends on:** `milktea-logic.md` §2 (State Machine)

---

## 1. Tổng quan (Overview)

Session là đơn vị trung tâm của hệ thống Milktea Party. Spec này mô tả:
- Vòng đời trạng thái (State Machine) của một Session
- Cơ chế bảo vệ phòng bằng mật khẩu
- Đa dạng hóa cách tham gia phòng
- Tự động dọn dẹp session cũ

---

## 2. REQ-00001: Session State Machine (6 trạng thái)

### 2.1 Sơ đồ trạng thái

```
┌──────┐    Lock     ┌────────┐    Order    ┌─────────┐   Settle   ┌──────────┐  Complete  ┌───────────┐
│ OPEN │ ──────────► │ LOCKED │ ──────────► │ ORDERED │ ────────► │ SETTLING │ ────────► │ COMPLETED │
└──────┘             └────────┘             └─────────┘           └──────────┘           └───────────┘
   │                    │  ▲                                                                    
   │   Cancel           │  │ Unlock                                                             
   ▼                    ▼  │                                                                   
┌───────────┐    

┌───────────┐                                                                  
│ CANCELLED │◄───│ CANCELLED │                                                                  
└───────────┘    └───────────┘                                                                  
```

### 2.2 Ma trận chuyển trạng thái

| Từ → | OPEN | LOCKED | ORDERED | SETTLING | COMPLETED | CANCELLED |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **OPEN** | - | ✅ | ❌ | ❌ | ❌ | ✅ |
| **LOCKED** | ✅ | - | ✅ | ❌ | ❌ | ✅ |
| **ORDERED** | ❌ | ❌ | - | ✅ | ❌ | ❌ |
| **SETTLING** | ❌ | ❌ | ❌ | - | ✅ | ❌ |
| **COMPLETED** | ❌ | ❌ | ❌ | ❌ | - | ❌ |
| **CANCELLED** | ❌ | ❌ | ❌ | ❌ | ❌ | - |

### 2.3 Quyền hạn theo trạng thái

| Trạng thái | Guest: Thêm/Sửa/Xóa món | Host: Sửa giá/Phí ship | Host: Sửa cấu hình |
|:---|:---:|:---:|:---:|
| **OPEN** | ✅ | ✅ | ✅ |
| **LOCKED** | ❌ | ✅ | ✅ |
| **ORDERED** | ❌ | ✅ (giá thực tế) | ❌ |
| **SETTLING** | ❌ | ❌ | ❌ |
| **COMPLETED** | ❌ | ❌ | ❌ |
| **CANCELLED** | ❌ | ❌ | ❌ |

### 2.4 Hướng dẫn /dev

**Backend (`session_service.go`):**
- Hiện tại `Update()` không validate transition hợp lệ → **Cần bổ sung** hàm `validateTransition(from, to string) error`
- Map các transition hợp lệ vào một `map[string][]string`
- Khi `session.Status` thay đổi → kiểm tra transition trước khi lưu DB.
- **Pessimistic Locking (CRITICAL):** Khi chuyển từ `ORDERED` sang `SETTLING`, phải sử dụng `SELECT ... FOR UPDATE` trong transaction để đảm bảo không có Guest nào chèn thêm món vào phút chót.

```go
// Pseudo-code
var validTransitions = map[string][]string{
    "open":      {"locked", "cancelled"},
    "locked":    {"open", "ordered", "cancelled"},
    "ordered":   {"settling"},
    "settling":  {"completed"},
    "completed": {},
    "cancelled": {},
}

func validateTransition(from, to string) error {
    allowed := validTransitions[from]
    for _, s := range allowed {
        if s == to {
            return nil
        }
    }
    return fmt.Errorf("invalid transition from %s to %s", from, to)
}
```

**Frontend:**
- Tùy theo `session.status` → ẩn/hiện các nút hành động
- OPEN: Hiện nút "Chốt đơn" + "Hủy"
- LOCKED: Hiện nút "Đặt hàng" + "Mở khóa" + "Hủy"
- ORDERED: Hiện nút "Thu tiền"
- SETTLING: Hiện QR + danh sách bill
- COMPLETED/CANCELLED: Chỉ hiện summary, readonly

---

## 3. REQ-00009: Session Password Protection

### 3.1 Mô tả
Host có thể đặt mật khẩu khi tạo phòng. Guest phải nhập đúng mật khẩu mới được vào.

### 3.2 Hiện trạng code
- **Model:** `Session.Password *string` → đã có ✅
- **Model:** `Session.HasPassword bool` (virtual field) → đã có ✅
- **API:** `POST /api/sessions/slug/:slug/verify` → đã đăng ký (API-00009) ✅
- **Service:** `VerifyPassword()` → đã implement ✅ (so sánh plaintext)

### 3.3 Việc cần làm cho /dev

> ⚠️ **Cảnh báo bảo mật:** Password hiện lưu **plaintext** trong DB. Cần chuyển sang **bcrypt hash**.
> ⚠️ **Migration Strategy:** Khi triển khai bcrypt, toàn bộ password plaintext cũ sẽ không thể verify. Cần thực hiện xóa trắng cột `password` hoặc viết migration script reset mật khẩu để tránh lỗi hệ thống.

```go
// Khi tạo session (Create):
import "golang.org/x/crypto/bcrypt"
...
hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
session.Password = str(hashedPassword)

// Khi verify:
err := bcrypt.CompareHashAndPassword([]byte(*session.Password), []byte(inputPassword))
return err == nil, nil
```

**Frontend Flow:**
1. Guest mở link → `GET /api/sessions/slug/:slug`
2. Response có `hasPassword: true` → Hiện dialog nhập mật khẩu
3. Submit → `POST /api/sessions/slug/:slug/verify` body `{ "password": "..." }`
4. Nếu `success: true` → lưu vào `sessionStorage` và cho vào phòng
5. Nếu lỗi → hiện "Sai mật khẩu, thử lại"

### 3.4 Acceptance Criteria
```gherkin
Given Host tạo phòng với password = "abc123"
When Guest truy cập link phòng
Then hiện dialog nhập mật khẩu

Given Guest nhập đúng password "abc123"
When bấm xác nhận
Then được vào phòng và thấy danh sách món

Given Guest nhập sai password
When bấm xác nhận
Then hiện thông báo "Sai mật khẩu"
And không được vào phòng
```

---

## 4. REQ-00010: Multi-Join (Slug / UUID / URL)

### 4.1 Mô tả
Hệ thống hỗ trợ nhiều cách để Guest tham gia phòng:

| Cách vào | Ví dụ | API sử dụng |
|:---|:---|:---|
| **Slug URL** | `milktea.party/s/party-123456` | `GET /api/sessions/slug/:slug` |
| **Room ID** | Nhập mã `ABC123` trên trang chủ | `GET /api/sessions?roomId=ABC123` (cần bổ sung) |
| **Direct Link** | Copy paste full URL | Frontend route `/s/:slug` |
| **QR Code** | Quét mã QR chứa URL | Frontend decode → redirect |

### 4.2 Việc cần làm cho /dev

**Backend:**
- Bổ sung endpoint hoặc query param `GET /api/sessions?roomId=ABC123` để tìm session theo Room ID (6 ký tự)
- Hoặc tạo `GET /api/sessions/room/:roomId` mới

**Frontend:**
- Trang chủ (`page.tsx`) có ô input "Nhập mã phòng" → submit gọi API tìm session
- Nếu tìm thấy → redirect tới `/s/:slug`
- Nếu không tìm thấy → hiện "Không tìm thấy phòng"

### 4.3 Acceptance Criteria
```gherkin
Given Host tạo phòng có roomId = "XYZ789" và slug = "party-123456"
When Guest nhập mã "XYZ789" trên trang chủ
Then redirect tới /s/party-123456

Given Guest quét QR code chứa URL milktea.party/s/party-123456
When mở link trên điện thoại
Then hiển thị trang đặt món của phòng đó
```

---

## 5. REQ-00014: Session CANCELLED State

### 5.1 Mô tả
Host có quyền hủy session ở trạng thái OPEN hoặc LOCKED. Khi hủy:
- Trạng thái chuyển sang `cancelled`
- Tất cả Guest nhận thông báo realtime qua WebSocket
- Session không thể phục hồi (terminal state)

### 5.2 Việc cần làm cho /dev

**Backend (`session_service.go`):**
- Thêm validation: chỉ cho phép OPEN/LOCKED → CANCELLED
- Khi chuyển sang CANCELLED → `hub.Broadcast(sessionID, "session_cancelled", nil)`
- Chỉ Host (kiểm tra `X-Device-ID == session.HostDeviceID`) mới được hủy

**Frontend:**
- Khi nhận WS event `session_cancelled` → hiện overlay toàn màn hình: "Phòng đã bị hủy bởi Host"
- Nút "Về trang chủ" để quay lại

### 5.3 Acceptance Criteria
```gherkin
Given Session ở trạng thái OPEN với 3 Guest đang online
When Host bấm nút "Hủy phòng" và xác nhận
Then session.status = "cancelled"
And 3 Guest nhận thông báo realtime "Phòng đã bị hủy"

Given Session ở trạng thái ORDERED
When Host cố hủy phòng
Then nhận lỗi "Không thể hủy đơn đã đặt hàng"
```

---

## 6. REQ-00019: Session Expiry / Auto-cleanup

### 6.1 Mô tả
Session không hoạt động sau N ngày sẽ tự động bị cleanup để tiết kiệm DB.

### 6.2 Hiện trạng code
- **Service:** `CleanupOldSessions(ctx, days int)` → ĐÃ CÓ ✅
- **Chưa có:** Background job/cron gọi hàm này định kỳ

### 6.3 Việc cần làm cho /dev

**Backend:**
- Tạo goroutine chạy hàng ngày (hoặc dùng cron library) gọi `CleanupOldSessions(ctx, 30)`
- Mặc định: xóa session > 30 ngày tuổi ở trạng thái `completed` hoặc `cancelled`
- KHÔNG xóa session đang `open`, `locked`, `ordered`, `settling`

```go
// main.go hoặc scheduler package
go func() {
    ticker := time.NewTicker(24 * time.Hour)
    for range ticker.C {
        ctx := context.Background()
        deleted, err := sessionSvc.CleanupOldSessions(ctx, 30)
        slog.Info("Cleanup completed", "deleted", deleted, "error", err)
    }
}()
```

### 6.4 Acceptance Criteria
```gherkin
Given có 5 session COMPLETED tạo cách đây 35 ngày
And có 3 session OPEN tạo cách đây 35 ngày
When cleanup job chạy với days=30
Then 5 session COMPLETED bị xóa
And 3 session OPEN vẫn giữ nguyên
```

---

## 7. REQ-00020: Host Recovery & Re-binding (Admin Secret)

### 7.1 Mô tả
Cho phép Host khôi phục quyền quản trị khi đổi trình duyệt hoặc mất `DeviceID` gốc mà không cần tài khoản.

### 7.2 Cơ chế Admin Secret
- Khi tạo Session, hệ thống sinh ngẫu nhiên một **Admin Secret** gồm 6 ký tự (Alphanumeric, viết hoa, loại bỏ ký tự dễ nhầm lẫn như O, 0, I, 1).
- Admin Secret được lưu dưới dạng **bcrypt hash** trong DB (`admin_secret_hash`).
- Admin Secret chỉ hiển thị 1 lần duy nhất cho Host lúc tạo phòng (hoặc ẩn sau icon "Con mắt" trong trang quản trị).

### 7.3 Luồng khôi phục (Re-binding)
1. User truy cập phòng với tư cách Guest.
2. Chọn "Khôi phục quyền Host" -> Nhập Admin Secret.
3. Backend kiểm tra các điều kiện:
    - `admin_secret` khớp với hash.
    - **Grace Period:** Host hiện tại phải offline (không có heartbeat) ít nhất **2 phút**.
    - **Rate Limiting:** Sai quá 3 lần/tiếng sẽ bị khóa IP/DeviceID.
4. Nếu hợp lệ:
    - Cập nhật `sessions.host_device_id = X-Device-ID` mới.
    - Broadcast WebSocket: `"host_changed"` kèm tên thiết bị/thời gian.

### 7.4 Acceptance Criteria
```gherkin
Given Host tạo phòng và lưu mã "MT789X"
When Host mở trình duyệt ẩn danh (DeviceID mới)
And nhập mã "MT789X" trong khi Host cũ vẫn Online
Then nhận thông báo "Host gốc vẫn đang hoạt động. Vui lòng thử lại sau 2 phút."

Given Host cũ đã tắt trình duyệt > 2 phút
When Host mới nhập đúng mã "MT789X"
Then Host mới lấy được quyền quản trị (hiện nút Chốt đơn)
And các Guest khác nhận được thông báo "Quyền Host đã được chuyển giao"
```

---

## 8. Database Schema liên quan

```sql
-- Bảng sessions (đã có)
CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(), -- Tuân thủ GEMINI.md
    slug        VARCHAR(100) UNIQUE NOT NULL,
    room_id     VARCHAR(6) UNIQUE NOT NULL, -- Thống nhất 6 ký tự
    title       VARCHAR(255) NOT NULL,
    host_device_id UUID NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'open',
    password    VARCHAR(255),  -- Cần đổi sang bcrypt hash
    admin_secret_hash VARCHAR(255) NOT NULL, -- Cần bổ sung cho REQ-00020
    -- ... các cột khác
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index cho cleanup
CREATE INDEX idx_sessions_status_created ON sessions(status, created_at);
```,old_string:

---
*Spec này là nguồn chân lý cho /dev. Mọi thắc mắc liên hệ /ba.*


