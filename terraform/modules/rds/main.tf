# RDS Instance
resource "aws_db_instance" "main" {
  identifier        = "${var.project_name}-db-${var.environment}"
  engine            = "postgres"
  engine_version    = "17"
  instance_class    = var.db_instance_class
  allocated_storage = 20

  db_name  = "saas_db"
  username = "admin"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # MVP Backup Configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"  # UTC time
  maintenance_window     = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot = true
  
  # Enable automated backups
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-db-${var.environment}-final"
  delete_automated_backups = false

  # Enable enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-${var.environment}"
  description = "Allow inbound traffic for RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.project_name}-db-subnet-${var.environment}"
    Environment = var.environment
  }
}

# Generate random password for RDS
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# RDS Enhanced Monitoring Role
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring.name
}
