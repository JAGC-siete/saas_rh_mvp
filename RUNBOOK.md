# DevOps Runbook

## Initial Setup

### Infrastructure Deployment
```bash
# 1. Configure AWS credentials
aws configure

# 2. Initialize Terraform
cd terraform
terraform init

# 3. Plan changes
terraform plan -var-file=prod.tfvars

# 4. Apply changes
terraform apply -var-file=prod.tfvars
```

## Daily Operations

### Health Checks
```bash
# Check all services
./test/health.js

# Verify backups
./verify_backups.sh

# Monitor error rates
aws cloudwatch get-metric-statistics \
  --namespace SAAS-RH \
  --metric-name ErrorCount \
  --dimensions Name=Service,Value=bases-de-datos \
  --start-time $(date -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Deployments
```bash
# Deploy through GitHub Actions
git push origin main

# Manual deployment if needed
aws ecs update-service --cluster saas-rh-cluster-prod --service bases-de-datos --force-new-deployment
```

### Rollback Procedure
```bash
# 1. Identify last working version
git log --oneline

# 2. Trigger rollback workflow
gh workflow run rollback.yml -f version=<commit-sha>

# 3. Verify services
./test/health.js
```

## Backup & Recovery

### Manual Backup
```bash
# Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier saas-rh-db-prod \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

### Restore Procedure
```bash
# 1. Stop services
aws ecs update-service --cluster saas-rh-cluster-prod --service bases-de-datos --desired-count 0

# 2. Restore RDS
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier saas-rh-db-prod-restore \
  --db-snapshot-identifier <snapshot-id>

# 3. Update DNS if needed
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://dns-update.json

# 4. Restart services
aws ecs update-service --cluster saas-rh-cluster-prod --service bases-de-datos --desired-count 1
```

## Monitoring & Alerts

### CloudWatch Dashboards
- Main Dashboard: SAAS-RH-Dashboard-prod
- Services Dashboard: SAAS-RH-Services-prod

### Common Alerts
1. High Error Rate
   - Check application logs
   - Verify database connectivity
   - Check security group rules

2. Memory Usage
   - Review container metrics
   - Check for memory leaks
   - Consider scaling if needed

3. Database Connections
   - Check connection pool settings
   - Verify application connection handling
   - Monitor for connection leaks

## Security

### SSL Certificate Renewal
Automated through ACM, but verify:
```bash
aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`*.saas-rh.com`]'
```

### Security Updates
```bash
# Update dependencies
npm audit fix

# Apply security patches
aws ecs update-service --cluster saas-rh-cluster-prod --service bases-de-datos --force-new-deployment
```

## Scaling

### Horizontal Scaling
```bash
# Update desired count
aws ecs update-service \
  --cluster saas-rh-cluster-prod \
  --service bases-de-datos \
  --desired-count <new-count>
```

### Vertical Scaling
Update task definition with new CPU/memory values:
```bash
aws ecs register-task-definition --cli-input-json file://new-task-def.json
```
