output "monitoring_dashboard_url" {
  description = "URL of the CloudWatch monitoring dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "rds_log_group_name" {
  description = "Name of the CloudWatch log group for RDS logs"
  value       = aws_cloudwatch_log_group.rds.name
}

output "eks_log_group_name" {
  description = "Name of the CloudWatch log group for EKS logs"
  value       = aws_cloudwatch_log_group.eks.name
}

output "elasticache_log_group_name" {
  description = "Name of the CloudWatch log group for ElastiCache logs"
  value       = aws_cloudwatch_log_group.elasticache.name
}
