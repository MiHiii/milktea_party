# 📋 SPEC: UX Enhancements & Vietnam Market
> **Registry IDs:** FEAT-00004, FEAT-00005, FEAT-00006, FEAT-00009, FEAT-00010
> **Owner:** /ba | **Version:** 1.0 | **Date:** 2026-03-25
> **Depends on:** `SKILL_BA.md` §4 (UX & Vietnam Market Insights)

---

## 1. FEAT-00004: Session History

### 1.1 Mô tả
Người dùng xem lại các phòng cũ đã tham gia hoặc tạo. Dữ liệu lấy từ `localStorage` (lưu danh sách sessionId) + API.

### 1.2 Wireframe
```
┌──────────────────────────────────┐
│ 📜 Lịch sử phòng                │
├──────────────────────────────────┤
│ 🧋 Trà chiều thứ 6              │
│ 25/03/2026 • 5 người • COMPLETED│
│ Bạn đã trả: 45.000đ             │
│──────────────────────────────────│
│ 🍱 Cơm trưa văn phòng A         │
│ 24/03/2026 • 8 người • COMPLETED│
│ Bạn đã trả: 32.000đ             │
│──────────────────────────────────│
│ 🍺 Nhậu cuối tuần               │
│ 22/03/2026 • 4 người • CANCELLED│
└──────────────────────────────────┘
```

### 1.3 Luồng kỹ thuật
1. **localStorage:** Lưu array `joinedSessionIds: string[]`
2. Mỗi lần vào phòng mới → push sessionId vào array
3. Trang History → gọi `GET /api/sessions/batch?ids=id1,id2,id3` (API-00010)
4. Hiển thị danh sách, sort theo `createdAt` desc

### 1.4 Frontend route: `/history` (đã có `history/page.tsx`)

### 1.5 Acceptance Criteria
```gherkin
Given User đã tham gia 3 phòng trước đó
When mở trang History
Then hiện 3 phòng, sort mới nhất lên trên
And hiện trạng thái (COMPLETED/CANCELLED) + số tiền đã trả
```

---

## 2. FEAT-00005: Real-time Notifications

### 2.1 Mô tả
Thông báo toast khi có sự kiện quan trọng từ WebSocket.

### 2.2 Danh sách notifications

| Event WS | Toast message | Icon | Ai nhận? |
|:---|:---|:---|:---|
| `session_updated` (status=locked) | "Host đã chốt đơn! 🔒" | 🔒 | Guests |
| `session_updated` (status=settling) | "Đã có bill! Kiểm tra số tiền 💰" | 💰 | Guests |
| `session_cancelled` | "Phòng đã bị hủy ❌" | ❌ | Guests |
| `item_added` | "Lan vừa thêm Trà sữa" | 🧋 | Host |
| `participant_joined` | "Hùng vừa vào phòng 👋" | 👋 | All |

### 2.3 Code cho /dev
```typescript
// components/Toast.tsx — sử dụng react-hot-toast hoặc sonner
import { toast } from 'sonner';

function handleWSEvent(type: string, data: any) {
  switch(type) {
    case 'session_updated':
      if (data.status === 'locked') toast('Host đã chốt đơn! 🔒');
      if (data.status === 'settling') toast('Đã có bill! Kiểm tra số tiền 💰');
      break;
    case 'session_cancelled':
      toast.error('Phòng đã bị hủy ❌');
      break;
    case 'participant_joined':
      toast(`${data.name} vừa vào phòng 👋`);
      break;
  }
}
```

---

## 3. FEAT-00006: Open Graph / Zalo Share Preview

### 3.1 Mô tả
Khi chia sẻ link phòng lên Zalo/Facebook, hiển thị preview đẹp với thumbnail + tiêu đề.

### 3.2 Meta Tags cần thêm

**Trong `app/s/[slug]/page.tsx` (Server Component):**

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await fetchSession(params.slug);
  return {
    title: `${session.title} — Milktea Party 🧋`,
    description: `${session.participantCount} người đang đặt món. Vào ngay để cùng gọi đồ!`,
    openGraph: {
      title: `${session.title} — Milktea Party 🧋`,
      description: `Cùng đặt đồ uống chung! Đã có ${session.participantCount} người.`,
      images: ['/og-image.png'], // Ảnh preview chuẩn 1200×630
      type: 'website',
    },
  };
}
```

### 3.3 Việc cần làm
1. Tạo ảnh `public/og-image.png` (1200×630px) — branding Milktea Party
2. Thêm `generateMetadata()` vào page.tsx
3. Test bằng [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

### 3.4 Acceptance Criteria
```gherkin
Given Host chia sẻ link milktea.party/s/party-123 lên Zalo
When Zalo render preview
Then hiện thumbnail ảnh OG + tiêu đề phòng + số người tham gia
```

---

## 4. FEAT-00009: Error Boundary & Offline Handling

### 4.1 Mô tả
Xử lý gracefully khi:
- Mất kết nối mạng
- WebSocket disconnect
- API trả lỗi 5xx
- Host offline (ghost)

### 4.2 UI States

```
┌──────────────────────────────────┐
│ ⚠️ Mất kết nối                  │
│ Đang thử kết nối lại...         │
│ [████░░░░░░] 3s                  │
│                                  │
│ Dữ liệu của bạn vẫn an toàn.   │
│ [🔄 Thử lại ngay]               │
└──────────────────────────────────┘
```

### 4.3 Chiến lược Retry

```typescript
// lib/api.ts — wrapper fetch với retry
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
      return res; // 4xx → không retry
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Backoff
    }
  }
}

// WebSocket auto-reconnect
function connectWS(sessionId: string) {
  const ws = new WebSocket(`ws://.../${sessionId}`);
  ws.onclose = () => {
    setTimeout(() => connectWS(sessionId), 3000); // Reconnect sau 3s
  };
  return ws;
}
```

---

## 5. FEAT-00010: Host Confirmation Dialogs

### 5.1 Mô tả
Các hành động quan trọng cần dialog xác nhận:

| Hành động | Dialog message | Nút xác nhận |
|:---|:---|:---|
| Chốt đơn (Lock) | "Chốt đơn? Mọi người sẽ không thể sửa món." | "Chốt đơn 🔒" |
| Mở khóa (Unlock) | "Mở khóa? Mọi người có thể sửa lại món." | "Mở khóa 🔓" |
| Hủy phòng (Cancel) | "Hủy phòng? Hành động này không thể hoàn tác!" | "Hủy phòng ❌" |
| Xóa phòng (Delete) | "Xóa vĩnh viễn phòng này?" | "Xóa 🗑️" |
| Thu tiền (Settle) | "Chuyển sang thu tiền? Bill sẽ được tính." | "Thu tiền 💰" |

### 5.2 Component
```typescript
// components/ConfirmDialog.tsx
interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}
```

---
*Spec này là nguồn chân lý cho /dev. Mọi thắc mắc liên hệ /ba.*


