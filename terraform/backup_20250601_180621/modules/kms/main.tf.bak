# KMS key for encrypting sensitive data
resource "aws_kms_key" "main" {
  description             = "KMS key for encrypting sensitive data"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow EKS service to use the key"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow EKS cluster role to use the key"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "aws:PrincipalArn" : [
              "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-eks-*",
              "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-cluster-*"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project_name}-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}

data "aws_caller_identity" "current" {}

output "key_id" {
  value = aws_kms_key.main.key_id
}

output "key_arn" {
  value = aws_kms_key.main.arn
}
