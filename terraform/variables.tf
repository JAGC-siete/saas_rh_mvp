variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (staging/production)"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "saas-rh"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instance in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance in GB"
  type        = number
  default     = 100
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "cache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring for resources"
  type        = bool
  default     = true
}

variable "log_retention_in_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "environment_tag" {
  description = "Environment tag"
  type        = string
  default     = "staging"
}

variable "team_tag" {
  description = "Team tag"
  type        = string
  default     = "devops"
}

variable "cost_center_tag" {
  description = "Cost center tag"
  type        = string
  default     = "saas-rh-staging"
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "Database subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro" # MVP: Start small, can scale up
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro" # MVP: Start small, can scale up
}

variable "domain_name" {
  description = "Main domain name for the application"
  type        = string
  default     = "saas-rh.com" # Change this to your actual domain
}
