# Create User Profile Edge Function

This Edge Function is triggered when a new user is created in Supabase Auth.

## Setup

1. Deploy the function:
```bash
supabase functions deploy create-user-profile
```

2. Set up the webhook in Supabase Dashboard:
   - Go to Database > Webhooks
   - Create a new webhook
   - Table: `auth.users`
   - Events: `INSERT`
   - Type: `HTTP Request`
   - URL: `https://your-project-ref.supabase.co/functions/v1/create-user-profile`
   - HTTP Method: `POST`
   - HTTP Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

## Alternative: Use the function directly

You can also call this function directly from your application when a user signs up:

```javascript
const { data, error } = await supabase.functions.invoke('create-user-profile', {
  body: { user: { id: userId } }
})
```
