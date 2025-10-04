# 📊 Sentry Error Monitoring Setup Guide

## Overview

Sentry is now configured to track errors, performance issues, and user sessions in production. This gives you visibility into what's happening in your application.

## 🎯 What Sentry Monitors

### 1. **Error Tracking**
- JavaScript errors in the browser
- API errors on the server
- Unhandled promise rejections
- Network failures
- Database errors

### 2. **Performance Monitoring**
- API response times
- Page load times
- Database query performance
- Slow transactions

### 3. **Session Replay** (Optional)
- Record user sessions when errors occur
- See exactly what the user did before the error
- Privacy-safe (masks sensitive data)

## 🚀 Setup Instructions

### Step 1: Sign Up for Sentry

1. Go to https://sentry.io
2. Click "Sign Up" (free tier available)
3. Choose "Next.js" as your platform
4. Create a new project

### Step 2: Get Your DSN

1. In your Sentry project dashboard
2. Go to **Settings** → **Projects** → **[Your Project]**
3. Click **Client Keys (DSN)**
4. Copy the **DSN** value

It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

### Step 3: Add to Environment Variables

Add to your `.env.local` file:

```env
# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@sentry.io/your-project-id
```

**Important:** The `NEXT_PUBLIC_` prefix makes it available in the browser.

### Step 4: Restart Development Server

```bash
npm run dev
```

### Step 5: Test Error Tracking

Create a test error to verify Sentry is working:

```typescript
// In any component or API route
throw new Error('Test error for Sentry');
```

Check your Sentry dashboard - you should see the error appear within seconds!

## 📋 Configuration Files

### `sentry.client.config.ts`
- Runs in the browser
- Tracks client-side errors
- Session replay enabled
- Filters sensitive data (passwords)

### `sentry.server.config.ts`
- Runs on the server
- Tracks API errors
- Filters sensitive data (passwords, tokens, headers)

### `sentry.edge.config.ts`
- Runs in Edge Runtime (middleware)
- Tracks middleware errors
- Lightweight configuration

## 🔒 Privacy & Security

### Automatic Data Filtering

Sentry is configured to **automatically filter**:
- ✅ Passwords (`password`, `newPassword`, `currentPassword`)
- ✅ Auth tokens (`authorization` header)
- ✅ Cookies
- ✅ API keys

### Session Replay Privacy

- ✅ All text is masked by default
- ✅ All media is blocked
- ✅ Only replays errors (not all sessions)

## 📊 Monitoring in Production

### Sentry Dashboard

After deployment, monitor:

1. **Issues** - All errors grouped by type
2. **Performance** - Slow API calls and pages
3. **Releases** - Track errors by deployment
4. **Alerts** - Get notified of critical errors

### Useful Filters

- **Environment**: Filter by production/staging/development
- **Release**: See errors by version
- **User**: Track errors by specific users
- **Browser**: See browser-specific issues

## 🎯 Sample Rate Configuration

Current settings (adjust in config files):

```typescript
tracesSampleRate: 0.1  // 10% of transactions
replaysSessionSampleRate: 0.1  // 10% of sessions
replaysOnErrorSampleRate: 1.0  // 100% of error sessions
```

**For Development:**
- Set to `1.0` (100%) to see everything

**For Production:**
- Keep at `0.1` (10%) to control costs
- Increase if needed for more visibility

## 🚨 Alert Configuration

### Recommended Alerts

Set up in Sentry dashboard:

1. **Critical Errors**
   - Condition: Any new issue
   - Action: Email immediately

2. **High Error Rate**
   - Condition: >10 errors per minute
   - Action: Slack notification

3. **Performance Degradation**
   - Condition: API response time >2 seconds
   - Action: Email alert

## 💰 Cost Management

### Free Tier Limits
- 5,000 errors per month
- 10,000 performance units
- 50 replays per month

### Tips to Stay Within Limits
- ✅ Use sample rates (10% recommended)
- ✅ Filter out known/expected errors
- ✅ Set up error grouping
- ✅ Use `beforeSend` to filter noise

## 🔧 Advanced Configuration

### Ignore Specific Errors

```typescript
// In sentry.client.config.ts
beforeSend(event, hint) {
  // Ignore specific errors
  if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
    return null; // Don't send to Sentry
  }
  return event;
}
```

### Add User Context

```typescript
import * as Sentry from '@sentry/nextjs';

// In your auth flow
Sentry.setUser({
  id: user.id,
  email: user.email,
});

// On logout
Sentry.setUser(null);
```

### Add Custom Tags

```typescript
Sentry.setTag('feature', 'memory-creation');
Sentry.setTag('environment', 'production');
```

### Capture Custom Events

```typescript
Sentry.captureMessage('User completed onboarding', 'info');
```

## 🧪 Testing

### Test Client-Side Error

```typescript
// In any component
const TestError = () => {
  return (
    <button onClick={() => {
      throw new Error('Test client error');
    }}>
      Test Sentry
    </button>
  );
};
```

### Test Server-Side Error

```typescript
// In any API route
export async function GET() {
  throw new Error('Test server error');
}
```

### Verify in Sentry

1. Go to https://sentry.io
2. Open your project
3. Click **Issues**
4. You should see your test errors

## 📈 Benefits

### Before Sentry
- ❌ No visibility into production errors
- ❌ Users report bugs days later
- ❌ Can't reproduce issues
- ❌ No performance insights

### After Sentry
- ✅ Real-time error notifications
- ✅ Know about issues before users report them
- ✅ Full error context (stack traces, user actions)
- ✅ Performance monitoring
- ✅ Session replays show exactly what happened

## 🎓 Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Dashboard**: https://sentry.io
- **Status Page**: https://status.sentry.io

---

**Status**: ✅ Sentry configured and ready for production!

**Next Steps**:
1. Sign up for Sentry
2. Get your DSN
3. Add to `.env.local`
4. Test with a sample error
5. Deploy to production
6. Set up alerts
