output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = aws_subnet.database[*].id
}

output "private_subnet_cidrs" {
  description = "List of CIDR blocks of private subnets"
  value       = aws_subnet.private[*].cidr_block
}

output "public_subnet_cidrs" {
  description = "List of CIDR blocks of public subnets"
  value       = aws_subnet.public[*].cidr_block
}
