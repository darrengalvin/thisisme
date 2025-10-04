# 🛡️ Sentry Quick Setup Guide (5 Minutes)

## ✅ Current Status
- ✅ Sentry SDK installed (`@sentry/nextjs`)
- ✅ Configuration files ready (`sentry.*.config.ts`)
- ✅ API routes instrumented with error tracking
- ❌ **Missing**: Sentry account & DSN configuration

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Free Sentry Account
1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up with email or GitHub
3. Choose **Free Plan** (50,000 errors/month, perfect for startups)

### Step 2: Create Project
1. Click "Create Project"
2. Select Platform: **Next.js**
3. Set Alert Frequency: **On every new issue**
4. Name your project: `thisisme` (or any name)
5. Click "Create Project"

### Step 3: Copy Your DSN
After creating the project, Sentry will show you your DSN. It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/789012
```

### Step 4: Add to Environment Variables
Open `.env.local` (create if it doesn't exist) and add:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-actual-dsn-here@o123456.ingest.sentry.io/789012
SENTRY_ORG=your-org-name
SENTRY_PROJECT=thisisme
```

### Step 5: Restart Development Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 6: Test Error Tracking
Visit: `http://localhost:3003/api/test-sentry`

Or test in browser console:
```javascript
throw new Error("Test Sentry Error");
```

Check your Sentry dashboard - you should see the error appear within seconds!

## 📊 What You Get

### Real-Time Error Monitoring
- **Instant Alerts**: Email/Slack notifications for new errors
- **Stack Traces**: Exact line numbers where errors occur
- **User Context**: Which user experienced the error
- **Request Data**: API endpoint, headers, parameters (passwords filtered)

### Protected Endpoints (Already Instrumented!)
- ✅ `/api/auth/register` - Registration failures
- ✅ `/api/auth/login` - Login failures  
- ✅ `/api/network` - Network API errors
- ✅ `/api/memories` - Memory creation/fetch errors
- ✅ All other API routes (via global config)

### Privacy & Security
- ✅ Passwords automatically filtered
- ✅ Auth tokens removed from reports
- ✅ Cookie data scrubbed
- ✅ No sensitive data leaked

## 🎯 Error Tracking Features

### 1. Automatic Error Capture
Every unhandled exception is automatically sent to Sentry:
```typescript
// Automatic - no code needed!
throw new Error("Something broke")
// → Captured and tracked in Sentry
```

### 2. Manual Error Capture (Already Implemented)
```typescript
try {
  // risky operation
} catch (error) {
  Sentry.captureException(error, {
    tags: { api: 'auth/login' },
    extra: { userId: user.id }
  })
}
```

### 3. Performance Monitoring
Sentry tracks:
- API response times
- Database query performance
- Page load speeds
- User interactions

## 🔥 Production-Ready Features

### Release Tracking
```bash
# Automatically tracked via Vercel/Railway integration
SENTRY_RELEASE=$(git rev-parse HEAD)
```

### Source Maps
Already configured! Sentry shows exact TypeScript/JSX code locations, not compiled JavaScript.

### User Feedback
Users can report issues directly:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.showReportDialog({
  eventId: lastEventId,
  user: { email: user.email }
})
```

## 📈 Dashboard Overview

### Issues Page
- **New Issues**: Errors that just started happening
- **Regressions**: Errors that came back after being fixed
- **Frequency**: How often each error occurs
- **Impact**: Number of users affected

### Performance Page
- **Transaction Overview**: API endpoint response times
- **Slowest Operations**: Database queries, API calls
- **User Experience**: Page load metrics

## 🎁 Free Tier Limits
- ✅ **50,000 errors/month** (plenty for small apps)
- ✅ **10,000 performance units/month**
- ✅ **30-day error retention**
- ✅ **Unlimited projects**
- ✅ **Unlimited team members**

## 🚨 Common Issues

### "DSN not configured" Warning
✅ **Solution**: Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local`

### Errors Not Appearing
✅ **Check**:
1. DSN is correct (copy-paste from Sentry dashboard)
2. Development server restarted
3. Error actually occurred (check browser console)

### Too Many Events
✅ **Solution**: Adjust sample rate in `sentry.*.config.ts`:
```typescript
tracesSampleRate: 0.1  // Only track 10% of requests
```

## 🎉 You're Done!

Sentry is now:
- ✅ Tracking all errors in real-time
- ✅ Alerting you to new issues
- ✅ Providing detailed debugging info
- ✅ Protecting user privacy
- ✅ Monitoring performance

## 📚 Next Steps

### Integrate with Slack
1. Go to Sentry Project Settings
2. Click "Integrations" → "Slack"
3. Connect your Slack workspace
4. Choose channel for alerts

### Set Up Release Tracking
```bash
# In your deployment script
export SENTRY_RELEASE=$(git rev-parse HEAD)
npm run build
```

### Enable Performance Monitoring
Already enabled! Check the "Performance" tab in Sentry.

---

## 🆘 Need Help?

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Discord**: https://discord.gg/sentry
- **Project Health**: http://localhost:3003/admin/project-health

---

**Time to Complete**: 5 minutes  
**Difficulty**: Easy  
**Impact**: Critical - Catch bugs before users complain!
