# Monitoring dashboard URL is now managed by monitoring_enablement module

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "application_log_group" {
  description = "Name of the CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.application.name
}

output "rds_monitoring_role_arn" {
  description = "ARN of the RDS enhanced monitoring IAM role"
  value       = aws_iam_role.rds_enhanced_monitoring.arn
}
