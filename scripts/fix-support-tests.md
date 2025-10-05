# Support Tickets Test Fixes

The main issue is that the mocks don't properly handle the module-level `createClient` call. The API routes use:

```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

This is called at module load time, so `vi.mocked(createClient)` in tests doesn't actually affect the already-created client.

## Solution

We need to ensure mocks are set before the module loads, or the tests need to use dynamic imports.

For now, let's update the tests to have a working mock setup by resetting modules and using proper mock chains.
