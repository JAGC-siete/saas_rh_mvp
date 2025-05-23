output "rds_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "rds_endpoint" {
  description = "The connection endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.main.id
}
