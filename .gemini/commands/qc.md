# /qc Commands

## /qc review
- **Purpose**: Code review — logic, naming, clean architecture compliance
- **Input**: PR link hoặc Task ID
- **Output**: Review comments ([MUST]/[SUGGEST]/[QUESTION])
- **Example**: `/qc review FEAT-005` → "Review shipping calculation code"

## /qc security
- **Purpose**: Security audit — IDOR, injection, data exposure check
- **Input**: PR link hoặc feature area
- **Output**: Security findings with severity level
- **Rules**: Against `rules/security.md`
- **Example**: `/qc security` → "Audit order deletion endpoint"

## /qc audit
- **Purpose**: Cross-reference audit — Code vs Spec vs Test vs Registry
- **Input**: Task ID
- **Output**: Alignment report (match / mismatch per layer)
- **Example**: `/qc audit API-012` → "Code matches spec? Tests cover AC?"

## /qc perf
- **Purpose**: Performance review — DB queries, N+1, bundle size, caching
- **Input**: Feature area hoặc specific files
- **Output**: Performance findings with improvement suggestions
- **Example**: `/qc perf` → "Check N+1 queries in order listing"

## /qc sign-off
- **Purpose**: Final approval — verify all gates pass, mark QC ✅
- **Input**: Task ID (DEV ✅ and TEST ✅ required)
- **Output**: QC ✅ in Registry OR REJECT with reasons
- **Example**: `/qc sign-off FEAT-005` → "Final quality gate check"
