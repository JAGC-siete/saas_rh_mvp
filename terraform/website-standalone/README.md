# Standalone Website Terraform Configuration

This directory contains a standalone Terraform configuration for the S3 static website.

## Purpose

This configuration allows us to manage the S3 bucket website hosting configuration independently from the rest of the infrastructure. It's useful for:

1. Importing existing S3 buckets into Terraform management
2. Quick changes to website configuration without affecting other resources
3. Testing website settings before applying them to the full infrastructure

## Usage

### Import an Existing S3 Bucket

```bash
# Make the import script executable
chmod +x import.sh

# Run the import script
./import.sh
```

### Apply Changes

```bash
# Initialize Terraform
terraform init

# Apply the changes
terraform apply
```

### Outputs

- `website_endpoint`: The S3 website endpoint URL
- `bucket_name`: The name of the S3 bucket

## Resources Managed

- S3 bucket
- Website configuration
- Bucket policy for public access
- CORS configuration

## Next Steps

Once you're satisfied with the website configuration, you can integrate CloudFront to enable HTTPS and improve performance. See the CloudFront integration guide at `/docs/cloudfront-integration.md` for instructions.
