# Placeholder for VPC module
# This is a minimal implementation for the development environment

resource "aws_vpc" "this" {
  # This resource won't be created in plan mode
  count = 0
  
  cidr_block = var.vpc_cidr
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-vpc"
    }
  )
}
