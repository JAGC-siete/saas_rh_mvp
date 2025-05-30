#!/bin/bash

# Create an ACM certificate for CloudFront (must be in us-east-1 region)
aws acm request-certificate \
  --domain-name humanosisu.com \
  --validation-method DNS \
  --subject-alternative-names "*.humanosisu.com" \
  --region us-east-1

echo "Check your email or AWS Console to approve the certificate request."
echo "Once approved, get the certificate ARN and add it to your terraform.tfvars:"
echo "acm_certificate_arn = \"arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID\""
