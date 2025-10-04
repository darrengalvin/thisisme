# 🚀 Production Setup Guide

This guide covers setting up the newly merged critical infrastructure features.

---

## ✅ **What's Been Merged**

All 4 critical security and monitoring features are now in `main`:

1. ✅ **API Rate Limiting** - Upstash Redis
2. ✅ **Input Validation** - Zod schemas
3. ✅ **Error Monitoring** - Sentry
4. ✅ **Automated Testing** - Vitest

---

## 🔧 **Environment Variables Required**

### **1. Upstash Redis (Rate Limiting)**

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Setup Steps:**
1. Go to [upstash.com](https://upstash.com)
2. Sign up (free tier available)
3. Create a new Redis database
4. Copy the REST URL and REST TOKEN
5. Add to `.env.local`

**Documentation:** See `RATE_LIMITING_SETUP.md`

---

### **2. Sentry (Error Monitoring)**

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
```

**Setup Steps:**
1. Go to [sentry.io](https://sentry.io)
2. Sign up (free tier available)
3. Create a new Next.js project
4. Copy the DSN from project settings
5. Generate an auth token (Settings → Auth Tokens)
6. Add to `.env.local`

**Documentation:** See `SENTRY_SETUP.md`

---

### **3. Existing Variables (Already Set)**

Make sure these are still configured:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret

# Email (Resend)
RESEND_API_KEY=your-resend-key

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone

# Voice AI (VAPI)
VAPI_API_KEY=your-vapi-key
VAPI_ASSISTANT_ID=your-assistant-id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📝 **Complete .env.local Template**

```bash
# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# ============================================
# RATE LIMITING (NEW - REQUIRED)
# ============================================
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here

# ============================================
# ERROR MONITORING (NEW - REQUIRED)
# ============================================
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name

# ============================================
# EMAIL
# ============================================
RESEND_API_KEY=re_your_resend_api_key

# ============================================
# SMS
# ============================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# VOICE AI
# ============================================
VAPI_API_KEY=your-vapi-api-key
VAPI_ASSISTANT_ID=your-assistant-id

# ============================================
# APP CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 🧪 **Testing the Setup**

### **1. Test Rate Limiting**

```bash
# Should work (within limits)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# After 5 requests in 15 minutes, should return 429
# Response: {"error": "Too many requests"}
# Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### **2. Test Input Validation**

```bash
# Should fail validation (title too long)
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"'$(python3 -c "print('A'*300)")'"}'

# Response: {"success": false, "error": "Invalid input", "details": "title: Title too long (max 200 characters)"}
```

### **3. Test Error Monitoring**

```bash
# Trigger a test error (if you have a test endpoint)
# Or just check Sentry dashboard after any error occurs
# Errors should appear at: https://sentry.io/organizations/YOUR_ORG/issues/
```

### **4. Run Tests**

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

---

## 📊 **Health Score Impact**

### **Before Merges: 5.9/10 (C)**
- Security: D+
- Testing: F
- Monitoring: F
- Performance: C+

### **After Merges: ~7.5/10 (B)**
- Security: B (rate limiting + validation)
- Testing: C+ (automated tests)
- Monitoring: B (Sentry)
- Performance: B (N+1 fixed)

---

## 🔄 **Development vs Production**

### **Development Mode**
- Rate limiting has graceful fallback (warns but doesn't block)
- Sentry has lower sample rates (10%)
- Tests run locally

### **Production Mode**
- Rate limiting is ENFORCED (blocks after limits)
- Sentry captures all errors
- CI/CD runs tests automatically

---

## 🚨 **Troubleshooting**

### **Rate Limiting Not Working**
```bash
# Check if Upstash is configured
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Check middleware logs
# Should see: "✅ Rate limit check passed" or "⚠️ Upstash Redis not configured"
```

### **Sentry Not Capturing Errors**
```bash
# Check if DSN is set
echo $NEXT_PUBLIC_SENTRY_DSN

# Check browser console for Sentry init messages
# Check Sentry dashboard: https://sentry.io
```

### **Tests Failing**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install

# Run tests with verbose output
npm test -- --reporter=verbose
```

---

## 📚 **Additional Documentation**

- **Rate Limiting:** `RATE_LIMITING_SETUP.md`
- **Error Monitoring:** `SENTRY_SETUP.md`
- **Testing:** `TESTING_GUIDE.md`
- **Input Validation:** `lib/validation.ts` (inline comments)

---

## ✅ **Deployment Checklist**

Before deploying to production:

- [ ] Set up Upstash Redis account
- [ ] Set up Sentry account
- [ ] Add all environment variables to hosting platform
- [ ] Run `npm test` locally (all passing)
- [ ] Test rate limiting with curl
- [ ] Test error monitoring with a test error
- [ ] Run SQL: `mark-critical-tickets-resolved.sql`
- [ ] Update Project Health dashboard
- [ ] Monitor Sentry for first 24 hours
- [ ] Check Upstash analytics for rate limit hits

---

## 🎯 **Next Steps (Phase 2)**

After production deployment, tackle these HIGH priority items:

1. **Secret Key Rotation Policy** (Security)
2. **Centralized Error Messages** (UX)
3. **Accessibility Features** (Accessibility)
4. **Image Optimization** (Performance)

See `/admin/project-health` for details.

---

## 🆘 **Support**

If you encounter issues:
1. Check the specific setup guide (RATE_LIMITING_SETUP.md, SENTRY_SETUP.md, etc.)
2. Review the troubleshooting section above
3. Check Sentry dashboard for error details
4. Create a support ticket at `/admin/support`

---

**Last Updated:** 2025-01-04
**Version:** 1.0.0
**Status:** ✅ Production Ready (pending environment setup)
