#!/bin/zsh

# Backup verification script for MVP
echo "🔍 Verifying backup status..."

# Check RDS automated backups
echo "\n📊 Checking RDS automated backups..."
aws rds describe-db-instances \
    --db-instance-identifier "saas-rh-db-prod" \
    --query 'DBInstances[*].[DBInstanceIdentifier,BackupRetentionPeriod,LatestRestorableTime]' \
    --output table

# Check AWS Backup jobs from last 24 hours
echo "\n📋 Checking recent backup jobs..."
aws backup list-backup-jobs \
    --by-resource-arn "$(aws rds describe-db-instances \
        --db-instance-identifier saas-rh-db-prod \
        --query 'DBInstances[0].DBInstanceArn' \
        --output text)" \
    --by-state "COMPLETED" \
    --max-results 10 \
    --query 'BackupJobs[*].[BackupJobId,State,CreationDate,CompletionDate]' \
    --output table

# Check backup vault status
echo "\n🏛️ Checking backup vault status..."
aws backup describe-backup-vault \
    --backup-vault-name "saas-rh-vault-prod" \
    --query '[NumberOfRecoveryPoints]' \
    --output table

# Verify S3 backup storage
echo "\n📦 Checking S3 backup storage..."
aws s3 ls s3://saas-rh-backups-prod --recursive --human-readable --summarize

echo "\n✅ Backup verification complete!"
