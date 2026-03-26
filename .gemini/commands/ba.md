# /ba Commands

## /ba spec
- **Purpose**: Tạo hoặc cập nhật API specification trong `docs/api_spec.md`
- **Input**: Feature name hoặc REQ-xxx reference
- **Output**: Updated `docs/api_spec.md` với endpoints, request/response, error codes
- **Rules**: Tuân thủ `rules/api-convention.md`
- **Example**: `/ba spec` → "Viết spec cho feature settlement"

## /ba logic
- **Purpose**: Thiết kế và document business logic, công thức tính toán
- **Input**: Business requirement description
- **Output**: Formulas với ví dụ cụ thể, edge cases, rounding rules
- **Example**: `/ba logic` → "Thiết kế công thức chia tiền ship"

## /ba workflow
- **Purpose**: Vẽ user flow diagram cho feature
- **Input**: Feature description hoặc user story
- **Output**: Mermaid diagram + text description
- **Example**: `/ba workflow` → "Vẽ flow đặt món từ khi mở phòng"

## /ba audit
- **Purpose**: Phân tích lỗ hổng logic, gap analysis, edge case review
- **Input**: Existing spec hoặc feature area
- **Output**: List of gaps, edge cases, và proposed solutions
- **Example**: `/ba audit` → "Audit logic thanh toán"

## /ba market
- **Purpose**: User persona analysis, market-specific insights
- **Input**: Feature area hoặc target audience
- **Output**: Persona insights, UX recommendations
- **Example**: `/ba market` → "Phân tích hành vi thanh toán"
