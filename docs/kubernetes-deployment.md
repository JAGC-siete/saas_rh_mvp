# Kubernetes Deployment Strategy

This document outlines the Kubernetes deployment strategy for the Humano SISU platform.

## Overview

The application is deployed on Amazon EKS (Elastic Kubernetes Service) with the following components:

- Microservices architecture with multiple deployments
- AWS Load Balancer Controller for ingress management
- Horizontal Pod Autoscaling for dynamic scaling
- Network Policies for enhanced security
- ConfigMaps and Secrets for configuration management

## Namespace Structure

All application components are deployed in the `humanosisu` namespace. This provides isolation and easy management of resources.

## Components

### Microservices

| Service | Description | Port | Path |
|---------|-------------|------|------|
| `frontend` | User interface | 80 | `/` |
| `asistencia` | Attendance management | 3003 | `/` |
| `nomina` | Payroll processing | 3002 | `/` |
| `bases_de_datos` | Database API | 3001 | `/` |

### Ingress Controllers

The application uses AWS Load Balancer Controller to manage ingress traffic. Each microservice has its own ingress configuration with:

- TLS termination
- Health checks
- Custom annotations for AWS ALB configuration

### Configuration Management

Configuration is managed securely through AWS services:
- **ConfigMaps**: Application configuration
- **AWS Secrets Manager**: Sensitive data management
- **Environment Variables**: Runtime configuration

## Resource Management

### Resource Requests and Limits

Each deployment includes resource requests and limits to ensure proper scheduling and prevent resource starvation:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Horizontal Pod Autoscaler

HPAs are configured to scale services based on:

- CPU utilization (70%)
- Memory utilization (80%)

## High Availability

Several mechanisms ensure high availability:

1. **Pod Disruption Budgets**: Ensure minimum availability during node maintenance
2. **Liveness Probes**: Detect and replace unhealthy containers
3. **Readiness Probes**: Prevent traffic to containers not ready to serve requests
4. **Multi-AZ Deployment**: Pods distributed across availability zones

## Network Security

Network Policies implement the principle of least privilege:

1. **Default Deny**: Block all traffic by default
2. **Service-Specific Policies**: Allow only necessary traffic between services
3. **External Access Control**: Restrict outbound connections to trusted endpoints

## CI/CD Integration

The Kubernetes manifests are applied through CI/CD pipelines:

1. **Environment Variables**: Substituted at deploy time
2. **Dynamic Tags**: Container images tagged with environment and commit hash
3. **Staged Rollouts**: Controlled deployment across environments

## Monitoring and Operations

### Health Checks

Each service includes:

- **Liveness Probe**: `/health` endpoint to verify service is alive
- **Readiness Probe**: `/health` endpoint to verify service is ready to serve traffic

### Monitoring Tools

Use these tools to monitor deployments:

```bash
# Check deployment status
./scripts/check-k8s-status.sh

# View pod logs
kubectl logs -n humanosisu -l app=<service-name>

# Get resource usage
kubectl top pods -n humanosisu
```

## Database Migrations

Database migrations are handled as Kubernetes Jobs:

1. Run before service deployment
2. Automatic rollback on failure
3. Independent versioning

## Security Considerations

1. **Pod Security Context**: Runs containers as non-root user
2. **Secret Management**: Sensitive configuration managed through AWS Secrets Manager and securely injected into Kubernetes
3. **Network Policies**: Restricts communication between pods
