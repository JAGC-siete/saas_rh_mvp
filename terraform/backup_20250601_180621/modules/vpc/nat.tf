# NAT Gateway
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.azs)) : 0
  domain = "vpc"

  tags = merge(
    local.common_tags,
    {
      Name = var.single_nat_gateway ? "${var.project_name}-nat-eip" : "${var.project_name}-nat-eip-${count.index + 1}"
    }
  )
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.azs)) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[var.single_nat_gateway ? 0 : count.index].id

  depends_on = [aws_internet_gateway.main]

  tags = merge(
    local.common_tags,
    {
      Name = var.single_nat_gateway ? "${var.project_name}-nat" : "${var.project_name}-nat-${count.index + 1}"
    }
  )
}
