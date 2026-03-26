# /devops Commands

## /devops deploy {env}
- **Purpose**: Deploy application to specified environment
- **Input**: Environment (`staging` / `production`)
- **Output**: Deployment status, health check results
- **Prerequisite**: QA sign-off for production
- **Example**: `/devops deploy staging` → "Deploy develop to staging"

## /devops rollback
- **Purpose**: Rollback to previous version
- **Input**: Target version/SHA hoặc "previous"
- **Output**: Rollback execution + verification
- **Example**: `/devops rollback` → "Rollback production to previous image"

## /devops pipeline
- **Purpose**: Design or update CI/CD pipeline configuration
- **Input**: Pipeline type (PR/staging/production)
- **Output**: Updated workflow files (GitHub Actions / GitLab CI)
- **Example**: `/devops pipeline` → "Add security scan to PR pipeline"

## /devops incident
- **Purpose**: Activate incident response playbook
- **Input**: Incident description + severity level
- **Output**: Incident channel setup, role assignment, mitigation steps
- **Example**: `/devops incident SEV-1` → "Production API down"

## /devops monitor
- **Purpose**: Setup or review monitoring and alerting
- **Input**: Service/metric to monitor
- **Output**: Monitoring config + alert rules
- **Example**: `/devops monitor` → "Setup error rate alerts"

## /devops env
- **Purpose**: Environment configuration management
- **Input**: Environment name + config changes
- **Output**: Updated env config
- **Example**: `/devops env staging` → "Update staging DB connection"

## /devops secrets
- **Purpose**: Secret management — rotate, add, audit
- **Input**: Secret name or audit scope
- **Output**: Secret management actions
- **Example**: `/devops secrets rotate` → "Rotate API keys"
