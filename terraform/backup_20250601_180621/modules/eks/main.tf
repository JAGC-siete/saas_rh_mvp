# Locals
locals {
  cluster_name = coalesce(var.cluster_name, "${var.project_name}-${var.environment}-eks2")

  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  )
}

# IAM role for EKS node groups
resource "aws_iam_role" "node_group" {
  name = "${local.cluster_name}-ng-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = local.common_tags
}

# Attach required policies to node group role
resource "aws_iam_role_policy_attachment" "node_group_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node_group.name
}

# EKS Cluster
module "eks" {
  source = "../eks-aws"

  cluster_name    = local.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  create_cloudwatch_log_group            = true
  cloudwatch_log_group_retention_in_days = var.log_retention_days

  # Disable KMS encryption to avoid configuration issues
  create_kms_key            = false
  cluster_encryption_config = {}

  # EKS Managed Node Group(s)
  eks_managed_node_groups = {
    general = {
      name = "${local.cluster_name}-ng"

      instance_types = var.instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.min_size
      max_size     = var.max_size
      desired_size = var.desired_size

      subnet_ids = var.private_subnets

      # Use the pre-created IAM role to avoid for_each issues
      create_iam_role = var.create_iam_role
      iam_role_arn    = var.create_iam_role ? null : aws_iam_role.node_group.arn

      # Disable automatic policy attachments
      iam_role_attach_cni_policy   = var.iam_role_attach_cni_policy
      iam_role_additional_policies = {}

      # Node disk configuration
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size = 50
            volume_type = "gp3"
            encrypted   = true
          }
        }
      }

      labels = {
        Environment = var.environment
        NodeGroup   = "general"
      }

      tags = local.common_tags
    }
  }

  tags = local.common_tags
}

# Create a role policy instead of inline policy
resource "aws_iam_role_policy" "cluster_policy" {
  name = "${local.cluster_name}-cluster-policy-v2"
  role = module.eks.cluster_iam_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:*",
          "ec2:*",
          "elasticloadbalancing:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Additional Security Group for EKS nodes
resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.project_name}-${var.environment}-nd"
  description = "Additional security group for EKS nodes"
  vpc_id      = var.vpc_id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-nodes"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Allow traffic from ALB to nodes
resource "aws_security_group_rule" "nodes_ingress_alb" {
  description              = "Allow inbound traffic from ALB"
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.eks_nodes.id
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name_prefix = "${local.cluster_name}-alb-v2"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  tags = merge(
    local.common_tags,
    {
      Name = "${local.cluster_name}-alb-v2"
    }
  )
}

# Allow HTTPS inbound to ALB
resource "aws_security_group_rule" "alb_ingress_https" {
  description       = "Allow HTTPS inbound"
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# Allow HTTP inbound to ALB (redirect to HTTPS)
resource "aws_security_group_rule" "alb_ingress_http" {
  description       = "Allow HTTP inbound"
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# Allow all outbound from ALB
resource "aws_security_group_rule" "alb_egress" {
  description       = "Allow all outbound"
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# AWS Load Balancer Controller IAM policy
data "aws_iam_policy_document" "alb_controller" {
  statement {
    effect = "Allow"
    actions = [
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
      "ec2:GetCoipPoolUsage",
      "ec2:DescribeCoipPools",
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
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:DescribeUserPoolClient",
      "acm:ListCertificates",
      "acm:DescribeCertificate",
      "iam:ListServerCertificates",
      "iam:GetServerCertificate",
      "waf-regional:GetWebACL",
      "waf-regional:GetWebACLForResource",
      "waf-regional:AssociateWebACL",
      "waf-regional:DisassociateWebACL",
      "wafv2:GetWebACL",
      "wafv2:GetWebACLForResource",
      "wafv2:AssociateWebACL",
      "wafv2:DisassociateWebACL",
      "shield:GetSubscriptionState",
      "shield:DescribeProtection",
      "shield:CreateProtection",
      "shield:DeleteProtection"
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:RevokeSecurityGroupIngress"
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "elasticloadbalancing:CreateListener",
      "elasticloadbalancing:DeleteListener",
      "elasticloadbalancing:CreateRule",
      "elasticloadbalancing:DeleteRule"
    ]
    resources = ["*"]
  }
}

# Create the policy using the policy document
resource "aws_iam_policy" "alb_controller" {
  name_prefix = "${local.cluster_name}-alb-controller"
  description = "IAM policy for AWS Load Balancer Controller"
  policy      = data.aws_iam_policy_document.alb_controller.json
}

# CloudWatch Log Group for EKS cluster logging
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${local.cluster_name}/cluster"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}
