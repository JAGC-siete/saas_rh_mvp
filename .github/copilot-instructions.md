# GitHub Copilot Instructions for HR SaaS Sistema de Recursos Humanos

## Project Overview

This is a comprehensive **HR SaaS System** built with **Next.js 15**, **Supabase**, and **TypeScript**. The system provides complete human resources management capabilities including employee management, attendance tracking, payroll processing, and advanced reporting features.

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT integration
- **Deployment**: Railway with Docker containerization
- **UI Components**: Custom components with Lucide React icons

## Architecture Patterns

### Multi-Tenant Architecture
- Company-based data isolation using `company_id` foreign keys
- Row Level Security (RLS) policies on all tables
- User roles: `company_admin`, `hr_manager`, `manager`, `employee`

### Database Schema
Core tables follow this hierarchy:
```
companies (root tenant)
├── departments
├── work_schedules  
├── employees (with department_id, work_schedule_id)
├── attendance_records (with employee_id)
├── payroll_records (with employee_id)
├── leave_requests (with employee_id)
└── user_profiles (Supabase Auth integration)
```

### Authentication Flow
1. **Login**: `/api/auth/login` - Supabase Auth with dynamic role detection
2. **Validation**: `/api/auth/validate` - JWT + Supabase token verification
3. **Role Assignment**: Automatic role detection from employee positions
4. **Session Management**: Client-side auth context with `localStorage` tokens

## Critical Conventions

### File Structure
- **Pages Router**: Uses Next.js pages directory (not App Router)
- **API Routes**: All in `/pages/api/` with TypeScript
- **Components**: React functional components in `/components/`
- **Library Code**: Utilities and configurations in `/lib/`

### Supabase Integration
```typescript
// Server-side admin client (USE THIS for API routes)
import { createAdminClient } from '../../lib/supabase/server'
const supabase = createAdminClient()

// Client-side (for components)
import { createClient } from '../lib/supabase'
const supabase = createClient()
```

### Environment Variables (Required)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_here
```

### API Response Patterns
```typescript
// Success response
return res.status(200).json({ 
  message: "Operation successful",
  data: result 
})

// Error response
return res.status(400).json({ 
  error: "Error message" 
})
```

## Key Features & Components

### 1. Employee Management (`/components/EmployeeManager.tsx`)
- CRUD operations for employees
- Company-scoped data access
- Integration with departments and work schedules
- Form validation and error handling

### 2. Attendance System (`/pages/api/attendance/`)
- **DNI-based lookup**: Last 5 digits for employee identification
- **Smart scheduling**: Dynamic work schedule detection by day
- **Punctuality analysis**: Late/early detection with justifications
- **Real-time tracking**: Check-in/check-out with status updates

### 3. Authentication System (`/lib/auth.tsx`)
- **Protected Routes**: `<ProtectedRoute>` component wrapper
- **Role-based access**: Dynamic role assignment from employee data
- **Session persistence**: localStorage token management
- **Supabase Integration**: Full auth service integration

### 4. Database Migrations (`/supabase/migrations/`)
- **Schema versioning**: Timestamped migration files
- **RLS policies**: Security rules for multi-tenancy
- **Indexes**: Performance optimization for queries
- **Triggers**: Automated `updated_at` timestamps

## Development Workflow

### 1. Adding New Features
1. **Database First**: Create/update Supabase migration
2. **API Routes**: Implement in `/pages/api/`
3. **Components**: Build React components in `/components/`
4. **Integration**: Wire up with authentication and routing

### 2. Database Operations
```typescript
// Always use company_id for multi-tenancy
const { data, error } = await supabase
  .from('employees')
  .select('*')
  .eq('company_id', userProfile.company_id)
  .order('name')
```

### 3. Authentication Checks
```typescript
// In API routes
const { data: { user }, error } = await supabase.auth.getUser()
if (!user) return res.status(401).json({ error: 'Unauthorized' })

// In components
const { user, loading } = useAuth()
if (!user) return <div>Not authenticated</div>
```

### 4. Error Handling
- **API Routes**: Always return appropriate HTTP status codes
- **Components**: Use try-catch with user-friendly error messages
- **Database**: Handle Supabase errors gracefully
- **Validation**: Client-side and server-side validation

## Security Guidelines

### Row Level Security (RLS)
- All tables have RLS enabled
- Company-based data isolation enforced at database level
- User can only access data for their company

### Authentication Security
- JWT tokens signed with secure secret
- Supabase Auth for real authentication
- Service Role Key for admin operations only
- No hardcoded credentials in code

### API Security
```typescript
// Validate user session in every API route
const { data: { user } } = await supabase.auth.getUser()
if (!user) return res.status(401).json({ error: 'Unauthorized' })

// Always filter by company_id
.eq('company_id', userProfile.company_id)
```

## Deployment & Production

### Railway Deployment
- **Docker**: Uses production Dockerfile with multi-stage builds
- **Environment**: All secrets configured in Railway dashboard
- **Build Process**: `npm run build` with ESLint validation
- **Cache Strategy**: `.dockerignore` and build optimization

### Performance Optimizations
- **Database Indexes**: Strategic indexing on frequently queried columns
- **Query Optimization**: Use select specific columns, limit results
- **Caching**: Browser caching for static assets
- **Bundle Size**: Tree shaking and code splitting

## Common Patterns & Examples

### 1. Protected API Route
```typescript
import { createAdminClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Your logic here
}
```

### 2. Multi-tenant Query
```typescript
const { data: employees, error } = await supabase
  .from('employees')
  .select(`
    *,
    departments!inner(name),
    work_schedules(monday_start, monday_end)
  `)
  .eq('company_id', userProfile.company_id)
  .eq('status', 'active')
  .order('name')
```

### 3. Protected Component
```typescript
import { ProtectedRoute } from '../components/ProtectedRoute'

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'hr']}>
      {/* Your component content */}
    </ProtectedRoute>
  )
}
```

## Testing & Debugging

### Database Testing
- Use `/api/attendance/debug` for attendance system diagnostics
- Check Supabase Studio for real-time data inspection
- Validate RLS policies with different user contexts

### Common Issues & Solutions

1. **"Invalid API Key"**: Ensure all Supabase environment variables are set
2. **Build Failures**: Run `npm run lint` to catch TypeScript/ESLint errors
3. **Authentication Issues**: Check JWT_SECRET environment variable and Supabase Auth configuration
4. **Permission Errors**: Verify RLS policies and company_id filtering

### Debugging Tools
```typescript
// Add debugging to API routes
console.log('User:', user?.email, 'Company:', userProfile?.company_id)
console.log('Query result:', { data, error })

// Frontend debugging
console.log('Auth state:', { user, loading })
```

## Migration & Data Management

### Employee Migration
- Use `/scripts/run_employee_migration.sh` for data imports
- Validate data integrity with `/check_db.js`
- Test migration with sample data first

### Database Schema Updates
- Always create new migration files in `/supabase/migrations/`
- Test migrations on staging before production
- Backup data before major schema changes

## Quick Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Production build
npm run lint            # ESLint validation

# Database
supabase start          # Start local Supabase
supabase db reset       # Reset local database
supabase migration new  # Create new migration

# Deployment
npm run ci:prod         # Production CI build
```

## Additional Resources

- **Documentation**: See `FRONTEND_README.md` for component details
- **Migration Guide**: `EMPLOYEE_MIGRATION_GUIDE.md` for data migration
- **Deployment**: `RAILWAY_DEPLOYMENT_CHECKLIST.md` for production setup
- **Architecture**: `PROJECT_ANALYSIS_REPORT.md` for system overview

Remember: This is a **production-ready system** with **53 migrated employees**, **complete authentication**, and **working attendance tracking**. Always maintain the multi-tenant architecture and security patterns when making changes.
