variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "rds_arn" {
  description = "ARN of the RDS instance"
  type        = string
}

variable "elasticache_arn" {
  description = "ARN of the ElastiCache instance"
  type        = string
}

# Optional: Add more variables as needed for backup configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 90 # MVP default: 90 days
}
