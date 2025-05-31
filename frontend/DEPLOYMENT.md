# Deployment Guide for Humano SISU Frontend

This guide outlines the complete process for deploying the Humano SISU frontend application to production using AWS S3 and CloudFront.

## Prerequisites

- AWS CLI installed and configured with appropriate credentials
- Access to the S3 bucket `www.humanosisu.com`
- Access to the CloudFront distribution `E3JC3C46Y6RAHD`
- Node.js 18+ and npm

## Build Process

1. **Prepare environment variables**

   Create a production `.env.production` file with the necessary environment variables:

   ```bash
   NEXT_PUBLIC_MANATAL_API_TOKEN=your_production_token
   NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_measurement_id
   NEXT_PUBLIC_ENV=production
   ```

2. **Build the application**

   ```bash
   # Install dependencies if needed
   npm install
   
   # Build for production
   npm run build
   ```

   This will create a `dist` directory with the production build.

## Deployment Process

1. **Deploy to S3**

   ```bash
   aws s3 sync dist/ s3://www.humanosisu.com --delete
   ```

   The `--delete` flag will remove any files in the S3 bucket that are not in the `dist` directory.

2. **Invalidate CloudFront cache**

   ```bash
   aws cloudfront create-invalidation --distribution-id E3JC3C46Y6RAHD --paths "/*"
   ```

   This ensures that CloudFront serves the new version of your files instead of cached versions.

3. **Verify deployment**

   Visit the production URL to verify that the deployment was successful:
   https://www.humanosisu.com

## Rollback Procedure

If there are issues with the deployment, you can roll back to a previous version:

1. **Identify the previous version**

   ```bash
   aws s3 ls s3://www.humanosisu.com-backups/ --recursive
   ```

2. **Restore from backup**

   ```bash
   # Copy backup to production
   aws s3 sync s3://www.humanosisu.com-backups/YYYY-MM-DD/ s3://www.humanosisu.com --delete
   
   # Invalidate CloudFront cache
   aws cloudfront create-invalidation --distribution-id E3JC3C46Y6RAHD --paths "/*"
   ```

## Backup Procedure

Before deploying, it's good practice to backup the current version:

```bash
# Create a dated backup
aws s3 sync s3://www.humanosisu.com s3://www.humanosisu.com-backups/$(date +%Y-%m-%d)/
```

## Automating Deployments

For automated deployments, we use GitHub Actions. The workflow is defined in `.github/workflows/frontend-cicd.yml`.

The workflow automatically:
1. Builds the application
2. Deploys to S3
3. Invalidates CloudFront cache

## Monitoring

After deployment, monitor the following:

1. **CloudFront metrics** - Check for increased error rates
2. **Application errors** - Monitor error reporting tools
3. **Google Analytics** - Verify that events are being tracked correctly

## Security Considerations

1. **API Token**
   - Ensure the Manatal API token is stored securely
   - Consider implementing server-side token handling

2. **CORS Settings**
   - Verify S3 bucket CORS settings allow necessary origins

3. **Cache Control**
   - Set appropriate cache control headers for static assets

## Troubleshooting

### Common Issues

1. **CloudFront is serving old content**
   - Check if the invalidation was successful
   - Try a hard refresh in your browser

2. **Missing environment variables**
   - Verify that all environment variables are correctly set in `.env.production`

3. **404 errors for routes**
   - Ensure CloudFront is configured to redirect to `index.html` for SPA routing

### Support Contacts

For deployment issues, contact:
- DevOps Team: devops@humanosisu.com
- Cloud Infrastructure: cloud@humanosisu.com
