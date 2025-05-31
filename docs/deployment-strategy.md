# Deployment Strategy

This document outlines the deployment strategy for the Humano SISU platform.

## Environments

The Humano SISU platform has the following environments:

- **Development**: For continuous development and integration
- **Staging**: For pre-production testing
- **Production**: For end-user access

## Branch to Environment Mapping

| Branch | Environment | Deployment Type | Purpose |
|--------|-------------|----------------|---------|
| `develop` | Development | Automatic | Continuous integration |
| `release/*` | Staging | Automatic | Pre-release testing |
| `main` | Production | Manual | Live system |

## Deployment Process

### Frontend Deployment

The frontend is deployed to AWS S3 and served through CloudFront:

1. Code is built using Node.js and Vite
2. Built artifacts are uploaded to S3
3. CloudFront cache is invalidated
4. Deployment is tagged and documented

### Backend Deployment

Backend services are containerized and deployed to EKS:

1. Docker images are built for each service
2. Images are pushed to Amazon ECR
3. Kubernetes deployments are updated
4. Deployment is tagged and documented

## Deployment Artifacts

Each deployment creates the following artifacts:

1. **Git Tags**: `deploy-<service>-<environment>-<timestamp>`
2. **Deployment Records**: Created in `docs/deployments/`
3. **Docker Images**: Tagged with `<environment>-<commit-hash>` and `<environment>-latest`

## Rollback Procedure

To rollback a deployment:

### Frontend Rollback

```bash
# Identify the previous deployment tag
git tag -l "deploy-frontend-staging*" --sort=-committerdate | head -2 | tail -1

# Checkout the previous deployment
git checkout <previous-tag>

# Rebuild and redeploy
cd frontend && npm ci && npm run build
aws s3 sync dist/ s3://www.humanosisu.com --delete
aws cloudfront create-invalidation --distribution-id E3JC3C46Y6RAHD --paths "/*"
```

### Backend Rollback

```bash
# Identify the previous image tag
aws ecr describe-images --repository-name <service> --query 'imageDetails[*].imageTags[]' --output text | grep staging | head -2 | tail -1

# Update the Kubernetes deployment
kubectl set image deployment/<service> <container>=<ecr-repository-url>/<service>:<previous-tag>
```

## Release Management

### Releasing to Staging

1. Create a release branch: `git checkout -b release/vX.Y.Z develop`
2. Make any release-specific changes
3. Push the branch: `git push -u origin release/vX.Y.Z`
4. CI/CD automatically deploys to staging

### Promoting to Production

1. Create a pull request from `release/vX.Y.Z` to `main`
2. Get approval from required reviewers
3. Merge the pull request
4. Manually trigger production deployment:
   ```bash
   gh workflow run frontend-cicd.yml -f environment=production
   gh workflow run backend-cicd.yml -f environment=production -f services=all
   ```

## Monitoring Deployments

All deployments are monitored for:

1. Build and deployment success
2. Application health checks
3. Error rates and performance metrics
4. User-impacting issues

## Emergency Procedures

For critical issues:

1. Identify the issue and its impact
2. Implement an immediate rollback if necessary
3. Notify stakeholders
4. Investigate root cause
5. Implement and test a fix
6. Deploy the fix following expedited procedures
7. Document the incident and update procedures if needed
