# 🔧 Troubleshooting: Invalid Credentials & Supabase Session Management

## 🔍 Problem Analysis

### Current Issue: "Credenciales inválidas" in Production

**Root Causes:**
1. **Environment Variables**: Production environment variables not set correctly
2. **Different Supabase Projects**: Local vs Production using different Supabase instances
3. **Users Not Created**: Test users only exist in local Supabase, not production
4. **Custom JWT Complexity**: Current implementation uses custom JWT instead of native Supabase sessions

---

## ✅ Solution: Leverage Supabase Native Session Management

### 🎯 **Why Use Native Supabase Sessions?**

#### Benefits:
- ✅ **Automatic session management** - No custom JWT needed
- ✅ **Built-in security** - CSRF protection, secure cookies
- ✅ **Real-time updates** - Session changes across tabs
- ✅ **Automatic token refresh** - No manual token handling
- ✅ **Row Level Security (RLS)** - Automatic user context
- ✅ **Simplified code** - Less authentication logic

#### Current vs Recommended Approach:

**❌ Current (Custom JWT):**
```typescript
// Complex custom JWT handling
const token = jwt.sign({ userId, email, role }, JWT_SECRET)
// Manual token validation
// Custom session management
```

**✅ Recommended (Native Supabase):**
```typescript
// Simple Supabase auth
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})
// Automatic session management
// Built-in security
```

---

## 🚀 Implementation Steps

### Step 1: Update Environment Variables in Production

**For Railway/Vercel deployment, ensure these variables are set:**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://fwyxmovfrzauebiqxchz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I

# Remove JWT_SECRET (no longer needed)
# JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
```

### Step 2: Create Users in Production Supabase

**Run this script in production environment:**

```bash
# Execute the user creation script
node create-production-users.mjs
```

**Expected Output:**
```
🚀 Creating production users...

👤 Creating admin user...
✅ Admin created successfully: admin@empresa.com

👤 Creating HR user...
✅ HR created successfully: hr@empresa.com

👤 Creating Jorge user...
✅ Jorge created successfully: jorge7gomez@gmail.com

🎉 User creation process completed!

📋 Valid credentials for testing:
👤 Admin: admin@empresa.com / admin123456
👤 HR: hr@empresa.com / hr123456
👤 Jorge: jorge7gomez@gmail.com / jorge123456

🧪 Testing authentication...
✅ Admin login successful: admin@empresa.com
✅ HR login successful: hr@empresa.com
✅ Jorge login successful: jorge7gomez@gmail.com
```

### Step 3: Use Simplified Login API

**Replace current login with simplified version:**

```typescript
// pages/api/auth/login-simple.ts (already created)
// Uses native Supabase sessions, no custom JWT
```

### Step 4: Update Frontend to Use Native Sessions

**Current AuthProvider is already optimized for native sessions.**

---

## 🧪 Testing Authentication

### Local Testing:
```bash
# Test simplified login
curl -X POST http://localhost:3000/api/auth/login-simple \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"admin123456"}'

# Expected response:
{
  "success": true,
  "user": {
    "id": "4f482718-0fff-4191-974f-e0731a427c3e",
    "email": "admin@empresa.com",
    "name": "Administrador",
    "role": "admin"
  },
  "message": "Login successful - session managed by Supabase"
}
```

### Production Testing:
```bash
# Test production login
curl -X POST https://your-production-domain.com/api/auth/login-simple \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"admin123456"}'
```

---

## 🔧 Troubleshooting Steps

### If Still Getting "Credenciales inválidas":

1. **Check Environment Variables:**
   ```bash
   # In production, verify these are set:
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Verify Supabase Project:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Check if you're using the correct project
   - Verify the URL matches your environment variables

3. **Check User Creation:**
   ```bash
   # Run user creation script
   node create-production-users.mjs
   ```

4. **Test Direct Supabase Auth:**
   ```javascript
   // Test in browser console or script
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'admin@empresa.com',
     password: 'admin123456'
   })
   console.log('Auth result:', { data, error })
   ```

5. **Check Network Requests:**
   - Open browser DevTools
   - Go to Network tab
   - Try to login and check for errors

---

## 🎯 Advantages of This Approach

### 1. **Simplified Authentication**
- No custom JWT tokens
- Automatic session management
- Built-in security features

### 2. **Better User Experience**
- Real-time session updates
- Automatic token refresh
- Cross-tab synchronization

### 3. **Enhanced Security**
- CSRF protection
- Secure cookie handling
- Automatic session validation

### 4. **Row Level Security (RLS)**
- Automatic user context in database queries
- Secure data access based on user role
- No manual user context passing

### 5. **Easier Maintenance**
- Less custom code
- Fewer security vulnerabilities
- Standard Supabase patterns

---

## 📋 Production Deployment Checklist

- [ ] Environment variables set in production
- [ ] Users created in production Supabase
- [ ] Simplified login API deployed
- [ ] AuthProvider using native sessions
- [ ] Middleware updated for native sessions
- [ ] Authentication tested in production
- [ ] RLS policies configured in Supabase
- [ ] Custom JWT logic removed
- [ ] JWT_SECRET removed from environment

---

## 🚀 Next Steps

1. **Deploy the simplified authentication**
2. **Create users in production Supabase**
3. **Test authentication in production**
4. **Remove custom JWT dependencies**
5. **Configure RLS policies for enhanced security**

---

*This approach leverages Supabase's built-in session management, providing better security, maintainability, and user experience while eliminating the complexity of custom JWT tokens.* 