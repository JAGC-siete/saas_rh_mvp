# Security groups for inter-service communication
resource "aws_security_group" "eks" {
  name_prefix = "${var.project_name}-eks-${var.environment}-v2"
  description = "Security group for EKS cluster nodes"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-eks-${var.environment}-v2"
    }
  )
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-${var.environment}-v2"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-rds-${var.environment}-v2"
    }
  )
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${var.project_name}-elasticache-${var.environment}-v2"
  description = "Security group for ElastiCache"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-elasticache-${var.environment}-v2"
    }
  )
}

# Security group rules
resource "aws_security_group_rule" "rds_from_eks" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks.id
  security_group_id        = aws_security_group.rds.id
  description              = "Allow PostgreSQL access from EKS nodes"
}

resource "aws_security_group_rule" "elasticache_from_eks" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks.id
  security_group_id        = aws_security_group.elasticache.id
  description              = "Allow Redis access from EKS nodes"
}

# Allow all outbound traffic
resource "aws_security_group_rule" "eks_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.eks.id
  description       = "Allow all outbound traffic"
}

resource "aws_security_group_rule" "rds_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.rds.id
  description       = "Allow all outbound traffic"
}

resource "aws_security_group_rule" "elasticache_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.elasticache.id
  description       = "Allow all outbound traffic"
}
