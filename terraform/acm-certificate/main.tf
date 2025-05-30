provider "aws" {
  region = "us-east-1"  # CloudFront requires certificates in us-east-1
}

resource "aws_acm_certificate" "cert" {
  domain_name               = "humanosisu.com"
  subject_alternative_names = ["*.humanosisu.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "humanosisu-wildcard"
    Environment = "staging"
  }
}

# Output the certificate ARN
output "certificate_arn" {
  value = aws_acm_certificate.cert.arn
}

# Output validation details for DNS validation
output "domain_validation_options" {
  value = aws_acm_certificate.cert.domain_validation_options
}
