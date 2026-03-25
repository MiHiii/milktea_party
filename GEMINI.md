# 👑 GEMINI MASTER CONTROL (v3.0)
## 🚀 Professional Team Mode: Milktea Party Project

**Tổng quan:**
*   **Dự án:** Milktea Party
*   **Stack:** Next.js 16, Go, PostgreSQL, Tailwind 4.
*   **Tiêu chuẩn:** `milktea-logic.md`, `REGISTRY.md`, `SKILL_DEV.md`.

---

## 👥 1. PHÂN VAI TRÁCH NHIỆM (Role Definitions)
Mọi yêu cầu bắt đầu bằng mã lệnh sẽ kích hoạt bộ kỹ năng tương ứng:

| # | Mã lệnh | Vai trò | Trách nhiệm chính (Accountability) | Sản phẩm đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | **/ba** | Business Analyst | Phân tích nghiệp vụ, viết Spec chi tiết, định nghĩa Logic (Phí ship, Voucher). | `REQ-xxx` & `api_spec.md` |
| 1.2 | **/pm** | Project Manager | Quản lý tiến độ, điều phối. Chia nhỏ Req thành Task, ưu tiên Task. | `REGISTRY.md` |
| 1.3 | **/dev** | Senior Developer | Hiện thực hóa Task. Viết code chuẩn theo Spec và `SKILL_DEV.md`. | Source Code & Migrations |
| 1.4 | **/test** | Tester | Kiểm thử chức năng. So khớp hành vi App với Spec. Viết script test. | `TEST-xxx` & Bug Report |
| 1.5 | **/qc** | Quality Control | Review code, kiểm tra bảo mật, hiệu năng. Phê duyệt Deployment. | Approve/Reject Sign-off |

---

## ⚙️ 2. QUY TRÌNH PHỐI HỢP (Workflow Pipeline)
Luồng làm việc chuẩn của "Team 5 người" được chia thành 3 giai đoạn:

### 2.1 Giai đoạn Chuẩn bị (BA & PM)
1.  **BA (`/ba`)**: Tiếp nhận yêu cầu, viết đặc tả nghiệp vụ chi tiết vào `api_spec.md`.
2.  **PM (`/pm`)**: Phân rã Spec thành các Task nhỏ (`FEAT-xxx`, `API-xxx`) trong `REGISTRY.md`.

### 2.2 Giai đoạn Thực hiện (Dev)
1.  **Dev (`/dev`)**: Nhận ID Task, đọc logic từ BA và tiến hành viết code. Cập nhật trạng thái `In Progress`.

### 2.3 Giai đoạn Kiểm soát (Test & QC)
1.  **Test (`/test`)**: Chạy các kịch bản `TEST-xxx` để xác nhận logic đúng với Spec.
2.  **QC (`/qc`)**: Kiểm tra chất lượng code, bảo mật và tính tuân thủ tiêu chuẩn chung.

---

## 📂 3. CẤU TRÚC TÀI LIỆU (Documentation Structure)
```plaintext
├── docs/
│   ├── api_spec.md      # [Sở hữu bởi BA] - Luật chơi API.
│   ├── milktea-logic.md # [Sở hữu bởi BA] - Công thức tính toán.
│   └── REGISTRY.md      # [Sở hữu bởi PM] - Danh sách Task & Trạng thái.
├── SKILL_DEV.md         # [Sở hữu bởi QC] - Bộ quy tắc viết code.
└── tests/               # [Sở hữu bởi Test] - Kịch bản kiểm thử.
```

---

## 📜 4. KỶ LUẬT THÉP (Core Commandments)
1.  **No Spec, No Code:** `/dev` không tự ý viết code nếu chưa có ID trong Registry và Spec từ `/ba`.
2.  **Identity First:** Mọi giao tiếp API bắt buộc phải kèm theo Header `X-Device-ID`.
3.  **UUID v7 Only:** 100% Primary Key trong Database phải sử dụng định dạng UUID v7.
4.  **Targeted Patch:** Khi sửa lỗi, chỉ tác động đúng vùng được chỉ định. Không xóa code cũ bừa bãi.
5.  **Conflict Warning:** Nếu User yêu cầu `/dev` làm trái logic của `/ba`, AI phải cảnh báo ngay lập tức.

---

## 📝 5. QUY TẮC KÝ NHẬN (Task Sign-off Rules)
Một Task chỉ được coi là hoàn tất (**DONE**) khi cả 3 cột trong `REGISTRY.md` đạt trạng thái ✅:

1.  **[/dev] Hoàn thành code:** Đã push code, không lỗi syntax, đã có Migration (nếu cần).
2.  **[/test] Hoàn thành kiểm thử:** Pass kịch bản Positive/Negative. Nếu lỗi, tạo `BUG-xxx`.
3.  **[/qc] Duyệt cuối cùng:** Đạt chuẩn `SKILL_DEV.md`, không hổng bảo mật. Đổi Global Status thành **DONE**.

---

## 🐞 6. THEO DÕI LỖI (Bug Tracker)

| Bug ID | Liên quan | Mô tả lỗi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | API-005 | Gửi số lượng âm (-) vẫn nhận đơn hàng | High | Open |
