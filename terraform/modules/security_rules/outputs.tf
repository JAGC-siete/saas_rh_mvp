output "rds_rule_id" {
  description = "ID of the RDS to EKS security group rule"
  value       = aws_security_group_rule.rds_to_eks.id
}

output "elasticache_rule_id" {
  description = "ID of the ElastiCache to EKS security group rule"
  value       = aws_security_group_rule.elasticache_to_eks.id
}
