# 📋 SPEC: Identity & Participant Management
> **Registry IDs:** REQ-002, FEAT-011
> **Owner:** /ba | **Version:** 1.0 | **Date:** 2026-03-25
> **Depends on:** `api_overview.md` §C (Participant Logic)

---

## 1. Tổng quan

Hệ thống Milktea Party KHÔNG yêu cầu đăng ký tài khoản. Mọi người dùng được nhận diện qua `DeviceID` — một UUID v4 được tạo 1 lần duy nhất và lưu tại `localStorage` của trình duyệt.

---

## 2. REQ-002: DeviceID Identity & Heartbeat

### 2.1 Luồng định danh

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User mở app     │────►│ Check localStorage│────►│ Có DeviceID?     │
│ lần đầu tiên    │     │ "device_id"       │     │                  │
└─────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                      │Yes    │No
                                                      ▼       ▼
                                                 ┌─────────┐ ┌──────────────┐
                                                 │ Dùng lại │ │ Tạo UUID v4  │
                                                 │ DeviceID │ │ Lưu vào LS   │
                                                 └─────────┘ └──────────────┘
                                                      │           │
                                                      └─────┬─────┘
                                                            ▼
                                                 ┌──────────────────┐
                                                 │ Gắn X-Device-ID  │
                                                 │ vào mọi request  │
                                                 └──────────────────┘
```

### 2.2 Mapping Identity

```
(SessionID, DeviceID) → Participant { name, isHost, isPaid, lastActive }
```

- Một DeviceID có thể tham gia NHIỀU session (nhiều phòng khác nhau)
- Trong MỘT session, mỗi DeviceID chỉ map tới MỘT Participant
- Nếu Guest quay lại phòng (cùng DeviceID + cùng SessionID) → trả về data cũ, KHÔNG tạo mới

### 2.3 Heartbeat Mechanism (API-008)

**Mục đích:** Cho Host biết Guest nào đang online.

**Endpoint:** `POST /api/participants/:id/heartbeat`
- **Gọi tự động** mỗi 30 giây từ Frontend
- **Backend:** Cập nhật `last_active = NOW()` trong bảng `participants`
- **Xác định online:** `last_active > NOW() - 60s` (cho phép lệch 1 chu kỳ)

### 2.4 Việc cần làm cho /dev

**Frontend (`lib/identity.ts`):**
```typescript
// Đã có sẵn: getOrCreateDeviceId()
// Cần bổ sung: startHeartbeat(participantId: string)
let heartbeatInterval: NodeJS.Timeout;

export function startHeartbeat(participantId: string) {
  heartbeatInterval = setInterval(async () => {
    await fetch(`/api/participants/${participantId}/heartbeat`, {
      method: 'POST',
      headers: { 'X-Device-ID': getDeviceId() },
    });
  }, 30_000); // 30s
}

export function stopHeartbeat() {
  clearInterval(heartbeatInterval);
}
```

**Backend (`participant_handler.go`):**
- Handler `Heartbeat()` → gọi service `UpdateLastActive(ctx, id)`
- Service: ĐÃ CÓ sẵn trong `interfaces.go` ✅

### 2.5 Acceptance Criteria
```gherkin
Given Guest mở app lần đầu tiên
When app tải xong
Then tạo DeviceID (UUID v4) và lưu vào localStorage

Given Guest đã có DeviceID và tham gia phòng
When Guest đang ở trong phòng 
Then gửi heartbeat mỗi 30s
And Host thấy Guest có trạng thái "Online"

Given Guest tắt trình duyệt
When heartbeat ngừng gửi > 60s
Then Host thấy Guest chuyển sang "Offline"
```

---

## 3. FEAT-011: UI Participant Online/Offline Status

### 3.1 Mô tả
Hiển thị indicator (dot xanh/đỏ) bên cạnh tên mỗi Participant để Host biết ai đang online.

### 3.2 Thiết kế UI

```
┌────────────────────────────────┐
│ 👥 Thành viên (3/5 online)     │
├────────────────────────────────┤
│ 🟢 Minh (Host)                 │
│ 🟢 Lan                         │
│ 🟢 Hùng                        │
│ 🔴 Dũng (offline 5 phút)       │
│ 🔴 Mai (offline 15 phút)       │
└────────────────────────────────┘
```

### 3.3 Logic Frontend

```typescript
function isOnline(participant: Participant): boolean {
  const lastActive = new Date(participant.lastActive).getTime();
  const now = Date.now();
  return (now - lastActive) < 60_000; // 60 giây
}

// Cập nhật trạng thái mỗi 15s (polling) hoặc nhận qua WebSocket
```

### 3.4 Acceptance Criteria
```gherkin
Given 5 Guest trong phòng, 3 đang gửi heartbeat
When Host xem danh sách thành viên
Then 3 Guest hiện 🟢, 2 Guest hiện 🔴

Given Guest Dũng offline được 5 phút
When Host xem danh sách
Then Dũng hiện 🔴 kèm text "offline 5 phút"
```

---

## 4. Database Schema

```sql
-- Bảng participants (đã có)
CREATE TABLE participants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    device_id   UUID NOT NULL,
    name        VARCHAR(100) NOT NULL,
    is_host     BOOLEAN NOT NULL DEFAULT false,
    is_paid     BOOLEAN NOT NULL DEFAULT false,
    last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id, device_id)
);

-- Index tìm participant theo session
CREATE INDEX idx_participants_session ON participants(session_id);
```

---
*Spec này là nguồn chân lý cho /dev. Mọi thắc mắc liên hệ /ba.*
