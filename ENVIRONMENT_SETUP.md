# 🔐 Environment Variables Setup - Professional Guide

## 📋 Overview

This project uses environment variables for configuration. **Never commit sensitive data to version control.**

## 🚀 Quick Setup

### For Developers

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saas-proyecto
   ```

2. **Setup environment variables**
   ```bash
   ./scripts/setup-env.sh
   ```

3. **Edit .env.local with your values**
   ```bash
   nano .env.local
   ```

### For Production Deployment

#### Railway
```bash
# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=your_url
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

#### Vercel
```bash
# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

## 🔧 Required Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `NODE_ENV` | Environment (development/production) | ✅ |
| `TIMEZONE` | Application timezone | ✅ |
| `LOCALE` | Application locale | ✅ |

## 🛡️ Security Best Practices

### ✅ DO
- Use `.env.example` for documentation
- Set variables in deployment platform
- Use Railway CLI for production
- Validate variables at runtime

### ❌ DON'T
- Commit `.env.local` to Git
- Share secrets in chat/email
- Use hardcoded values
- Store secrets in code

## 🔍 Validation

Run the validation script to check your setup:
```bash
node scripts/verify-env.js
```

## 🚨 Troubleshooting

### "Missing environment variables" error
1. Check `.env.local` exists
2. Verify all required variables are set
3. Restart development server

### Build fails in production
1. Check Railway/Vercel environment variables
2. Ensure all required variables are set
3. Verify variable names match exactly

## 📚 Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/environment-variables)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables) 