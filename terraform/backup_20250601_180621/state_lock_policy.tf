# IAM policy for Terraform state locking
data "aws_iam_policy_document" "terraform_state_lock" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem"
    ]
    resources = [data.aws_dynamodb_table.terraform_lock.arn]
  }
}

resource "aws_iam_policy" "terraform_state_lock" {
  name        = "terraform-state-lock"
  description = "Policy for Terraform state locking"
  policy      = data.aws_iam_policy_document.terraform_state_lock.json
}

# Commented out until EKS module is properly configured
# resource "aws_iam_role_policy_attachment" "terraform_state_lock" {
#   policy_arn = aws_iam_policy.terraform_state_lock.arn
#   role       = split("/", module.eks.cluster_iam_role_arn)[1]
# }
