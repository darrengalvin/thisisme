# VAPI Webhook Service for Maya

This is a standalone webhook service that bypasses Vercel's authentication blocking.

## Quick Deploy to Railway

1. **Create Railway Account**: https://railway.app
2. **Deploy from GitHub**:
   - Connect your GitHub repo
   - Select the `webhook-service` folder as root
   - Railway will auto-detect Node.js

3. **Add Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ```

4. **Get Your Webhook URL**:
   - Railway will give you a URL like: `https://your-app.railway.app`
   - Your webhook URL will be: `https://your-app.railway.app/vapi/webhook`

5. **Update VAPI Dashboard**:
   - Go to VAPI dashboard
   - Update Maya's webhook URL to your Railway URL
   - Test Maya - she should work immediately!

## Local Testing

```bash
cd webhook-service
npm install
npm start
```

## Why This Works

- **Vercel blocks external webhooks** (VAPI can't reach it)
- **Railway allows external webhooks** (VAPI can reach it)
- **Same exact code** - just different hosting
- **Maya will work immediately** once deployed

## Cost

- **Railway**: FREE tier (500 hours/month)
- **Upgrade**: $5/month for unlimited
- **vs Vercel Pro**: $150/month
