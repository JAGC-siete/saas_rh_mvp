# Railway Deployment Guide - Environment Variables

## 🚀 Step-by-Step Railway Setup

### 1. Pre-deployment Checks

```bash
# Run local environment validation
npm run env:check

# Run security checks  
npm run security:check

# Install git hooks
npm run setup:hooks
```

### 2. Railway Environment Variables Setup

**In Railway Dashboard → Your Project → Variables tab, add:**

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_real_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_real_service_role_key
JWT_SECRET=your_32_character_minimum_jwt_secret
NEXTAUTH_SECRET=your_32_character_minimum_nextauth_secret
NEXTAUTH_URL=https://your-app.railway.app
```

#### Optional Variables (only if needed):
```
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://user:pass@host:6379
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_public
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Generate Secure Secrets

```bash
# Generate JWT_SECRET (32+ characters)
openssl rand -base64 32

# Generate NEXTAUTH_SECRET (32+ characters)  
openssl rand -base64 32
```

### 4. Railway CLI Commands

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Set environment variables via CLI (alternative to UI)
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Deploy
railway up
```

### 5. Verification Commands

```bash
# Check if environment is properly configured
railway run npm run env:check

# View current variables
railway variables

# Check deployment logs
railway logs
```

## 🔒 Security Best Practices

### ✅ Do:
- Use Railway Variables UI for all secrets
- Keep `.env.example` with PLACEHOLDER values only
- Use strong, randomly generated secrets
- Set NEXTAUTH_URL to your Railway domain
- Enable git hooks with `npm run setup:hooks`

### ❌ Don't:
- Commit real `.env` files to git
- Use placeholder values in production
- Store secrets in code or config files
- Use `localhost` URLs in production
- Skip environment validation

## 🐛 Troubleshooting

### Build Fails with "Potential credential found"
```bash
# Check .env.example for real values
npm run security:check

# Verify .env.example only has placeholders
cat .env.example | grep -E "(PLACEHOLDER|placeholder)"
```

### Environment Validation Fails
```bash
# Check what's missing
npm run env:check

# Set missing variables in Railway dashboard
railway variables set VARIABLE_NAME=value
```

### App Starts but Features Don't Work
```bash
# Verify all required variables are set
railway run npm run env:check

# Check Railway logs for runtime errors
railway logs --tail
```

## 📋 Deployment Checklist

- [ ] All placeholder values removed from `.env.example`
- [ ] Git hooks installed (`npm run setup:hooks`)
- [ ] All required environment variables set in Railway
- [ ] NEXTAUTH_URL points to Railway domain
- [ ] Secrets are 32+ characters and randomly generated
- [ ] Security check passes (`npm run security:check`)
- [ ] Environment validation passes (`npm run env:check`)
- [ ] Test deployment successful
- [ ] Application functions correctly in production

## 🔗 Useful Links

- [Railway Variables Documentation](https://docs.railway.app/reference/variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Environment Setup](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
