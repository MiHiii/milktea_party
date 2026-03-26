---
name: DevOps Skill
description: CI/CD pipeline design, deployment strategy, incident response, and monitoring
---

# 🚀 DevOps Skill — Deployment & Operations

---

## 1. Environment Strategy

| Environment | Purpose | Deploy Trigger | DB |
|-------------|---------|---------------|-----|
| **Development** | Local dev, experiments | Manual | Local / Docker |
| **Staging** | QA testing, demo | Auto on merge to `develop` | Staging DB (clone prod schema) |
| **Production** | Live users | Manual trigger + approval | Production DB |

### Rules
- Production deploy requires EM or Tech Lead approval
- No production deploys after 4pm or before holidays without on-call
- Staging must mirror production config (env vars, secrets structure)

---

## 2. CI/CD Pipeline Design

### PR Pipeline (every pull request)
```
Lint → Type Check → Unit Tests → Build Check → Security Scan
```
- Must pass 100% before reviewer can review
- Target: < 15 minutes total

### Staging Pipeline (on merge to develop)
```
All Tests → Build Docker Image → Push to Registry → Deploy to Staging → Smoke Test → Notify
```

### Production Pipeline (manual trigger)
```
QA Sign-off Verified → Build → Snapshot DB → Run Migrations → Deploy (Blue/Green) → Health Check → Notify Slack
```

---

## 3. Deployment Checklist

### Pre-Deploy
- [ ] All CI checks pass
- [ ] QA sign-off received (for production)
- [ ] Database snapshot taken (< 1 hour before deploy)
- [ ] Rollback plan documented
- [ ] Migration tested on staging
- [ ] On-call engineer available (production)
- [ ] Feature flags configured (for major features)

### Post-Deploy
- [ ] Health check endpoints responding
- [ ] Monitor 30 minutes: error rate, latency, CPU/Memory
- [ ] Verify critical user flows work
- [ ] Alert if error rate increases > 50% vs baseline
- [ ] Notify team on deployment channel

---

## 4. Rollback Strategy

### Layers of Rollback (fastest first)
1. **Feature Flag** — Toggle off the problematic feature (< 1 min)
2. **Container Rollback** — Redeploy previous Docker image by git SHA (< 5 min)
3. **Database Rollback** — Run DOWN migration (< 10 min)
4. **Snapshot Restore** — Restore DB from pre-deploy snapshot (< 30 min)

### Rules
- Docker images tagged with git SHA (not `latest`)
- Rollback target: < 10 minutes for application, < 30 minutes for database
- Every migration must have a tested DOWN migration
- Practice rollback procedure quarterly

---

## 5. Database Migration Deployment

```
1. Take DB snapshot
2. Run migrations (before app deploy)
3. Verify schema changes
4. Deploy application
5. Monitor for migration-related errors
```

### Migration Rules
- Backward-compatible (expand/contract pattern)
- Never rename/drop columns in same release as code change
- Always test on staging data first
- Have rollback migration ready

---

## 6. Incident Response Playbook

### Severity Levels
| Level | Description | Acknowledge | Resolve |
|-------|-------------|:-----------:|:-------:|
| **SEV-1** | Production down / data loss | ≤ 15 min | ≤ 4 hours |
| **SEV-2** | Core feature broken | ≤ 30 min | ≤ 8 hours |
| **SEV-3** | Minor degradation | ≤ 4 hours | Within sprint |
| **SEV-4** | Low priority / cosmetic | Next day | Backlog |

### 5-Step Response (SEV-1/2)
```
1. DETECT & DECLARE
   → Create incident channel: #incident-YYYYMMDD-{desc}
   → Tag on-call + EM. Don't fix alone silently.

2. ASSIGN ROLES
   → Incident Commander (IC): coordinate, NOT code
   → Tech Lead: investigate root cause
   → Comms Lead: update stakeholders every 30 min

3. MITIGATE FIRST, FIX SECOND
   → Feature flag off → Rollback → Scale up
   → Stop the bleeding before root cause analysis

4. COMMUNICATE
   → Update status page
   → Internal update every 30 minutes
   → Clear, factual, blameless

5. POST-MORTEM (within 48 hours)
   → Timeline → Root Cause → Impact → Action Items (with owners)
   → Blameless culture: "what failed" not "who failed"
```

---

## 7. Monitoring & Alerting

### What to Monitor
| Metric | Alert Threshold |
|--------|----------------|
| Error rate (5xx) | > 1% for 5 min |
| Response latency (p99) | > 500ms for 5 min |
| CPU usage | > 80% for 10 min |
| Memory usage | > 85% for 10 min |
| Disk usage | > 90% |
| Active connections | > 80% of max |

### Logging
- Structured JSON logs (not plain text)
- Include: `trace_id`, `timestamp`, `level`, `service`, `message`
- Log retention: 30 days (adjustable)
- Separate error logs for alerting

### Health Check Endpoint
```
GET /health
Response: { "status": "ok", "version": "v1.2.3", "uptime": "12h30m" }
```

---

## 8. Secret Management

- Environment variables for all secrets
- `.env.example` committed (with empty values)
- `.env` in `.gitignore` (NEVER committed)
- Different secrets per environment
- Rotate secrets quarterly or after team member departure
