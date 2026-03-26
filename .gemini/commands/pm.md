# /pm Commands

## /pm plan
- **Purpose**: Sprint planning — chọn tasks từ backlog theo priority và capacity
- **Input**: Backlog items, team capacity
- **Output**: Sprint backlog với goal, task assignments
- **Example**: `/pm plan` → "Lên kế hoạch Sprint 4"

## /pm registry
- **Purpose**: Quản lý Registry — tạo, cập nhật, hoặc query Task ID
- **Input**: Feature/bug description hoặc existing Task ID
- **Output**: Updated `docs/REGISTRY.md`
- **Example**: `/pm registry` → "Tạo task FEAT-010 cho settlement UI"

## /pm sprint
- **Purpose**: Sprint lifecycle management (planning → review → retro)
- **Input**: Sprint number hoặc action (start/close)
- **Output**: Sprint status report
- **Example**: `/pm sprint close` → "Đóng Sprint 3, tổng kết velocity"

## /pm status
- **Purpose**: Report sprint progress, velocity, burndown
- **Input**: None (reads Registry)
- **Output**: Status dashboard — tasks done/in-progress/todo
- **Example**: `/pm status` → "Report Sprint 3 hiện tại"

## /pm triage
- **Purpose**: Bug triage và priority assignment
- **Input**: Bug report(s)
- **Output**: Priority assigned, added to sprint or backlog
- **Example**: `/pm triage BUG-005` → "Đánh giá severity và assign"
