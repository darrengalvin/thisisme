# 🚀 Vercel Deployment Setup Guide

This guide covers setting up rate limiting and other features specifically for **Vercel** deployment.

---

## ✅ **What's Already Done**

The code is ready to deploy to Vercel! All critical features are implemented:
- ✅ Rate limiting (ready for Vercel KV)
- ✅ Input validation with Zod
- ✅ Error monitoring with Sentry
- ✅ Automated testing

---

## 🔧 **Step 1: Set Up Vercel KV (Rate Limiting)**

### **In Vercel Dashboard:**

1. Go to your project: https://vercel.com/dashboard
2. Select your project (or create one if deploying for first time)
3. Click **Storage** tab in the top menu
4. Click **Create Database**
5. Select **KV** (Key-Value Store)
6. Name it: `rate-limit-store` (or any name you like)
7. Click **Create**

**That's it!** Vercel automatically adds these environment variables to your project:
```bash
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

### **For Local Development:**

1. In Vercel dashboard, go to **Settings** → **Environment Variables**
2. Copy `KV_REST_API_URL` and `KV_REST_API_TOKEN`
3. Add to your local `.env.local`:
   ```bash
   KV_REST_API_URL=https://your-kv-url.upstash.io
   KV_REST_API_TOKEN=your-token-here
   ```
4. Restart your dev server: `npm run dev`

---

## 📊 **Step 2: Set Up Sentry (Error Monitoring)**

### **Sign Up for Sentry:**

1. Go to https://sentry.io
2. Sign up (free tier available)
3. Create a new project → Select **Next.js**
4. Copy your **DSN** (looks like: `https://abc123@o123.ingest.sentry.io/456`)

### **Add to Vercel:**

1. In Vercel dashboard → **Settings** → **Environment Variables**
2. Add these variables:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   SENTRY_AUTH_TOKEN=your-auth-token
   SENTRY_ORG=your-org-name
   SENTRY_PROJECT=your-project-name
   ```

### **For Local Development:**

Add the same variables to `.env.local`

---

## 🔐 **Step 3: Environment Variables Checklist**

Make sure these are set in **Vercel** (Settings → Environment Variables):

### **Required (Already Set):**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret

# Email (Resend)
RESEND_API_KEY=re_your_key

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Voice AI (VAPI)
VAPI_API_KEY=your-key
VAPI_ASSISTANT_ID=your-id

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### **New (Need to Add):**
```bash
# Rate Limiting (Vercel KV - auto-added when you create KV database)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# Error Monitoring (Sentry - add manually)
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=...
SENTRY_PROJECT=...
```

---

## 🚀 **Step 4: Deploy to Vercel**

### **Option A: Deploy via GitHub (Recommended)**

1. Push your code to GitHub:
   ```bash
   git push origin main
   ```

2. In Vercel dashboard:
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Vercel auto-detects Next.js settings
   - Click **Deploy**

3. Vercel will:
   - ✅ Build your app
   - ✅ Run tests (if configured)
   - ✅ Deploy to production
   - ✅ Give you a URL: `https://your-app.vercel.app`

### **Option B: Deploy via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 🧪 **Step 5: Test Everything**

### **Test Rate Limiting:**

```bash
# Should work (within limits)
curl https://your-app.vercel.app/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# After 5 requests in 15 minutes, should return 429
# Check response headers for: X-RateLimit-Limit, X-RateLimit-Remaining
```

### **Test Error Monitoring:**

1. Go to your app and trigger an error (e.g., submit invalid form)
2. Check Sentry dashboard: https://sentry.io
3. You should see the error logged with full context

### **Run Tests:**

```bash
npm test
```

---

## 📈 **Monitoring Your App**

### **Vercel Analytics:**
- Go to your project → **Analytics** tab
- See real-time traffic, performance, and errors

### **Vercel Logs:**
- Go to your project → **Deployments** → Click a deployment → **Logs**
- See all server-side logs in real-time

### **Sentry Dashboard:**
- https://sentry.io
- See errors, performance issues, and user sessions

---

## 🎯 **Production Checklist**

Before going live:

- [ ] Vercel KV database created and connected
- [ ] Sentry project created and DSN added
- [ ] All environment variables set in Vercel
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Rate limiting tested
- [ ] Error monitoring tested
- [ ] All tests passing
- [ ] Database migrations run on production Supabase

---

## 💰 **Pricing**

### **Vercel:**
- **Hobby (Free):** Perfect for development and small projects
- **Pro ($20/month):** Adds team features, better analytics, more bandwidth

### **Vercel KV:**
- **Free tier:** 10,000 commands/day, 256MB storage
- **Pro:** Scales automatically, pay-as-you-go

### **Sentry:**
- **Free:** 5,000 errors/month, 1 user
- **Team ($26/month):** 50,000 errors/month, unlimited users

### **Total Cost to Start:**
- **$0** - Everything can run on free tiers initially!

---

## 🆘 **Troubleshooting**

### **Rate limiting not working:**
```bash
# Check if KV is connected
vercel env ls

# Should show KV_REST_API_URL and KV_REST_API_TOKEN
```

### **Sentry not capturing errors:**
```bash
# Check DSN is set
vercel env ls | grep SENTRY

# Test Sentry locally
npm run dev
# Trigger an error and check Sentry dashboard
```

### **Build failing on Vercel:**
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Failed tests

# Test build locally first:
npm run build
```

---

## 🔗 **Useful Links**

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel KV Docs:** https://vercel.com/docs/storage/vercel-kv
- **Sentry Dashboard:** https://sentry.io
- **Your App (after deploy):** https://your-app.vercel.app

---

## 🎉 **You're Ready!**

Your app is now production-ready with:
- ✅ Enterprise-grade rate limiting
- ✅ Real-time error monitoring
- ✅ Automatic scaling
- ✅ Global CDN
- ✅ SSL certificates
- ✅ Automated deployments

**Next Steps:**
1. Create Vercel KV database (2 minutes)
2. Set up Sentry project (5 minutes)
3. Deploy to Vercel (1 click)
4. Monitor and enjoy! 🚀

---

**Questions?** Check the Vercel docs or create a support ticket at `/admin/support`
