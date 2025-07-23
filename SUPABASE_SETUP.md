# Supabase Integration Setup Guide

## Prerequisites
1. **Docker Desktop** - Download and install from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. **Node.js 18+**
3. **Supabase CLI** ✅ (Already installed)

## Quick Setup Steps

### 1. Start Docker Desktop
Make sure Docker Desktop is running before proceeding.

### 2. Start Supabase Local Development
```bash
cd /Users/jorgearturo/saas-proyecto
supabase start
```

This will start:
- PostgreSQL database on port 54322
- Supabase Studio on port 54323 
- API Gateway on port 54321
- Realtime server
- Auth server
- Storage server

### 3. Apply Database Migrations
```bash
supabase db reset
```

### 4. Generate TypeScript Types
```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

### 5. Install Frontend Dependencies
```bash
npm install @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared
```

## Environment Variables

Create `.env.local` with these values (already created):
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Access Points

Once running:
- **Supabase Studio**: http://localhost:54323
- **API**: http://localhost:54321
- **Database**: postgresql://postgres:postgres@localhost:54322/postgres

## Key Features Implemented

### 1. **Multi-tenant Architecture**
- Company-based data isolation
- Row Level Security (RLS) policies
- User role management

### 2. **Authentication & Authorization**
- Supabase Auth integration
- Role-based access control
- JWT token management

### 3. **HR Management Features**
- Employee management
- Department organization
- Work schedule management
- Attendance tracking
- Leave management
- Payroll processing

### 4. **Enhanced Attendance System**
- Check-in/Check-out with DNI validation
- Late arrival justifications
- Early departure tracking
- Real-time status updates

### 5. **Advanced Payroll**
- Honduras tax calculations (ISR, RAP)
- Social security deductions
- Automated payroll generation
- PDF payroll slips

### 6. **Real-time Features**
- Live attendance updates
- Real-time notifications
- Dashboard metrics

## Migration from Current System

### Database Migration
1. Export your current PostgreSQL data
2. Transform to match new schema
3. Import into Supabase

### API Migration
Replace your current endpoints:
- `/attendance` → `/api/attendance`
- `/payroll` → `/api/payroll`
- Add authentication middleware

### Frontend Integration
```javascript
// Replace your current API calls
import { supabase } from '../lib/supabase'

// Attendance check-in
const checkIn = async (last5, justification) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert({ ... })
}

// Real-time updates
supabase
  .channel('attendance_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'attendance_records' },
    (payload) => {
      // Handle real-time updates
    }
  )
  .subscribe()
```

## Production Deployment

### 1. Create Supabase Project
```bash
supabase projects create "saas-rh-production"
```

### 2. Link to Production
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Deploy Database
```bash
supabase db push
```

### 4. Update Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Benefits of Supabase Integration

### 1. **Development Speed**
- Built-in authentication
- Real-time subscriptions
- Auto-generated APIs
- Built-in file storage

### 2. **Scalability**
- PostgreSQL at scale
- CDN for global access
- Auto-scaling
- Built-in caching

### 3. **Security**
- Row Level Security
- JWT authentication
- SSL/TLS encryption
- SOC 2 compliance

### 4. **Features**
- Real-time updates
- File uploads
- Email templates
- Webhooks
- Functions

### 5. **Cost Effective**
- Generous free tier
- Pay-as-you-scale pricing
- No infrastructure management
- Built-in monitoring

## Next Steps

1. **Start Docker Desktop**
2. **Run `supabase start`**
3. **Access Studio at http://localhost:54323**
4. **Create your first company and users**
5. **Test attendance and payroll APIs**
6. **Build your frontend with real-time features**

Your HR SaaS now has enterprise-grade backend infrastructure with minimal setup! 🚀
