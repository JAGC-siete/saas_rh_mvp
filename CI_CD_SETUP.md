# 🚀 CI/CD Setup Guide - HR SaaS Sistema de Recursos Humanos

## 📋 Overview

Este documento describe la configuración completa de CI/CD para el sistema HR SaaS utilizando GitHub Actions, Railway y Supabase.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │   Railway       │    │   Supabase      │
│   (Source)      │───▶│   (Hosting)     │───▶│   (Database)    │
│                 │    │                 │    │                 │
│ • Code Storage  │    │ • Web Hosting   │    │ • PostgreSQL    │
│ • CI/CD Actions │    │ • Auto Deploy   │    │ • Auth System   │
│ • Branch Rules  │    │ • Environment   │    │ • Migrations    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Pipeline Stages

### 1. 🧪 **Testing & Quality**
- ✅ Code linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests
- ✅ Security audit
- ✅ Code coverage

### 2. 🏗️ **Build Verification**
- ✅ Next.js build
- ✅ Asset optimization
- ✅ Bundle analysis
- ✅ Build caching

### 3. 🚢 **Deployment**
- ✅ Staging (develop branch)
- ✅ Production (main branch)
- ✅ Health checks
- ✅ Rollback capability

### 4. 🗄️ **Database Management**
- ✅ Schema migrations
- ✅ Data validation
- ✅ Backup verification

## 🌍 Environments

### 🧪 Staging Environment
- **Branch**: `develop`
- **URL**: `https://staging-hr-saas.railway.app`
- **Database**: Supabase staging project
- **Auto-deploy**: ✅ Enabled

### 🌟 Production Environment
- **Branch**: `main`
- **URL**: `https://hr-saas.railway.app`
- **Database**: Supabase production project
- **Auto-deploy**: ✅ Enabled (with approval)

## 🔧 Setup Instructions

### 1. GitHub Repository Setup

```bash
# 1. Clone repository
git clone https://github.com/JAGC-siete/saas_rh_mvp.git
cd saas_rh_mvp

# 2. Set up branch protection rules
# - Require pull request reviews
# - Require status checks
# - Restrict pushes to main branch
```

### 2. Railway Configuration

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link project
railway link

# 4. Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
```

### 3. Supabase Setup

```sql
-- 1. Create staging and production projects
-- 2. Run initial migrations
-- 3. Set up environment variables
-- 4. Configure database policies
```

## 🔐 Environment Variables

### Required Variables

| Variable | Staging | Production | Description |
|----------|---------|------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | Supabase service role key |
| `SKIP_ENV_VALIDATION` | ✅ | ❌ | Skip validation in CI |

### GitHub Secrets

```bash
# Set these in GitHub repository settings > Secrets
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RAILWAY_TOKEN (for CLI deployments)
```

## 🚦 Workflow Triggers

### Automatic Triggers
- ✅ Push to `main` → Production deployment
- ✅ Push to `develop` → Staging deployment  
- ✅ Pull Request → Tests only
- ✅ Manual trigger → Any environment

### Branch Strategy
```
main (production)
  ├── develop (staging)
  │   ├── feature/attendance-system
  │   ├── feature/payroll-module
  │   └── hotfix/urgent-fix
  └── release/v1.2.0
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  })
}
```

### Monitoring Services
- ✅ Railway metrics
- ✅ Supabase monitoring
- ✅ GitHub Actions insights
- ✅ Custom health checks

## 🛡️ Security Measures

### Code Security
- ✅ Dependency scanning
- ✅ SAST (Static Analysis)
- ✅ Secret detection
- ✅ License compliance

### Deploy Security
- ✅ Environment isolation
- ✅ Encrypted secrets
- ✅ Access controls
- ✅ Audit logging

## 🔄 Rollback Strategy

### Automatic Rollbacks
- ❌ Health check failures
- ❌ Critical errors
- ❌ Performance degradation

### Manual Rollbacks
```bash
# Railway rollback
railway rollback <deployment-id>

# Database rollback
supabase db reset --db-url <connection-string>
```

## 📈 Performance Optimization

### Build Optimization
- ✅ Bundle splitting
- ✅ Image optimization
- ✅ Static generation
- ✅ Caching strategies

### Runtime Optimization
- ✅ CDN integration
- ✅ Database indexing
- ✅ Query optimization
- ✅ Resource monitoring

## 🧪 Testing Strategy

### Test Types
```typescript
// Unit tests
npm run test:unit

// Integration tests  
npm run test:integration

// E2E tests
npm run test:e2e

// Performance tests
npm run test:performance
```

### Coverage Requirements
- ✅ Unit tests: >80%
- ✅ Integration: >70%
- ✅ E2E: Critical paths
- ✅ Performance: Core features

## 📚 Documentation

### Deployment Logs
- ✅ Build logs
- ✅ Deploy logs
- ✅ Error logs
- ✅ Performance metrics

### Change Tracking
- ✅ Commit messages
- ✅ PR descriptions
- ✅ Release notes
- ✅ Migration logs

## 🚨 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build failures | Check dependencies and environment variables |
| Test failures | Review failing tests and fix issues |
| Deploy failures | Verify Railway configuration |
| DB connection | Check Supabase credentials and network |

### Debug Commands
```bash
# Check environment
npm run env:check

# Test build locally
npm run build

# Test database connection
npm run db:test

# Railway logs
railway logs
```

## 📞 Support Contacts

### Team Responsibilities
- **DevOps**: Railway + GitHub Actions
- **Backend**: Supabase + API endpoints  
- **Frontend**: Next.js + UI components
- **QA**: Testing + quality assurance

### Emergency Contacts
- 🚨 Production issues: Immediate escalation
- 🐛 Bug reports: GitHub issues
- 💡 Feature requests: Product backlog
- ❓ General questions: Team chat

---

## ⚡ Quick Start Commands

```bash
# Development
npm run dev

# Testing
npm run test
npm run lint

# Building
npm run build
npm run start

# Deployment
git push origin develop  # → Staging
git push origin main     # → Production
```

**Status**: ✅ **Active** | **Last Updated**: January 2025 | **Version**: 1.0.0
