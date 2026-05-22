# Create User Profile Edge Function

This Edge Function can be wired to `auth.users` INSERT webhooks. It intentionally **does not** create profiles anymore.

Profiles and companies are provisioned through the authenticated onboarding flow:

- `POST /api/user-profiles/create-profile` (requires session; uses service role server-side)

## Setup

1. Deploy the function:

```bash
supabase functions deploy create-user-profile
```

2. Optional webhook in Supabase Dashboard:
   - Table: `auth.users`
   - Events: `INSERT`
   - URL: `https://your-project-ref.supabase.co/functions/v1/create-user-profile`

The function returns `{ success: true, skipped: true }` when no profile exists, so existing webhooks remain safe.

## Disable legacy bootstrap

Remove any HTTP calls to:

- `/api/auth/create-profile-bypass`
- `/api/auth/create-profile`
- `/api/auth/fix-user-creation`

These endpoints were removed from the application.
