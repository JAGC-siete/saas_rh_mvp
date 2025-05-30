variable "eks_node_security_group_id" {
  description = "ID of the EKS node security group"
  type        = string
}

variable "rds_security_group_id" {
  description = "ID of the RDS security group"
  type        = string
}

variable "elasticache_security_group_id" {
  description = "ID of the ElastiCache security group"
  type        = string
}
