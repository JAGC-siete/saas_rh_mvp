# CloudFront Distribution Management

This document describes how to manage the CloudFront distribution for the Humano SISU frontend.

## Current Configuration

The production frontend is deployed to:

- **S3 Bucket**: `www.humanosisu.com`
- **CloudFront Distribution ID**: `E3JC3C46Y6RAHD`
- **Domain**: `www.humanosisu.com`

## Creating Cache Invalidations

When deploying changes to the frontend, you need to invalidate the CloudFront cache to ensure users see the latest version:

```bash
# Invalidate the entire distribution
aws cloudfront create-invalidation \
  --distribution-id E3JC3C46Y6RAHD \
  --paths "/*"

# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E3JC3C46Y6RAHD \
  --paths "/index.html" "/assets/*"
```

## Viewing CloudFront Distribution Status

You can check the status of the CloudFront distribution using:

```bash
aws cloudfront get-distribution --id E3JC3C46Y6RAHD
```

Or view recent invalidations:

```bash
aws cloudfront list-invalidations --distribution-id E3JC3C46Y6RAHD
```

## Managing Custom SSL Certificates

The CloudFront distribution uses an ACM certificate for SSL:

```bash
# List certificates
aws acm list-certificates --region us-east-1

# Describe the certificate for humanosisu.com
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID --region us-east-1
```

## Cache Behavior Settings

The CloudFront distribution is configured with the following cache behaviors:

- **Default TTL**: 86400 seconds (1 day)
- **Minimum TTL**: 0 seconds
- **Maximum TTL**: 31536000 seconds (1 year)

### Cache Control Headers

To control caching for specific files, use appropriate Cache-Control headers when uploading to S3:

```bash
# Upload with cache control headers
aws s3 cp ./dist/index.html s3://www.humanosisu.com/index.html --cache-control "max-age=0,no-cache,no-store,must-revalidate"
aws s3 cp ./dist/assets/ s3://www.humanosisu.com/assets/ --recursive --cache-control "max-age=31536000,public"
```

## Monitoring

You can monitor CloudFront distribution metrics in CloudWatch:

```bash
# Get request metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=E3JC3C46Y6RAHD Name=Region,Value=Global \
  --start-time $(date -v-1d -u +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 3600 \
  --statistics Sum
```

## Common Issues

### Cache Not Updating

If changes are not appearing after deployment:

1. Verify the S3 bucket contains the updated files
2. Ensure CloudFront invalidation was successful
3. Check browser cache (try hard reload with Ctrl+F5)
4. Verify the correct distribution ID was used for invalidation

### SSL Certificate Issues

If SSL certificate issues occur:

1. Verify certificate status in ACM
2. Ensure DNS validation records are correct
3. Check certificate region (must be in us-east-1 for CloudFront)
4. Verify certificate covers all required domains

## Deployment Automation

CloudFront invalidations are automatically handled in our CI/CD pipeline, which:

1. Deploys updated files to the S3 bucket
2. Creates a CloudFront invalidation for all paths
3. Logs the deployment details
