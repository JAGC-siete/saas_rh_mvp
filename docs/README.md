# DevOps Documentation

This directory contains documentation for DevOps practices in the Humano SISU project.

## Documents

- [Git Workflow](./git-workflow.md) - Guidelines for working with Git
- [Deployment Strategy](./deployment-strategy.md) - Overview of our deployment process
- [CloudFront Management](./cloudfront-management.md) - Guide to managing CloudFront distributions
- [Security Best Practices](./security-best-practices.md) - Guidelines for secure coding and secret management
- [Kubernetes Deployment](./kubernetes-deployment.md) - Kubernetes configuration and best practices

## CI/CD Workflows

The project uses GitHub Actions for CI/CD. Workflow files are located in `.github/workflows/`:

- `frontend-cicd.yml` - Workflow for the frontend application
- `backend-cicd.yml` - Workflow for backend services

## Getting Started

To set up your local environment with our DevOps practices:

1. Run the Git configuration script:
   ```bash
   ./setup-git-config.sh
   ```

2. Read the [Git Workflow](./git-workflow.md) document to understand our branch strategy

3. Review the [Deployment Strategy](./deployment-strategy.md) to understand how code is deployed

## Pre-commit Hooks

The project uses pre-commit hooks to ensure code quality. The hooks are set up by the `setup-git-config.sh` script.

## Environments

The project has the following environments:

- **Development**: For continuous development
- **Staging**: For pre-release testing
- **Production**: For end-users

## Contributing

When contributing to the project:

1. Create a new branch following the naming convention in the [Git Workflow](./git-workflow.md)
2. Make your changes
3. Create a pull request
4. Wait for the CI/CD pipeline to complete
5. Get your PR reviewed and approved
6. Merge your changes

## Deployment

To deploy changes:

1. For automatic deployments: push to the appropriate branch
2. For manual deployments: use the GitHub Actions workflow dispatch

## Monitoring

The project uses AWS CloudWatch for monitoring. See the AWS console for details.
