# Enhanced Monitoring Role
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name_prefix = "${var.project_name}-${var.environment}-rds-monitoring-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"]

  tags = local.common_tags
}

# CloudWatch Log Group for RDS
resource "aws_cloudwatch_log_group" "rds" {
  name              = "/aws/rds/instance/${var.project_name}-${var.environment}/postgresql"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# Performance Insights
resource "aws_kms_key" "performance_insights" {
  description             = "KMS key for RDS Performance Insights"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "performance_insights" {
  name          = "alias/${var.project_name}-${var.environment}-rds-pi"
  target_key_id = aws_kms_key.performance_insights.key_id
}
