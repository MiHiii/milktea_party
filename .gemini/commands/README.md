# 🎮 Command Reference

Quick reference for all available slash commands across 7 roles.

## Roles Overview

| # | Command | Role | Agent File |
|---|---------|------|-----------|
| 1 | `/ba` | Business Analyst | `agents/AGENT_BA.md` |
| 2 | `/pm` | Project Manager | `agents/AGENT_PM.md` |
| 3 | `/dev` | Senior Developer | `agents/AGENT_DEV.md` |
| 4 | `/test` | Tester | `agents/AGENT_TESTER.md` |
| 5 | `/qc` | Quality Control | `agents/AGENT_QC.md` |
| 6 | `/devops` | DevOps / SRE | `agents/AGENT_DEVOPS.md` |
| 7 | `/architect` | Tech Lead / Architect | `agents/AGENT_ARCHITECT.md` |

## All Commands

### `/ba` — Business Analyst
| Command | Purpose |
|---------|---------|
| `/ba spec` | Viết/cập nhật API specification |
| `/ba logic` | Thiết kế business logic & formulas |
| `/ba workflow` | Vẽ user flow diagram |
| `/ba audit` | Gap analysis & edge case review |
| `/ba market` | User persona & market insights |

### `/pm` — Project Manager
| Command | Purpose |
|---------|---------|
| `/pm plan` | Sprint planning & task selection |
| `/pm registry` | Quản lý Registry — tạo/cập nhật Task ID |
| `/pm sprint` | Sprint lifecycle management |
| `/pm status` | Report sprint progress & velocity |
| `/pm triage` | Bug triage & priority assignment |

### `/dev` — Senior Developer
| Command | Purpose |
|---------|---------|
| `/dev code {ID}` | Implement a specific task |
| `/dev test {ID}` | Write/run tests for a task |
| `/dev refactor` | Refactor existing code |
| `/dev migrate` | Create database migration |
| `/dev review` | Self-review before PR |

### `/test` — Tester
| Command | Purpose |
|---------|---------|
| `/test cases` | Viết test cases từ AC |
| `/test api` | Test API endpoints |
| `/test ui` | Test UI/UX responsiveness |
| `/test e2e` | Run E2E automation |
| `/test ws` | Test WebSocket realtime |
| `/test bug` | Report bug to Registry |
| `/test verify` | Retest fixed bugs |

### `/qc` — Quality Control
| Command | Purpose |
|---------|---------|
| `/qc review` | Code review (logic, architecture) |
| `/qc security` | Security audit |
| `/qc audit` | Cross-reference: Code vs Spec vs Registry |
| `/qc perf` | Performance review |
| `/qc sign-off` | Final approval — mark QC ✅ |

### `/devops` — DevOps / SRE
| Command | Purpose |
|---------|---------|
| `/devops deploy {env}` | Deploy to environment |
| `/devops rollback` | Rollback to previous version |
| `/devops pipeline` | Design/update CI/CD pipeline |
| `/devops incident` | Incident response playbook |
| `/devops monitor` | Setup monitoring & alerting |
| `/devops env` | Environment configuration |
| `/devops secrets` | Secret management |

### `/architect` — Tech Lead
| Command | Purpose |
|---------|---------|
| `/architect design {feature}` | Write Tech Design Document |
| `/architect adr` | Create Architecture Decision Record |
| `/architect review` | Review system design |
| `/architect debt` | Tech debt assessment |
| `/architect capacity` | Capacity & scalability review |
| `/architect diagram` | Generate diagrams |
