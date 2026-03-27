# 🏗️ TTD-00020: Host Recovery & Re-binding

**Status:** `DRAFT` | **Owner:** /architect | **Date:** 2026-03-27
**Reference:** [REQ-00001 §7](docs/specs/business/REQ-00001-session-lifecycle.md#7-req-020-host-recovery--re-binding-admin-secret)

---

## 1. Data Model & Migration
Bổ sung cột lưu trữ hash của mã quản trị.

### Migration (`server/migrations/000008_add_admin_secret.up.sql`)
```sql
ALTER TABLE sessions 
ADD COLUMN admin_secret_hash VARCHAR(255) NOT NULL DEFAULT '';
```

## 2. API Design

### 2.1. Cập nhật `POST /api/sessions` (Create Session)
- **Generator:** Sử dụng bộ ký tự `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (loại bỏ 0, 1, O, I).
- **Logic:** 
  1. Sinh ngẫu nhiên 6 ký tự.
  2. Hash bằng `bcrypt.GenerateFromPassword`.
  3. Lưu vào `admin_secret_hash`.
- **Response:** Trả về mã plaintext **duy nhất 1 lần** trong response body: `admin_secret: "K7R9WP"`.

### 2.2. Endpoint mới: `POST /api/sessions/slug/:slug/claim-host`
- **Headers:** `X-Device-ID` (ID thiết bị mới).
- **Body:** `{ "admin_secret": "K7R9WP" }`.
- **Logic Sequence:**
  1. **Rate Limit:** Kiểm tra `(IP, DeviceID)` -> Max 3 attempts/hour.
  2. **Verify Secret:** `bcrypt.CompareHashAndPassword`.
  3. **Check Heartbeat:** 
     - Tìm host hiện tại của session.
     - Kiểm tra `last_active` trong bảng `participants`.
     - Nếu `NOW() - last_active < 120s` -> Trả về `403 Forbidden` (Host original is online).
  4. **Atomic Update:** Trong một transaction:
     - `UPDATE sessions SET host_device_id = $1 WHERE slug = $2`.
     - `UPDATE participants SET is_host = false WHERE session_id = $ID AND is_host = true`.
     - `UPDATE participants SET is_host = true WHERE session_id = $ID AND device_id = $1`.
  5. **Broadcast:** WebSocket event `host_changed`.

## 3. WebSocket Event Schema
```json
{
  "type": "host_changed",
  "payload": {
    "new_host_name": "Minh's iPhone",
    "new_host_device_id": "uuid-v4",
    "timestamp": "2026-03-27T10:00:00Z"
  }
}
```

## 4. Frontend Integration Plans

### 4.1. Storage & UI Recovery
- **Storage:** Lưu `admin_secret` vào `localStorage` key `host_secrets` (map slug -> secret).
- **UI Flow (Low Friction):**
  - **Create Flow:** Không dùng Modal chặn màn hình. Sau khi tạo thành công:
    1. Tự động copy `admin_secret` vào Clipboard.
    2. Hiển thị **Toast/Notification** thông báo: "Đã sao chép mã quản trị (MT789X). Hãy lưu lại để khôi phục quyền Host!".
    3. Hiển thị một **Inline Banner** (có thể đóng) ở trên cùng Dashboard của Host trong 60s đầu tiên để nhắc nhở.
  - **Guest View:** Thêm nút "Khôi phục quyền Host" trong menu cài đặt hoặc cuối danh sách thành viên.
  - **Admin View:** Thêm mục "Mã quản trị" (ẩn mặc định dạng `******`) trong tab Host Settings để host xem lại bất cứ lúc nào.

### 4.2. Security Best Practices
- **UI Masking:** Luôn hiển thị mã dạng `******` trừ khi người dùng chủ động click xem.
- **Copy-to-Clipboard:** Cung cấp nút copy tiện lợi để tránh gõ sai.

---
*TTD này là cơ sở để /pm lập kế hoạch thực hiện.*
