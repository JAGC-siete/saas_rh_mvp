# Environment Setup Guide

## Development Environment

### Prerequisites
- Node.js v18+
- Docker Desktop
- AWS CLI
- Terraform CLI
- Git

### Local Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd saas-proyecto

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.template .env

# 4. Start development environment
docker-compose up -d

# 5. Run migrations
cd postgres-init
./init.sql

# 6. Start services
npm start
```

### Environment Variables
Create these files:
- `.env` in project root
- `bases_de_datos/.env`
- `asistencia/.env`
- `nomina/.env`

Required variables:
```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=saas_db
DB_USER=admin
DB_PASSWORD=secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_secret

# Security
NODE_ENV=development
SESSION_SECRET=dev-secret
CORS_ORIGIN=http://localhost:3000

# AWS (for local development)
AWS_REGION=us-west-2
AWS_PROFILE=saas-rh-dev
```

### Docker Configuration
Update Docker resources:
- CPUs: 4
- Memory: 8GB
- Swap: 1GB

### IDE Setup
VS Code recommended extensions:
- ESLint
- Prettier
- Docker
- HashiCorp Terraform
- AWS Toolkit

### Testing
```bash
# Run all tests
npm test

# Run specific service tests
cd bases_de_datos && npm test
cd asistencia && npm test
cd nomina && npm test
```

## Production Environment

### AWS Access
1. Create IAM user
2. Assign necessary permissions
3. Configure AWS CLI
```bash
aws configure --profile saas-rh-prod
```

### Domain Setup
1. Register domain in Route53
2. Request SSL certificate
3. Update DNS records

### Database Setup
1. Create RDS instance
2. Configure security groups
3. Run initial migrations

### Monitoring Setup
1. Set up CloudWatch dashboards
2. Configure alerts
3. Set up log groups

## Continuous Integration

### GitHub Actions
Required secrets:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- DOCKER_USERNAME
- DOCKER_PASSWORD

### Branch Strategy
- main: production
- develop: staging
- feature/*: development

### Code Quality
- ESLint configuration
- Prettier setup
- Pre-commit hooks
