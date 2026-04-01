# 🏗️ TTD-00020: Host Recovery & Activity Tracking - v3.0

**Status:** `APPROVED` | **Owner:** /architect | **Date:** 2026-03-28
**Reference:** [REQ-00020 v8.0 (BA)](specs/business/REQ-00001-session-lifecycle.md)

---

## 1. Data Model & Migration
Bổ sung cột theo dõi nhịp tim riêng của thiết bị đang giữ quyền Host.

### Migration (`server/migrations/000010_add_host_activity.up.sql`)
```sql
ALTER TABLE milktea.sessions 
ADD COLUMN host_last_active TIMESTAMPTZ NOT NULL DEFAULT NOW();
```

## 2. Logic cập nhật (Backend)

### 2.1. Tách biệt Heartbeat (ParticipantService)
Khi nhận Heartbeat từ thiết bị `D` cho Participant `P`:
1.  **Cập nhật nhịp tim thành viên:** `participants.last_active = NOW()` (Để hiển thị Online trên UI).
2.  **Kiểm tra vai trò Host:** Lấy `session` liên quan đến `P`.
3.  **Cập nhật nhịp tim Host:** Nếu `D == session.host_device_id`:
    *   Thực hiện cập nhật `sessions.host_last_active = NOW()`.

### 2.2. Logic ClaimHost (Hard-Gate Recovery)
Khi một thiết bị mới muốn chiếm quyền quản trị:
1.  **Xác thực:** Kiểm tra Secret Code và Identity (như thiết kế v2.0).
2.  **Kiểm tra thời gian chờ:**
    *   Tính toán: `diff = time.Since(session.host_last_active)`.
    *   Nếu `diff < 2 minutes`:
        *   Trả về lỗi `403 Forbidden`.
        *   Message: *"Thiết bị khác của bạn vẫn đang mở phòng này. Vui lòng đợi {seconds} giây nữa..."* (Hardcoded tại Service).
        *   Payload kèm theo: `{"remaining_seconds": 120 - int(diff.Seconds())}`.
    *   Nếu `diff >= 2 minutes`: Cấp quyền Host cho thiết bị mới.

## 3. UI/UX: Live Countdown trong Modal

- **Trigger:** Khi nhận lỗi 403 từ API `claim-host`, bóc tách `remaining_seconds`.
- **Hiệu ứng:** Hiển thị một thông báo màu vàng trong Modal khôi phục.
- **Timer:** Sử dụng một `useEffect` timer tại Frontend để tự động đếm lùi con số giây này mỗi giây một lần, giúp người dùng biết chính xác khi nào có thể bấm lại.

---
*Lưu ý: Hệ thống Error Code (E20001...) đã được đưa vào Backlog REQ-00023 và sẽ triển khai sau.*
