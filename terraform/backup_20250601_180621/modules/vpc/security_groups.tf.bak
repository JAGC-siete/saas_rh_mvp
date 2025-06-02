# Security Groups
resource "aws_security_group" "default" {
  name_prefix = "${var.project_name}-default-sg"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.security_group_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-default-sg"
      Environment = var.environment
    }
  )
}

# Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-sg"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-alb-sg"
      Environment = var.environment
    }
  )
}

# EKS Worker Nodes Security Group
resource "aws_security_group" "workers" {
  name_prefix = "${var.project_name}-workers-sg"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port = 0
    protocol        = "-1"
    security_groups = [aws_security_group.default.id]
    description     = "Allow all traffic from default security group"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.tags,
    {
      Name                                                           = "${var.project_name}-workers-sg"
      Environment                                                    = var.environment
      "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "owned"
    }
  )
}
