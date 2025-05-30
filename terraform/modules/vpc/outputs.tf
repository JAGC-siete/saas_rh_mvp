output "vpc_id" {
  description = "ID of the VPC"
  value       = "vpc-placeholder"
}

output "private_subnets" {
  description = "List of private subnet IDs"
  value       = ["subnet-private-placeholder-1", "subnet-private-placeholder-2"]
}

output "public_subnets" {
  description = "List of public subnet IDs"
  value       = ["subnet-public-placeholder-1", "subnet-public-placeholder-2"]
}

output "database_subnets" {
  description = "List of database subnet IDs"
  value       = ["subnet-db-placeholder-1", "subnet-db-placeholder-2"]
}
