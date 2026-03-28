# 📋 SPEC: Real-time Sync & Data Integrity
> **Registry IDs:** REQ-00005, REQ-00012, REQ-00017, REQ-00018
> **Owner:** /ba | **Version:** 1.0 | **Date:** 2026-03-25
> **Depends on:** `milktea-logic.md` §3 (Reliability)

---

## 1. REQ-00005: Real-time Sync (WebSocket)

### 1.1 Mô tả
Mọi thay đổi trong Session (thêm/sửa/xóa món, chuyển trạng thái) đều phải đồng bộ tức thời tới tất cả Participant trong phòng qua WebSocket.

### 1.2 Hiện trạng
- **WebSocket Hub:** ĐÃ CÓ (`internal/websocket/`) ✅
- **Broadcast:** ĐÃ CÓ — gọi `hub.Broadcast(sessionID, eventType, data)` ✅

### 1.3 Danh sách Event Types

| Event | Trigger | Data | Ai nhận? |
|:---|:---|:---|:---|
| `session_updated` | Host sửa config/trạng thái | `Session` object | All |
| `session_deleted` | Host xóa phòng | `nil` | All Guests |
| `session_cancelled` | Host hủy phòng | `nil` | All Guests |
| `item_added` | Guest thêm món | `OrderItem` | All |
| `item_updated` | Sửa món (Guest/Host) | `OrderItem` | All |
| `item_deleted` | Xóa món | `{ itemId }` | All |
| `participant_joined` | Guest mới vào phòng | `Participant` | All |
| `participant_heartbeat` | Heartbeat update | `{ participantId, lastActive }` | Host only |
| `batch_created` | Tạo batch mới | `OrderBatch` | All |
| `bill_calculated` | Khi enter SETTLING | `BillResult` | All |

### 1.4 Việc cần làm cho /dev

**Đã implement:** `session_updated`, `session_deleted`
**Cần bổ sung:**
- Broadcast cho tất cả OrderItem CRUD ops
- Broadcast cho Participant join
- Broadcast `session_cancelled` event (REQ-00014)
- Broadcast `bill_calculated` khi chuyển sang SETTLING

**Frontend:**
```typescript
// Trong SessionClient.tsx — đã có useEffect cho WS
// Cần handle thêm event types:
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  switch(type) {
    case 'session_updated': setSession(data); break;
    case 'session_cancelled': showCancelledOverlay(); break;
    case 'item_added': setItems(prev => [...prev, data]); break;
    case 'item_updated': setItems(prev => prev.map(i => i.id === data.id ? data : i)); break;
    case 'item_deleted': setItems(prev => prev.filter(i => i.id !== data.itemId)); break;
    case 'participant_joined': setParticipants(prev => [...prev, data]); break;
    case 'bill_calculated': setBillResult(data); break;
  }
};
```

---

## 2. REQ-00012: Transactional Financial Ops

### 2.1 Quy tắc
Theo `milktea-logic.md` §Coding Guardrails: "Mọi thay đổi liên quan đến tiền bạc/trạng thái bắt buộc nằm trong Transaction."

### 2.2 Các operations cần Transaction

| Operation | Lý do |
|:---|:---|
| Chốt đơn (OPEN → LOCKED) | Phải atomic: check status + update + block items |
| Tính bill (API-00011) | Read items + calculate + save result — phải consistent |
| Đánh dấu isPaid | Phải atomic để tránh 2 người đánh dấu trùng thời điểm |

### 2.3 Code guide cho /dev

```go
// Repository layer: sử dụng database/sql Transaction
func (r *sessionRepo) LockSession(ctx context.Context, tx *sql.Tx, id uuid.UUID) error {
    _, err := tx.ExecContext(ctx,
        `UPDATE sessions SET status = 'locked' WHERE id = $1 AND status = 'open'`, id)
    return err
}

// Service layer:
func (s *sessionService) LockSession(ctx context.Context, id uuid.UUID) error {
    tx, _ := s.db.BeginTx(ctx, nil)
    defer tx.Rollback()
    
    if err := s.repo.LockSession(ctx, tx, id); err != nil {
        return err
    }
    return tx.Commit()
}
```

---

## 3. REQ-00017: Concurrent Update Prevention (Pessimistic Lock)

### 3.1 Vấn đề
Khi Host bấm "Chốt đơn", Guest có thể đang gửi request thêm/sửa món cùng lúc → Race condition.

### 3.2 Giải pháp
Sử dụng `SELECT ... FOR UPDATE` trong Transaction:

```go
func (r *sessionRepo) LockForUpdate(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*domain.Session, error) {
    var session domain.Session
    err := tx.QueryRowContext(ctx,
        `SELECT * FROM sessions WHERE id = $1 FOR UPDATE`, id,
    ).Scan(&session)
    return &session, err
}
```

**Flow khi Host chốt đơn:**
1. BEGIN transaction
2. `SELECT * FROM sessions WHERE id = ? FOR UPDATE` → Lock row
3. Check `status == 'open'` → nếu không → ROLLBACK
4. `UPDATE sessions SET status = 'locked'`
5. COMMIT → Broadcast WS "session_updated"

> Guest requests thêm/sửa/xóa món sẽ bị **block** ở bước SELECT FOR UPDATE cho tới khi Host COMMIT.

---

## 4. REQ-00018: Context Timeout (3-5s)

### 4.1 Quy tắc
Theo `milktea-logic.md` §Coding Guardrails: áp dụng `context.WithTimeout(3-5s)` cho mọi DB operation.

### 4.2 Hiện trạng
- `session_service.go`: ĐÃ CÓ timeout (5s-10s) cho mọi method ✅
- Các service khác: **CHƯA kiểm tra**

### 4.3 Việc cần làm cho /dev

Kiểm tra và bổ sung timeout cho:
- `order_item_service.go` — tất cả methods
- `order_batch_service.go` — tất cả methods
- `participant_service.go` — tất cả methods

```go
func (s *orderItemService) Create(ctx context.Context, item *domain.OrderItem, key string) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    // ... logic
}
```

---
*Spec này là nguồn chân lý cho /dev. Mọi thắc mắc liên hệ /ba.*


