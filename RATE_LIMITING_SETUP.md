# 🚦 Rate Limiting Setup Guide

## Overview

This project uses **Upstash Redis** for API rate limiting to protect against:
- 🛡️ Brute force attacks on authentication endpoints
- 💰 API abuse and cost explosion
- 🚫 DDoS attacks
- 📊 Resource exhaustion

## Rate Limits

### Standard Endpoints
- **Limit**: 60 requests per minute per IP
- **Applies to**: All API routes (except auth)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Authentication Endpoints (Strict)
- **Limit**: 5 requests per 15 minutes per IP
- **Applies to**:
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/auth/reset-password`
- **Purpose**: Prevent brute force attacks

## Setup Instructions

### Step 1: Sign Up for Upstash (Free Tier)

1. Go to https://upstash.com
2. Click "Sign Up" (GitHub OAuth recommended)
3. Verify your email

### Step 2: Create Redis Database

1. Click "Create Database"
2. Choose:
   - **Name**: `thisisme-ratelimit` (or any name)
   - **Type**: Regional (faster, free tier)
   - **Region**: Choose closest to your users
   - **Eviction**: No eviction (recommended)
3. Click "Create"

### Step 3: Get Connection Details

1. In your database dashboard, find:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**
2. Click "Copy" for each value

### Step 4: Add to Environment Variables

Add to your `.env.local` file:

```env
# Upstash Redis for Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### Step 5: Restart Development Server

```bash
npm run dev
```

## Testing Rate Limiting

### Test Standard Rate Limit (60/min)

```bash
# Make 61 requests quickly
for i in {1..61}; do
  curl http://localhost:3000/api/timezones
  echo "Request $i"
done

# Request 61 should return: 429 Too Many Requests
```

### Test Auth Rate Limit (5/15min)

```bash
# Make 6 login attempts
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo "Attempt $i"
done

# Attempt 6 should return: 429 Too Many Requests
```

### Check Rate Limit Headers

```bash
curl -i http://localhost:3000/api/timezones
```

Look for headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1696435200000
X-RateLimit-Type: standard
```

## Development Mode

If Upstash is **not configured**, the middleware will:
- ✅ Allow all requests (no blocking)
- ⚠️ Log a warning: "Rate limiting disabled: Upstash Redis not configured"
- 🔧 Perfect for local development

## Production Deployment

### Vercel

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy

### Other Platforms

Add the environment variables to your hosting platform's environment configuration.

## Monitoring

### Upstash Dashboard

1. Go to https://console.upstash.com
2. Select your database
3. View:
   - **Requests per second**
   - **Total requests**
   - **Storage usage**
   - **Command statistics**

### Application Logs

Rate limit violations are logged:
```
🚫 Rate limit exceeded for IP 192.168.1.1 on /api/auth/login (auth)
```

## Customizing Rate Limits

Edit `middleware.ts`:

```typescript
// Change standard limit
ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 per minute
  analytics: true,
});

// Change auth limit
strictRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'), // 10 per 15 minutes
  analytics: true,
});
```

## Troubleshooting

### "Rate limiting disabled" warning

**Cause**: Upstash environment variables not set

**Fix**: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local`

### 429 errors in development

**Cause**: Hit rate limit during testing

**Fix**: 
1. Wait for the window to reset (check `X-RateLimit-Reset` header)
2. Or flush Redis: `redis-cli FLUSHALL` (if using local Redis)
3. Or restart Upstash database (resets all data)

### Rate limiting not working in production

**Cause**: Environment variables not set on hosting platform

**Fix**: Add Upstash credentials to your hosting platform's environment variables

## Cost

**Upstash Free Tier:**
- ✅ 10,000 requests per day
- ✅ 256 MB storage
- ✅ Perfect for most applications

**Paid Tiers:**
- Start at $0.20 per 100K requests
- Auto-scales with your traffic

## Security Benefits

✅ **Prevents brute force** - Attackers can't guess passwords quickly
✅ **Stops API abuse** - Malicious users can't spam your endpoints
✅ **Protects costs** - Limits database queries and API calls
✅ **Improves reliability** - Prevents resource exhaustion
✅ **Compliance** - Shows security best practices

## Next Steps

After rate limiting is working:
1. ✅ Monitor Upstash dashboard for patterns
2. ✅ Adjust limits based on real usage
3. ✅ Add custom rate limits for specific endpoints
4. ✅ Implement user-based rate limiting (not just IP)

---

**Status**: ✅ Rate limiting implemented and ready for production!
