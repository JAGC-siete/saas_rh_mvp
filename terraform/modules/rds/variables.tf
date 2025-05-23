variable "environment" {
  description = "Environment (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnets" {
  description = "List of subnet IDs for the RDS instance"
  type        = list(string)
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "14.7"
}

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "saas_db"
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}
