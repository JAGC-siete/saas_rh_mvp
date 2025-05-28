# Locals for common configurations
locals {
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  )
}

# Generate random auth token for Redis
resource "random_password" "redis_auth" {
  length  = 32
  special = false # Redis auth token doesn't support special characters
}

# Store the auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "${var.project_name}-${var.environment}-redis-auth-v2"
  description = "Redis AUTH token"
  kms_key_id  = var.kms_key_arn

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
    host       = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = var.port
  })
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-${var.environment}-v2"
  description          = "Redis cluster for ${var.project_name} ${var.environment} v2"

  engine         = "redis"
  engine_version = var.engine_version
  node_type      = var.node_type
  port           = var.port

  num_cache_clusters   = var.num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  # Enable encryption
  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  # Maintenance and backup settings
  auto_minor_version_upgrade = true
  maintenance_window         = "tue:04:00-tue:05:00"
  snapshot_window            = "03:00-04:00"
  snapshot_retention_limit   = var.snapshot_retention_limit

  # High availability settings
  automatic_failover_enabled = var.num_cache_nodes > 1
  multi_az_enabled           = var.environment == "production"

  tags = local.common_tags

  # Add log delivery configuration
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "${var.project_name}-redis-params-${var.environment}-v2"

  # Performance and memory optimizations
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru" # Evict keys with expiration set using LRU
  }

  parameter {
    name  = "lazyfree-lazy-eviction"
    value = "yes" # Asynchronous deletions
  }

  # Security settings
  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = local.common_tags
}

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-redis-subnet-${var.environment}-v2"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for Redis cluster"

  tags = local.common_tags
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-${var.environment}-v2"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-redis-${var.environment}-v2"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Security group rule for Redis access
resource "aws_security_group_rule" "redis_ingress" {
  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = var.eks_security_group_id
  description              = "Allow Redis access from EKS nodes"
}

# Allow egress traffic
resource "aws_security_group_rule" "redis_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.redis.id
  description       = "Allow all outbound traffic"
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-v2/redis"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}
