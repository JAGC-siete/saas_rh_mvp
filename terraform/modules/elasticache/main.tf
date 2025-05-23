# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project_name}-redis-${var.environment}"
  engine              = "redis"
  node_type           = var.node_type
  num_cache_nodes     = var.num_cache_nodes
  parameter_group_name = "default.redis7"
  port                = var.port
  security_group_ids  = [aws_security_group.redis.id]
  subnet_group_name   = aws_elasticache_subnet_group.main.name

  tags = {
    Name        = "${var.project_name}-redis-${var.environment}"
    Environment = var.environment
  }
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-redis-${var.environment}"
  description = "Allow inbound traffic for Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    cidr_blocks     = ["10.0.0.0/16"]  # VPC CIDR
  }
}

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-redis-subnet-${var.environment}"
  subnet_ids = var.subnets
}
