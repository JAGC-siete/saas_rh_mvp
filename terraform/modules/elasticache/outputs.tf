output "elasticache_arn" {
  description = "The ARN of the ElastiCache cluster"
  value       = aws_elasticache_cluster.main.arn
}

output "elasticache_endpoint" {
  description = "The endpoint of the ElastiCache cluster"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "elasticache_id" {
  description = "The ID of the ElastiCache cluster"
  value       = aws_elasticache_cluster.main.id
}
