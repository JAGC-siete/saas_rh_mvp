# 🚀 Deployment Guide - Humano SISU

## ⚠️ CRITICAL SECURITY WARNING

**NEVER commit environment variables with secrets to GitHub!**

## 📋 Required Environment Variables for Railway

### ✅ Public Variables (Safe to share)
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_your_anon_key"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
NODE_ENV="production"
PORT="8080"
HOSTNAME="0.0.0.0"
NEXT_TELEMETRY_DISABLED="1"
DEFAULT_CURRENCY="HNL"
DEFAULT_TIMEZONE="America/Tegucigalpa"
TZ="America/Tegucigalpa"
SKIP_ENV_VALIDATION="false"
```

### 🔒 Secret Variables (NEVER commit to Git)
```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Supabase
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
SUPABASE_JWT_SECRET="your_jwt_secret"

# Authentication
JWT_SECRET="your_jwt_secret"
SESSION_SECRET="your_session_secret"

# External Services
RESEND_API_KEY="your_resend_key"
SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN="your_twilio_token"
SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID="your_twilio_sid"
SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID="your_message_sid"

# Hikvision Proxy Service
HIKVISION_PROXY_URL="https://your-hikvision-proxy-service.railway.app"

# PayPal
PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_secret"
PAYPAL_MODE="sandbox"
PAYPAL_WEBHOOK_ID="your_webhook_id"

# Security
EMPLOYEE_LAST5_PEPPER="your_pepper"
EMPLOYEE_PIN_PEPPER="your_pin_pepper"
CRON_SECRET="your_cron_secret"
```

## 🚂 Railway Deployment Steps

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Configure Environment Variables
```bash
# Use the setup script
./scripts/setup-railway-vars.sh

# Or configure manually
railway variables set NEXT_PUBLIC_SUPABASE_URL="your_url"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="your_key"
# ... (add all secret variables)
```

### 4. Deploy
```bash
railway up
```

### 5. Verify Deployment
```bash
# Check environment variables
curl https://your-domain.com/api/railway-env-check

# Check debug page
https://your-domain.com/railway-debug
```

## 🔍 Troubleshooting

### Environment Variables Not Available
1. Verify variables are set in Railway dashboard
2. Check `/api/railway-env-check` endpoint
3. Ensure redeploy after setting variables
4. Check browser cache (hard refresh)

### Login Issues
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check Supabase project settings
3. Verify CORS configuration
4. Check browser console for errors

## 🛡️ Security Best Practices

1. **Never commit `.env` files to Git**
2. **Use Railway's secure variable storage**
3. **Rotate secrets regularly**
4. **Use different secrets for dev/staging/prod**
5. **Monitor for exposed secrets in logs**

## 📞 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables: `./scripts/check-railway-env.sh`
3. Check debug endpoints: `/api/railway-env-check`, `/railway-debug`
