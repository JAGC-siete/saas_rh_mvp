# KMS key for encrypting sensitive data
resource "aws_kms_key" "main" {
  description             = "KMS key for encrypting sensitive data"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = data.aws_iam_policy_document.kms.json

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

data "aws_iam_policy_document" "kms" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = var.eks_cluster_role_arn != "" ? [1] : []
    content {
      sid    = "Allow EKS to use the key"
      effect = "Allow"
      principals {
        type        = "AWS"
        identifiers = [var.eks_cluster_role_arn]
      }
      actions = [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ]
      resources = ["*"]
    }
  }
}

output "key_id" {
  value = aws_kms_key.main.key_id
}

output "key_arn" {
  value = aws_kms_key.main.arn
}
