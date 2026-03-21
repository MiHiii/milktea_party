# 🧋 Milktea Party — Go & PostgreSQL Migration Plan (v3.4 Compliance)

## 🏗️ Phase 1: Database & Schema Foundation
*Goal: Establish a solid PostgreSQL schema and migration strategy.*

- **Status:** Đã xong SQL Migration và Domain Models.
- **Next:** Cấu hình Database Connection (`pgx/v5`) và Repository layer.

## 🗄️ Phase 2: Go Backend Architecture (The "Armor")
*Goal: Xây dựng khung server Gin với middleware bảo mật và database connection pooling.*

## 🚀 Phase 3: Core Domain & Business Logic
*Goal: Tái triển khai các Handler (API) cho Session, Participant, Order Item.*

## 📡 Phase 4: WebSocket Hub (Real-time Sync)
*Goal: Thay thế Supabase Realtime bằng WebSocket backpressure-controlled.*

## ⚛️ Phase 5: Frontend Refactor & Integration
*Goal: Chuyển Next.js App sang giao tiếp với Go Backend mới.*

## 🧪 Phase 6: Verification & Cleanup

---

## 📅 Immediate Next Steps
1. **Database Connection:** Xây dựng `internal/repository/postgres.go` sử dụng `pgx/v5`.
2. **Environment Config:** Thiết lập load `.env` và struct Config.
3. **Repository Interfaces:** Định nghĩa các Interface cho Session và Participant.
