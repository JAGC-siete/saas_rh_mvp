# CloudFront Integration Guide

This guide explains how to integrate CloudFront with our S3 static website hosting setup to improve performance and security.

## Prerequisites

1. A registered domain name (currently using `humanosisu.com`)
2. DNS records properly configured (Route53 or other provider)
3. An SSL/TLS certificate for your domain (AWS ACM)

## Steps to Enable CloudFront

### 1. Request an ACM Certificate

You have two options to create the ACM certificate:

#### Option A: Using the AWS CLI Script

Run the provided script to request an ACM certificate:

```bash
cd terraform
./setup-cloudfront-cert.sh
```

This will request a certificate for `humanosisu.com` and `*.humanosisu.com`.

#### Option B: Using Terraform (Recommended)

Use the provided Terraform configuration to create and manage the certificate:

```bash
cd terraform/acm-certificate
terraform init
terraform apply
```

After applying, you'll receive the certificate ARN and validation details in the output.

#### Certificate Validation

Regardless of which method you use, you will need to verify ownership of the domain by:
- Adding DNS records if using Route53 (you'll need to create TXT records with the values provided)
- OR clicking on a verification link sent to the domain's administrative email address

**Important:** The certificate must be created in the `us-east-1` region, as this is required for CloudFront.

### 2. Update Terraform Variables

Once the certificate is issued, update the `staging.tfvars` file with:

```
acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"
enable_cloudfront   = true
```

Replace `ACCOUNT_ID` and `CERTIFICATE_ID` with the appropriate values from your AWS account.

### 3. Apply Terraform Changes

Run the following commands to apply the CloudFront configuration:

```bash
cd terraform
terraform init
terraform plan -var-file=staging.tfvars -out=tfplan
terraform apply tfplan
```

### 4. Update GitHub Actions Workflow

Update the GitHub Actions workflow to invalidate the CloudFront distribution when deploying:

1. Add the CloudFront distribution ID as a GitHub secret: `CLOUDFRONT_DISTRIBUTION_ID`
2. The workflow will automatically invalidate the CloudFront cache on each deployment

### 5. Point Domain to CloudFront

Update your DNS records to point your domain (www.humanosisu.com) to the CloudFront distribution domain name.

### Benefits of CloudFront

- **Performance**: Content is cached at edge locations around the world
- **Security**: HTTPS support
- **Cost**: Reduced S3 data transfer costs
- **Reliability**: High availability through AWS's global network
