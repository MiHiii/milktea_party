# 👑 GEMINI MASTER CONTROL (v3.0)
## 🚀 Professional Team Mode: Milktea Party Project

**Tổng quan:**
*   **Dự án:** Milktea Party
*   **Stack:** Next.js 16, Go, PostgreSQL, Tailwind 4.
*   **Tiêu chuẩn chung:** `milktea-logic.md`, `REGISTRY.md`.

---

## 👥 1. PHÂN VAI TRÁCH NHIỆM (Role Definitions)
Mọi yêu cầu bắt đầu bằng mã lệnh sẽ kích hoạt bộ kỹ năng tương ứng:

| # | Mã lệnh | Vai trò | Tiêu chuẩn kỹ năng (Skill Path) | Sản phẩm đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | **/ba** | Business Analyst | `.gemini/skills/SKILL_BA.md` | `REQ-xxx` & `api_spec.md` |
| 1.2 | **/pm** | Project Manager | `.gemini/skills/SKILL_PM.md` | `REGISTRY.md` |
| 1.3 | **/dev** | Senior Developer | `.gemini/skills/SKILL_DEV.md` | Source Code & Migrations |
| 1.4 | **/test** | Tester | `.gemini/skills/SKILL_TESTER.md` | `TEST-xxx` & Bug Report |
| 1.5 | **/qc** | Quality Control | `.gemini/skills/SKILL_QC.md` | Approve/Reject Sign-off |

---

## ⚙️ 2. QUY TRÌNH PHỐI HỢP (Workflow Pipeline)
Luồng làm việc chuẩn của "Team 5 người" được chia thành 3 giai đoạn:

### 2.1 Giai đoạn Chuẩn bị (BA & PM)
1.  **BA (`/ba`)**: Tiếp nhận yêu cầu, viết đặc tả nghiệp vụ chi tiết vào `api_spec.md`.
2.  **PM (`/pm`)**: Phân rã Spec thành các Task nhỏ (`FEAT-xxx`, `API-xxx`) trong `REGISTRY.md`.

### 2.2 Giai đoạn Thực hiện (Dev)
1.  **Dev (`/dev`)**: Nhận ID Task, đọc logic từ BA và tiến hành viết code theo `SKILL_DEV.md`.

### 2.3 Giai đoạn Kiểm soát (Test & QC)
1.  **Test (`/test`)**: Chạy các kịch bản `TEST-xxx` theo `SKILL_TESTER.md` để xác nhận logic.
2.  **QC (`/qc`)**: Kiểm tra chất lượng code và bảo mật theo `SKILL_QC.md`.

---

## 📂 3. CẤU TRÚC TÀI LIỆU (Documentation Structure)
```plaintext
├── docs/
│   ├── api_spec.md      # [Sở hữu bởi BA] - Luật chơi API.
│   ├── milktea-logic.md # [Sở hữu bởi BA] - Công thức tính toán.
│   └── REGISTRY.md      # [Sở hữu bởi PM] - Danh sách Task & Trạng thái.
├── .gemini/skills/
│   ├── SKILL_BA.md      # Tiêu chuẩn phân tích nghiệp vụ.
│   ├── SKILL_PM.md      # Tiêu chuẩn quản lý dự án.
│   ├── SKILL_DEV.md     # Tiêu chuẩn viết code.
│   ├── SKILL_TESTER.md  # Tiêu chuẩn kiểm thử.
│   └── SKILL_QC.md      # Tiêu chuẩn chất lượng & bảo mật.
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

1.  **[/dev] Hoàn thành code:** Tuân thủ `SKILL_DEV.md`, đã có Migration (nếu cần).
2.  **[/test] Hoàn thành kiểm thử:** Tuân thủ `SKILL_TESTER.md`. Nếu lỗi, tạo `BUG-xxx`.
3.  **[/qc] Duyệt cuối cùng:** Tuân thủ `SKILL_QC.md`. Đổi Global Status thành **DONE**.

---

## 🐞 6. THEO DÕI LỖI (Bug Tracker)

| Bug ID | Liên quan | Mô tả lỗi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | API-005 | Gửi số lượng âm (-) vẫn nhận đơn hàng | High | Open |
