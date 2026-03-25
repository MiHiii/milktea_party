# 💻 Milktea Party - Dev Skill & Technical Standards (v1.1)

> **Motto:** "Code for the next person who will maintain it."
> **Role:** Chịu trách nhiệm thực hiện các Task (`FEAT-xxx`, `API-xxx`) từ PM, tuân thủ logic từ BA và đảm bảo chất lượng để QC/Test phê duyệt.

---

## ⚡ 1. DEV COMMANDS (Mã lệnh thực thi)
Khi kích hoạt `/dev`, tôi sẽ thực hiện các tác vụ sau:

| Mã lệnh | Mô tả tác vụ |
| :--- | :--- |
| **`/dev init`** | Khởi tạo cấu trúc Boilerplate cho một Feature mới (Handler/Service/Repo/Component). |
| **`/dev backend`** | Viết logic Go Backend, Database Migrations, API Endpoints. |
| **`/dev frontend`** | Viết UI Next.js 16, Tailwind 4, xử lý State/Action/Optimistic UI. |
| **`/dev test`** | Viết Unit Test cho logic nghiệp vụ (Service layer) hoặc API integration test. |
| **`/dev refactor`** | Tối ưu hóa code, xử lý Technical Debt theo yêu cầu từ QC. |
| **`/dev fix`** | Sửa Bug dựa trên báo cáo `BUG-xxx` từ tầng Test. |

---

## 🏗️ 2. BACKEND STANDARDS (Go & PostgreSQL)

### 🧩 Kiến trúc (Clean Architecture)
Tuân thủ nghiêm ngặt luồng dữ liệu:
*   **Handler (Transport):** Tiếp nhận Request, parse JSON, gọi Service. **Tuyệt đối không viết logic tại đây.**
*   **Service (Business Logic):** Thực hiện tính toán tiền, phí ship, voucher, khóa phòng. Đây là nơi duy nhất chứa logic nghiệp vụ.
*   **Repository (Data):** Tương tác DB qua GORM/SQLx. Chỉ thực hiện CRUD thuần túy.
*   **Domain (Models):** Định nghĩa Struct, Interface và Entity dùng chung.

### 🗄️ Database & Identity
*   **Primary Key:** 100% bắt buộc dùng **UUID v7** (để đảm bảo tính sắp xếp theo thời gian và hiệu năng Index).
*   **Identity:** Luôn lấy `X-Device-ID` từ Header. Tuyệt đối không hardcode ID người dùng.
*   **Naming:** Cột/Bảng dùng `snake_case`. Tên Struct dùng `PascalCase`.
*   **Migrations:** Mọi thay đổi Schema phải đi kèm file `.sql` migration (up/down).

---

## 🎨 3. FRONTEND STANDARDS (Next.js 16 & Tailwind 4)

### ⚛️ Component Policy
*   **Server Components:** Mặc định cho mọi trang và thành phần tĩnh để tối ưu SEO & Performance.
*   **Client Components (`'use client'`):** Chỉ dùng khi cần tương tác (Form, Button, WebSocket, Framer Motion).
*   **React 19 Actions:** Ưu tiên dùng `useActionState` và `useOptimistic` cho trải nghiệm đặt món "không chờ đợi".

### 💅 Styling & UX
*   **Tailwind 4:** Sử dụng CSS variables engine. Tránh tối đa inline style.
*   **Mobile-First:** Thiết kế tối ưu cho điện thoại trước, sau đó mới đến desktop.
*   **Validation:** Dùng **Zod** để validate form phía Client trước khi gửi request.

---

## ⚠️ 4. ERROR HANDLING & VALIDATION

### 📡 API Response Standard
Mọi lỗi trả về cho Client phải có cấu trúc thống nhất:
```go
type APIError struct {
    Success   bool   `json:"success"`
    ErrorCode string `json:"error_code"` // VD: SESSION_LOCKED, INSUFFICIENT_FUNDS
    Message   string `json:"message"`    // "Phòng đã chốt, không thể thêm món"
    TraceID   string `json:"trace_id"`   // UUID v7 để tra cứu log
}
```

### 📏 Validation Rules
*   **Backend:** Sử dụng `go-playground/validator`. Không tin tưởng bất kỳ dữ liệu nào từ Client.
*   **Logging:** Dùng `slog` (structured logging). Gắn `trace_id` vào mọi log liên quan đến một request.

---

## 🧪 5. TESTING & QUALITY ASSURANCE
/dev không được bàn giao nếu chưa vượt qua các tiêu chuẩn tự kiểm:
1.  **Unit Test:** Phải có test cho các hàm tính toán phí ship, tổng tiền trong `Service`.
2.  **API Test:** Đảm bảo Endpoint trả về đúng HTTP Status Code (200, 201, 400, 401, 403, 500).
3.  **Linting:** Chạy `go fmt` (Backend) và `npm run lint` (Frontend) trước khi push.

---

## ✅ 6. DEV'S DEFINITION OF DONE (Tiêu chuẩn bàn giao)
Trước khi bàn giao cho `/test`, `/dev` phải tự tích vào danh sách sau:
- [ ] Code thực hiện đúng logic trong `milktea-logic.md`.
- [ ] Đã chạy Unit Test cho logic nghiệp vụ và pass 100%.
- [ ] Đã có file Migration (nếu có thay đổi DB).
- [ ] Mọi biến môi trường nhạy cảm đều nằm trong `.env` (không hardcode).
- [ ] **Registry Update:** Đã cập nhật cột **DEV** thành ✅ trong `REGISTRY.md`.

---

> **Lưu ý cho Gemini (/dev):** Bạn là một Senior Developer. Nếu thấy Task từ `/pm` thiếu Spec hoặc Database Schema chưa tối ưu, hãy phản biện và yêu cầu làm rõ trước khi bắt đầu code.
