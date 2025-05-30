# Random password generation for RDS
resource "random_password" "rds" {
  length  = 16
  special = true
  # Ensure password meets RDS requirements
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# RDS credentials secret
resource "aws_secretsmanager_secret" "rds" {
  name = "${var.project_name}-${var.environment}-rds-v2"
  description = "RDS credentials for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.recovery_window_in_days
  kms_key_id = var.kms_key_arn

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-rds-v2"
      Environment = var.environment
    },
    var.tags
  )
}

resource "aws_secretsmanager_secret_version" "rds" {
  secret_id = aws_secretsmanager_secret.rds.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.rds.result
    engine   = "postgres"
    port     = 5432
  })
}

# Redis auth token
resource "random_password" "redis" {
  length  = 32
  special = false  # Avoid special chars for Redis auth
}

resource "aws_secretsmanager_secret" "redis" {
  name = "${var.project_name}-${var.environment}-redis-v2"
  description = "Redis credentials for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.recovery_window_in_days
  kms_key_id = var.kms_key_arn

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-redis-v2"
      Environment = var.environment
    },
    var.tags
  )
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    auth_token = random_password.redis.result
  })
}

# JWT signing key
resource "random_password" "jwt" {
  length  = 32
  special = true
  override_special = "!@#$%^&*"
}

resource "aws_secretsmanager_secret" "jwt" {
  name = "${var.project_name}-${var.environment}-jwt-v2"
  description = "JWT signing key for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.recovery_window_in_days
  kms_key_id = var.kms_key_arn

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-jwt-v2"
      Environment = var.environment
    },
    var.tags
  )
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    signing_key = random_password.jwt.result
  })
}

# Outputs
output "rds_secret_arn" {
  description = "ARN of the RDS credentials secret"
  value       = aws_secretsmanager_secret.rds.arn
}

output "rds_secret_version" {
  description = "Secret version ID of RDS credentials"
  value       = aws_secretsmanager_secret_version.rds.version_id
}

output "redis_secret_arn" {
  description = "ARN of the Redis credentials secret"
  value       = aws_secretsmanager_secret.redis.arn
}

output "jwt_secret_arn" {
  description = "ARN of the JWT signing key secret"
  value       = aws_secretsmanager_secret.jwt.arn
}
