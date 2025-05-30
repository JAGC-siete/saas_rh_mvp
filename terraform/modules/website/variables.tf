variable "website_bucket_name" {
  description = "Name of the S3 bucket for website hosting"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "enable_cloudfront" {
  description = "Whether to create a CloudFront distribution"
  type        = bool
  default     = false
}

variable "use_custom_domain" {
  description = "Whether to use a custom domain for the website"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Domain name for the website"
  type        = string
  default     = ""
}

variable "subdomain" {
  description = "Subdomain for the website (e.g., 'www' or 'app')"
  type        = string
  default     = "www"
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for the custom domain"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 zone ID for the domain"
  type        = string
  default     = ""
}
