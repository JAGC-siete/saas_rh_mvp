# S3 Bucket for backups
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-backups-${var.environment}"
  
  # For MVP, we'll enable versioning to maintain backup history
  versioning {
    enabled = true
  }

  # Enable server-side encryption by default
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  # For MVP, we'll set a basic lifecycle rule
  lifecycle_rule {
    enabled = true

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90  # Keep backups for 90 days
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Backup IAM Role
resource "aws_iam_role" "backup" {
  name = "${var.project_name}-backup-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

# Backup Policy
resource "aws_iam_role_policy_attachment" "backup" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}

# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name = "${var.project_name}-vault-${var.environment}"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# AWS Backup Plan
resource "aws_backup_plan" "main" {
  name = "${var.project_name}-backup-plan-${var.environment}"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)"  # Daily at 5 AM UTC

    lifecycle {
      delete_after = 90  # Keep backups for 90 days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.main.arn
    }
  }

  # Weekly backup with longer retention for MVP
  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * SAT *)"  # Weekly on Saturday at 5 AM UTC

    lifecycle {
      delete_after = 180  # Keep weekly backups for 180 days
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# AWS Backup Selection
resource "aws_backup_selection" "main" {
  name         = "${var.project_name}-backup-selection-${var.environment}"
  plan_id      = aws_backup_plan.main.id
  iam_role_arn = aws_iam_role.backup.arn

  resources = [
    var.rds_arn,  # RDS instance ARN
    var.elasticache_arn  # Redis instance ARN
  ]
}
