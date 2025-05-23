variable "environment" {
  description = "Environment (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.main.dashboard_name
  description = "Name of the CloudWatch dashboard"
}

output "log_groups" {
  value = aws_cloudwatch_log_group.app_logs
  description = "Map of created CloudWatch log groups"
}
