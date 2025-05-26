security_group_rules = {
  # Allow inbound HTTP traffic
  http = {
    type        = "ingress"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow inbound HTTP traffic"
  }

  # Allow inbound HTTPS traffic
  https = {
    type        = "ingress"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow inbound HTTPS traffic"
  }

  # Allow inbound PostgreSQL traffic from private subnets
  postgres = {
    type        = "ingress"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]  # Private subnet CIDRs
    description = "Allow PostgreSQL traffic from private subnets"
  }

  # Allow inbound Redis traffic from private subnets
  redis = {
    type        = "ingress"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]  # Private subnet CIDRs
    description = "Allow Redis traffic from private subnets"
  }

  # Allow inbound Node.js application traffic
  nodejs = {
    type        = "ingress"
    from_port   = 3000
    to_port     = 3003
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # VPC CIDR
    description = "Allow Node.js application traffic"
  }
}
