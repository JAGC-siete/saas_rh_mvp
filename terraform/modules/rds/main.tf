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

# Random password for RDS master user
resource "random_password" "master" {
  length           = 32  # Increased length for better security
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store the password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name        = "${var.project_name}-${var.environment}-rds-password"
  description = "RDS master user password"
  kms_key_id  = var.kms_key_arn

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    host     = aws_db_instance.main.endpoint
    dbname   = var.database_name
  })
}

# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  name_prefix = "${var.project_name}-${var.environment}"
  family      = "postgres14"
  description = "Custom parameter group for PostgreSQL"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"  # Enable query performance monitoring
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"  # Force SSL connections
  }

  tags = local.common_tags
}

# RDS DB subnet group
resource "aws_db_subnet_group" "main" {
  name_prefix = "${var.project_name}-${var.environment}"
  subnet_ids  = var.subnet_ids
  
  tags = local.common_tags
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier        = "${var.project_name}-db-${var.environment}"
  engine            = "postgres"
  engine_version    = var.engine_version
  instance_class    = var.instance_class
  
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type         = "gp3"
  
  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id      = var.kms_key_arn

  # Enable storage encryption
  storage_encrypted = true
  kms_key_id       = var.kms_key_arn

  # Backup Configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  copy_tags_to_snapshot = true
  
  # Enhanced monitoring (role managed in monitoring module)
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_role_arn # Role ARN will be passed from monitoring module

  # Multi-AZ for production
  multi_az = var.environment == "production"

  # Network configuration
  publicly_accessible    = false
  port                  = 5432

  # Deletion protection for production
  deletion_protection   = var.environment == "production"
  
  # Final snapshot configuration
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-db-${var.environment}-final"
  delete_automated_backups = false

  tags = local.common_tags
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-${var.environment}"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-rds-${var.environment}"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Security group rule for PostgreSQL access
resource "aws_security_group_rule" "rds_ingress" {
  type                     = "ingress"
  from_port               = 5432
  to_port                 = 5432
  protocol                = "tcp"
  security_group_id       = aws_security_group.rds.id
  source_security_group_id = var.eks_security_group_id  # Allow access from EKS nodes
  description            = "Allow PostgreSQL access from EKS nodes"
}

# Allow egress traffic
resource "aws_security_group_rule" "rds_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.rds.id
  description       = "Allow all outbound traffic"
}

# RDS Enhanced Monitoring Role is defined in monitoring.tf
