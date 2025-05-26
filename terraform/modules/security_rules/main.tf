resource "aws_security_group_rule" "rds_to_eks" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.eks_node_security_group_id
  source_security_group_id = var.rds_security_group_id
  description             = "Allow inbound traffic from RDS"
}

resource "aws_security_group_rule" "elasticache_to_eks" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = var.eks_node_security_group_id
  source_security_group_id = var.elasticache_security_group_id
  description             = "Allow inbound traffic from ElastiCache"
}
