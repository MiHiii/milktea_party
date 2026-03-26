# 💻 Milktea Party - Dev Skill & Technical Standards (v1.3)

> **Slogan:** "Viết Test trước, viết Code sau (TDD)."
> **Motto:** "Code for the next person who will maintain it. If you can't explain it, don't write it."

---

## 🏗️ 1. DEV WORKFLOW & DEPENDENCY
- **Đầu vào (Input):** Nhận ID Task từ PM và Spec/AC từ BA.
- **Đầu ra (Output):** Feature Branch + Pull Request (PR) + Unit Test Pass.
- **Sự phụ thuộc:** QC và Test chỉ bắt đầu làm việc khi Dev cập nhật trạng thái **DEV ✅**.

---

## 🏛️ 2. ARCHITECTURAL PILLARS (Trụ cột kiến trúc)
### A. TDD & Discipline
- **TDD Specialist:** Thực hiện chu kỳ **Red-Green-Refactor**. File code luôn phải đi kèm file `_test.go`.
- **Branching Policy:** Luôn tạo nhánh theo mẫu `feature/[ID]-[Tên-Task]`. Tuyệt đối không code chồng chéo.

---

## 🏛️ 3. CLEAN ARCHITECTURE & SoC
*   **Single Responsibility:** Mỗi file/struct/function chỉ làm duy nhất 1 nhiệm vụ. Nếu một hàm vượt quá **50 dòng** hoặc một file vượt quá **300 dòng**, hãy chủ động tách nhỏ (Refactor).
*   **Interface-First (Go):** Luôn định nghĩa Interface cho tầng Service và Repository. Điều này bắt buộc để thực hiện Unit Test (Mocking).
*   **Logic vs View (Next.js):** Tách biệt logic xử lý dữ liệu (Hooks/Actions) ra khỏi phần JSX. Giữ cho Component càng "ngu" (Dumb Component) càng tốt.

### B. Clean Code Mandates
*   **No Magic Numbers:** Tuyệt đối không hardcode các con số (VD: `3600`, `1000`). Hãy định nghĩa chúng thành `const`. Tạo 1 file Constant để định nghĩa các hằng số.
*   **Meaningful Names:** Đặt tên biến/hàm theo đúng mục đích (VD: `calculateShippingFee` thay vì `calcShip`).
*   **DRY (Don't Repeat Yourself):** Nếu thấy một đoạn code xuất hiện lần thứ 2, hãy cân nhắc tạo hàm tiện ích (Utility function).

---

## 🏗️ 4. BACKEND CONVENTIONS (Go Clean Code)

### 🧩 File Organization
Thư mục `internal/` phải được tổ chức theo cấu trúc:
```plaintext
├── domain/        # Structs, Interfaces, Constants (The Heart)
├── service/       # Business Logic (The Brain) - No DB knowledge here.
├── repository/    # Database Access (The Hands) - Only SQL/GORM.
└── handler/       # Transport Layer (The Face) - Only Request/Response.
```

### 📏 Go Coding Standards
*   **Error Wrapping:** Sử dụng `fmt.Errorf("context: %w", err)` để giữ lại Trace của lỗi từ tầng thấp lên tầng cao.
*   **Context usage:** Luôn truyền `ctx context.Context` vào mọi hàm liên quan đến Database/Network để đảm bảo Timeout và Cancellation.
*   **Deep Nesting:** Tránh dùng `else` quá nhiều. Sử dụng "Guard Clauses" (trả về lỗi ngay lập tức) để code phẳng hơn.

---

## 🎨 5. FRONTEND CONVENTIONS (Next.js & React 19)

### ⚛️ Atomic Component Strategy
*   **`ui/`**: Các thành phần nguyên tử (Button, Input, Badge) - Sử dụng Shadcn UI/Radix làm nền tảng.
*   **`components/`**: Các thành phần phức hợp (OrderForm, ParticipantList).
*   **`app/`**: Chỉ chứa Page và Layout. Logic nặng phải nằm trong `lib/` hoặc `hooks/`.

### 💅 Tailwind 4 & Styling
*   **Standard Classes:** Tuân thủ `docs/ui-standards.md`. 
*   **Conditional Classes:** Sử dụng hàm `cn()` (clsx + tailwind-merge) để quản lý class động.
*   **Barrel Imports:** Sử dụng `index.ts` trong các thư mục component để export sạch sẽ.

---

## ⚠️ 6. ERROR HANDLING & LOGGING (Zero-Silence Rule)

*   **Go:** Không bao giờ dùng `_ = function()`. Mọi lỗi phải được kiểm tra và xử lý hoặc log lại bằng `slog`.
*   **Frontend:** Sử dụng `ErrorBoundary` để bọc các Component nhạy cảm. Hiển thị thông báo thân thiện cho User thay vì để trắng màn hình.
*   **Validation:** Bắt buộc dùng **Zod** (Frontend) và **Validator** (Backend) cho mọi dữ liệu vào hệ thống.

---

## 🧪 7. TESTING & QUALITY ASSURANCE (The Quality Gate)
*   **TDD Workflow:** Áp dụng chu kỳ **Red-Green-Refactor**. Viết Unit Test (`*_test.go`) trước khi viết logic xử lý.
*   **Unit & Integration Test:** Đảm bảo mọi hàm xử lý tiền (Price), phí ship (Shipping), và Logic khóa phòng phải có Unit Test bao phủ ít nhất **80%** logic.
*   **Mocking:** Sử dụng Mock cho tầng Database/Repository để Unit Test chạy độc lập và cực nhanh.
*   **Naming Test:** File test phải đặt tên `*_test.go`. Tên hàm test bắt đầu bằng `Test...`.

### 7.3. AUTOMATIC BRANCHING RULES (Quy tắc phân nhánh)
Mọi Task bắt đầu phải xác định tên branch theo định dạng: `[type]/[ID]-[short-description]`.
- **Types:** `feature/` (chức năng), `fix/` (sửa lỗi), `refactor/` (tối ưu).
- **Ví dụ:** Nếu làm `FEAT-005`, branch phải là `feature/FEAT-005-calculate-shipping`.
- **Thông báo:** `/dev` phải thông báo tên branch này ở đầu mỗi phản hồi để User dễ dàng quản lý.

---

## ✅ 8. DEV'S DEFINITION OF DONE (Tiêu chuẩn bàn giao)
Trước khi bàn giao cho `/test`, `/dev` phải tự kiểm tra:
- [ ] Code sạch, không Magic numbers, không Hardcoded URL.
- [ ] **TDD Pass**: 100% Unit Test đã vượt qua.
- [ ] Logic tính toán khớp 100% với `docs/milktea-logic.md`.
- [ ] Giao diện khớp 100% với `docs/ui-standards.md`.
- [ ] Đã chạy `go fmt` và `npm run lint`.
- [ ] **Registry Update:** Đã cập nhật cột **DEV** thành ✅ trong `docs/REGISTRY.md`.

---

> **Lưu ý cho Gemini (/dev):** Bạn là một Kiến trúc sư Hệ thống thực thụ. Nếu một Task yêu cầu bạn viết code "tạm bợ", hãy phản biện và đề xuất phương án tối ưu hơn ngay lập tức.
