# 🏗️ TTD-00020: Host Recovery & Re-binding

**Status:** `APPROVED` | **Owner:** /architect | **Date:** 2026-03-27
**Reference:** [REQ-00001 §7](docs/specs/business/REQ-00001-session-lifecycle.md#7-req-00020-host-recovery--re-binding-admin-secret)

---

## 1. Data Model & Migration
Bổ sung cột lưu trữ hash của mã quản trị.

### Migration (`server/migrations/000008_add_admin_secret.up.sql`)
```sql
ALTER TABLE milktea.sessions 
ADD COLUMN admin_secret_hash VARCHAR(255) NOT NULL DEFAULT '';
```

## 2. API Design

### 2.1. Cập nhật `POST /api/sessions` (Create Session)
- **Generator:** Bộ ký tự `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`.
- **Logic:** 
  1. Sinh ngẫu nhiên 6 ký tự.
  2. Hash bằng `bcrypt.GenerateFromPassword`.
- **Response Shape:**
```json
{
  "data": {
    "session": { ... },
    "participant": { ... },
    "adminSecret": "K7R9WP"
  }
}
```

### 2.2. Endpoint mới: `POST /api/sessions/slug/:slug/claim-host`
- **Headers:** `X-Device-ID` (ID thiết bị mới).
- **Body:** `{ "adminSecret": "K7R9WP" }`.
- **Logic:** `bcrypt.CompareHashAndPassword`. 
- **Grace Period:** Nếu host cũ active < 120s -> `403 Forbidden`.

## 3. UI/UX: The "10s Golden Window" Toast

Thành phần thông báo đặc biệt chỉ xuất hiện 1 lần duy nhất sau khi tạo phòng thành công.

### 3.1. Đặc tính kỹ thuật (HostSecretToast.tsx)
- **Vị trí:** `fixed top-4 right-4` (Desktop), `fixed bottom-4 left-4 right-4` (Mobile).
- **Thời gian:** 10 giây (auto-close).
- **Hiệu ứng viền (Border Countdown):**
    - Sử dụng `SVG stroke-dashoffset` animation.
    - Path chạy bao quanh khung Toast từ 100% về 0% trong 10s.
    - Màu sắc: Sky-400 (Phù hợp theme chung).

### 3.2. Logic Bảo mật (Secure Reveal)
- **Trạng thái mặc định:** Mã chủ phòng hiển thị dạng `••••••` (masking).
- **Hành động Click:**
    - Khi click vào vùng mã: Chuyển sang plaintext.
    - Trigger `navigator.clipboard.writeText`.
  * BA Note: Hãy đảm bảo khi click vào, mã không chỉ hiện ra mà còn phải có một phản hồi thị giác nhẹ (ví dụ: đổi icon thành dấu Check ✅ trong 1s) để người dùng biết là mã đã được copy thành công, tránh việc họ phải click nhiều lần.
- **Logic Blur (Focus-out):**
    - Sử dụng `onMouseLeave` hoặc `onBlur`.
    - Ngay khi chuột rời khỏi hoặc mất focus, lập tức quay về dạng `••••••`.
    - Đảm bảo an toàn tuyệt đối khi chụp màn hình (Screenshot-proof).

### 3.3. Nội dung & Cá nhân hóa
- **Lời chào:** `Chào ${hostName}! 👋`
- **Thông điệp:** `Bạn là chủ phòng này. Mã chủ phòng: [••••••]`
- **Chú thích:** `Dùng mã này để đăng nhập lại từ thiết bị khác.`

## 4. Frontend Implementation
- **Component:** `client/components/session/HostSecretToast.tsx`.
- **Library:** `framer-motion` cho transition và SVG animation.
- **Integration:** Gắn vào `SessionClient.tsx`, kích hoạt dựa trên state nhận được từ trang tạo phòng.

---
*TTD này đã cập nhật theo Spec của BA v2.0.*
