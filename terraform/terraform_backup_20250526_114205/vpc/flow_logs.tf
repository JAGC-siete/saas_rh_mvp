# VPC Flow Logs
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-flow-log"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "flow_log" {
  name              = "/aws/vpc/${var.project_name}-${var.environment}/flow-log"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-flow-log"
    Environment = var.environment
  }
}

resource "aws_iam_role" "flow_log" {
  name = "${var.project_name}-${var.environment}-flow-log"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-flow-log-role"
    Environment = var.environment
  }
}

resource "aws_iam_policy" "flow_log" {
  name        = "${var.project_name}-${var.environment}-flow-log"
  description = "IAM policy for VPC Flow Logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_cloudwatch_log_group.flow_log.arn}:*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "flow_log" {
  policy_arn = aws_iam_policy.flow_log.arn
  role       = aws_iam_role.flow_log.name
}
