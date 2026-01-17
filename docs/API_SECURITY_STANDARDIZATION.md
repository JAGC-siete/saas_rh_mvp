# API Security Standardization - Implementation Summary

## Overview

This document describes the security standardization implemented to secure the use of `createAdminClient()` across all API endpoints.

## Implementation Status

### ✅ Phase 1: Infrastructure Base (COMPLETED)

1. **`lib/auth/api-guards.ts`** - Standardized authentication guards
   - `requireSession()` - Basic session validation
   - `requireRole()` - Role-based access control
   - `requireTenantScope()` - Tenant isolation validation
   - `requireAdminWithTenant()` - Admin access with tenant scoping
   - `requireSuperAdminWithAudit()` - Super admin with audit logging

2. **`lib/security/api-responses.ts`** - Standardized response helpers
   - `createSuccessResponse()` - Consistent success responses
   - `createErrorResponse()` - Standardized error responses
   - `createAuthErrorResponse()` - Authentication errors
   - `createValidationErrorResponse()` - Validation errors

3. **`lib/security/audit-logger.ts`** - Audit logging system
   - `logAdminAction()` - Log admin actions
   - `logSuperAdminAction()` - Log super admin actions
   - `logTenantAdminAction()` - Log tenant-scoped admin actions

### ✅ Phase 2: Critical Endpoints Refactored (COMPLETED)

1. **`/api/hikvision/provision.ts`** - CRITICAL SECURITY FIX
   - ✅ Added authentication requirement (admin/hr_manager/super_admin)
   - ✅ Added tenant scope validation (prevents cross-company device provisioning)
   - ✅ Added webhook URL domain validation
   - ✅ Added comprehensive audit logging
   - ✅ Uses standardized response helpers

2. **`/api/mail-list/*`** - Public endpoints secured
   - ✅ `/api/mail-list/subscribe.ts` - Replaced admin client with anonymous client + RLS
   - ✅ `/api/mail-list/confirm.ts` - Replaced admin client with anonymous client + RLS
   - ✅ `/api/mail-list/unsubscribe.ts` - Replaced admin client with anonymous client + RLS
   - ✅ Created RLS policies for anonymous access (`20250116000003_mail_list_rls_policies.sql`)

3. **`/api/admin/affiliates/index.ts`** - Example admin endpoint
   - ✅ Updated to use `requireSuperAdminWithAudit()`
   - ✅ Uses standardized response helpers
   - ✅ Includes audit logging

## Security Patterns

### Pattern 1: Admin Endpoints with Tenant Scope

```typescript
import { requireAdminWithTenant } from '../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { adminClient, user, companyId, auditLog } = await requireAdminWithTenant(req, res, {
      allowedRoles: ['company_admin', 'hr_manager', 'super_admin']
    })

    // Validate tenant scope
    const { data: resource } = await adminClient
      .from('resources')
      .select('company_id')
      .eq('id', resourceId)
      .single()

    if (resource.company_id !== companyId) {
      return res.status(403).json(createErrorResponse('Access denied', 'TENANT_SCOPE_VIOLATION'))
    }

    // Perform operation...
    
    await auditLog('resource_updated', { resourceId })
    return res.status(200).json(createSuccessResponse(data))
  } catch (error) {
    // Handle errors...
  }
}
```

### Pattern 2: Public Endpoints with RLS

```typescript
import { createClient } from '../../../lib/supabase/server'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use anonymous client - RLS enforces security
  const supabase = createClient(req, res)

  try {
    // RLS policy allows INSERT with valid data
    const { data, error } = await supabase
      .from('public_table')
      .insert({ /* validated data */ })
      .select()
      .single()

    if (error) {
      return res.status(500).json(createErrorResponse('Operation failed', 'DATABASE_ERROR'))
    }

    return res.status(200).json(createSuccessResponse(data))
  } catch (error) {
    return res.status(500).json(createErrorResponse('Internal error', 'INTERNAL_ERROR'))
  }
}
```

### Pattern 3: Super Admin Endpoints

```typescript
import { requireSuperAdminWithAudit } from '../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)

    // Perform admin operation...
    
    await auditLog('admin_action', { details })
    return res.status(200).json(createSuccessResponse(data))
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    return res.status(500).json(createErrorResponse('Internal error', 'INTERNAL_ERROR'))
  }
}
```

## RLS Policies Created

### `mail_list_subscriptions` Table

- **INSERT Policy**: Allows anonymous users to insert subscriptions with valid email format
- **SELECT Policy**: Allows reading subscriptions by confirmation token
- **UPDATE Policy**: Allows updating subscriptions by confirmation token

See: `supabase/migrations/20250116000003_mail_list_rls_policies.sql`

## Remaining Work

### High Priority

1. **Refactor `/api/affiliates/*` public endpoints**
   - `/api/affiliates/request.ts`
   - `/api/affiliates/register.ts`
   - `/api/affiliates/submit-questionnaire.ts`
   - `/api/affiliates/request-status.ts`
   - Create RLS policies for `affiliate_requests` table

2. **Standardize remaining `/api/admin/affiliates/*` endpoints**
   - `/api/admin/affiliates/approve.ts`
   - `/api/admin/affiliates/reject.ts`
   - `/api/admin/affiliates/requests.ts`
   - `/api/admin/affiliates/stats.ts`
   - `/api/admin/affiliates/commissions.ts`
   - `/api/admin/affiliates/commissions/[id].ts`
   - `/api/admin/affiliates/[id].ts`

### Medium Priority

3. **Review and standardize other admin endpoints**
   - All endpoints in `/api/admin/*` should use `requireSuperAdminWithAudit()`
   - Add audit logging to all admin operations

4. **Create tests**
   - Authentication tests
   - Authorization tests
   - Tenant scoping tests
   - Rate limiting tests

## Migration Guide

### For Existing Endpoints Using `createAdminClient()`

1. **Determine endpoint type**:
   - Public endpoint? → Use anonymous client + RLS
   - Admin endpoint? → Use `requireAdminWithTenant()` or `requireSuperAdminWithAudit()`
   - User endpoint? → Use `requireCompanyAccess()` with regular client

2. **Replace admin client usage**:
   ```typescript
   // Before
   const adminClient = createAdminClient()
   const { data } = await adminClient.from('table').select()
   
   // After (for admin endpoints)
   const { adminClient } = await requireAdminWithTenant(req, res)
   const { data } = await adminClient.from('table').select()
   ```

3. **Add audit logging**:
   ```typescript
   await auditLog('action_name', { resourceId, details })
   ```

4. **Use standardized responses**:
   ```typescript
   // Before
   res.status(200).json({ data })
   
   // After
   return res.status(200).json(createSuccessResponse(data))
   ```

## Security Checklist

- [x] Infrastructure base created
- [x] Critical endpoint (`/api/hikvision/provision.ts`) secured
- [x] Public endpoints (`/api/mail-list/*`) secured with RLS
- [x] Example admin endpoint refactored
- [ ] All `/api/admin/*` endpoints standardized
- [ ] All `/api/affiliates/*` public endpoints secured
- [ ] RLS policies created for all public tables
- [ ] Tests created and passing
- [ ] Documentation updated

## Notes

- All changes are backwards compatible
- Existing endpoints continue to work during migration
- New endpoints should follow the new patterns
- Old patterns are deprecated but not removed for compatibility






