# /dev Commands

## /dev code {TASK-ID}
- **Purpose**: Implement a specific task from Registry
- **Input**: Task ID (e.g., `FEAT-005`, `API-012`)
- **Output**: Feature branch + code + unit tests + PR
- **Prerequisite**: Task must exist in Registry with status TODO/IN_PROGRESS
- **Example**: `/dev code FEAT-005` → "Implement shipping calculation"

## /dev test {TASK-ID}
- **Purpose**: Write or run tests for a specific task
- **Input**: Task ID
- **Output**: Test files (`*_test.go` / `*.test.ts`) with coverage report
- **Example**: `/dev test API-012` → "Write unit tests for settlement API"

## /dev refactor
- **Purpose**: Refactor existing code without changing behavior
- **Input**: Area/file to refactor
- **Output**: Cleaner code with existing tests still passing
- **Example**: `/dev refactor` → "Refactor order service into smaller functions"

## /dev migrate
- **Purpose**: Create database migration files
- **Input**: Schema change description
- **Output**: UP + DOWN migration SQL files
- **Rules**: Follow `rules/database.md` expand/contract pattern
- **Example**: `/dev migrate` → "Add shipping_fee column to orders"

## /dev review
- **Purpose**: Self-review against DoD checklist before creating PR
- **Input**: Current branch code
- **Output**: Checklist results + fixes
- **Example**: `/dev review` → "Run pre-PR self-review checklist"
