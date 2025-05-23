provider "aws" {
  region = var.aws_region
}

data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority.0.data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "~> 19.0"
  cluster_name    = "saas-rh-${var.environment}"
  cluster_version = var.cluster_version
  
  vpc_id          = var.vpc_id
  subnet_ids      = var.private_subnets

  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true

  eks_managed_node_groups = {
    general = {
      desired_size = var.desired_size
      min_size     = var.min_size
      max_size     = var.max_size

      instance_types = var.instance_types
      capacity_type  = "ON_DEMAND"

      labels = {
        Environment = var.environment
      }

      tags = {
        Environment = var.environment
        Project     = var.project_name
      }

      # Add scaling configurations
      scaling_config = {
        desired_size = var.desired_size
        max_size     = var.max_size
        min_size     = var.min_size
      }

      # Add instance health checks
      health_check_config = {
        timeout_seconds      = 5
        interval_seconds     = 30
        healthy_threshold   = 2
        unhealthy_threshold = 2
      }

      # Add resource monitoring
      resources_monitoring = {
        enabled = true
        metrics = ["cpu", "memory"]
      }
    }
  }

  enable_irsa = true

  # Enable CloudWatch logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # Add cluster autoscaler configuration
  cluster_autoscaler = {
    enabled = true
    version = "v1.22.0"
    resources = {
      limits = {
        cpu    = "100m"
        memory = "300Mi"
      }
      requests = {
        cpu    = "100m"
        memory = "300Mi"
      }
    }
  }

  eks_managed_node_group_defaults = {
    iam_role_additional_policies = {
      AmazonEBSCSIDriverPolicy = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
      AmazonEKSClusterPolicy    = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
      CloudWatchAgentServerPolicy = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
      AWSLoadBalancerControllerIAMPolicy = aws_iam_policy.alb_controller.arn
    }
  }

  cluster_security_group_additional_rules = {
    egress_nodes_ephemeral_ports_tcp = {
      description                 = "To node 1025-65535"
      protocol                    = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "egress"
      source_node_security_group = true
    }
  }

  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
    egress_all = {
      description      = "Node all egress"
      protocol         = "-1"
      from_port        = 0
      to_port          = 0
      type            = "egress"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = ["::/0"]
    }
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

# Create IAM policy for ALB Ingress Controller
resource "aws_iam_policy" "alb_controller" {
  name        = "AWSLoadBalancerControllerIAMPolicy-${var.environment}"
  path        = "/"
  description = "ALB Ingress Controller IAM Policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:CreateServiceLinkedRole",
          "ec2:DescribeAccountAttributes",
          "ec2:DescribeAddresses",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeInstances",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeTags",
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeLoadBalancerAttributes",
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:DescribeListenerCertificates",
          "elasticloadbalancing:DescribeSSLPolicies",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetGroupAttributes",
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:DescribeTags"
        ]
        Resource = "*"
      }
    ]
  })
}
