# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing for premium subscriptions.

## 📋 Prerequisites

- Stripe account (sign up at https://stripe.com)
- Access to Stripe Dashboard
- Vercel/deployment platform access for environment variables

---

## 🔧 Step 1: Create Stripe Account & Get API Keys

### 1.1 Sign up for Stripe
1. Go to https://stripe.com
2. Click "Start now" and create an account
3. Complete business verification (can use test mode immediately)

### 1.2 Get your API keys
1. Log into Stripe Dashboard: https://dashboard.stripe.com
2. Go to **Developers** → **API keys**
3. You'll see two types of keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

**⚠️ Important:** 
- Use **test mode** keys for development
- Use **live mode** keys for production only
- **Never commit secret keys** to git!

---

## 💰 Step 2: Create Products & Prices

### 2.1 Create a Product
1. In Stripe Dashboard, go to **Products** → **Add product**
2. Fill in:
   - **Name:** "AI Pro Subscription" (or your choice)
   - **Description:** "Premium features including Maya AI, voice transcription, and more"
3. Click **Save product**

### 2.2 Create Monthly Price
1. In your product, click **Add price**
2. Fill in:
   - **Pricing model:** Standard pricing
   - **Price:** $10.00 USD
   - **Billing period:** Monthly
   - **Price description:** "Monthly"
3. Click **Save**
4. **COPY THE PRICE ID** (starts with `price_xxx...`) - you'll need this!

### 2.3 Create Yearly Price
1. Click **Add another price**
2. Fill in:
   - **Pricing model:** Standard pricing
   - **Price:** $100.00 USD
   - **Billing period:** Yearly
   - **Price description:** "Yearly (Save 20%)"
3. Click **Save**
4. **COPY THE PRICE ID** - you'll need this too!

---

## 🔐 Step 3: Set Up Environment Variables

Add these variables to your `.env.local` file (for development) and to Vercel (for production):

```bash
# Stripe Secret Key (Backend only - NEVER expose!)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx

# Stripe Publishable Key (Frontend safe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook Secret (will get this in Step 4)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Price IDs from Step 2
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxx

# App URL (your deployment URL)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Setting Environment Variables in Vercel:
1. Go to your Vercel project
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable one by one
4. Make sure to add for **Production**, **Preview**, and **Development** environments
5. Redeploy after adding variables

---

## 🎣 Step 4: Set Up Webhooks

Webhooks notify your app when payment events happen (subscriptions start, end, payments fail, etc.).

### 4.1 Local Development (using Stripe CLI)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`) to your `.env.local`

### 4.2 Production Webhook
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-app.vercel.app/api/stripe/webhook
   ```
4. Select these events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. Click on the webhook you just created
7. **Copy the Signing secret** (starts with `whsec_`)
8. Add it to Vercel as `STRIPE_WEBHOOK_SECRET`

---

## 🗄️ Step 5: Run Database Migration

Apply the Stripe fields to your users table:

### Using Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Run the migration file: `supabase/migrations/20250112_add_stripe_fields.sql`

### Or using Supabase CLI:
```bash
supabase db push
```

The migration adds these fields to your `users` table:
- `stripe_customer_id` - Unique Stripe customer identifier
- `stripe_subscription_id` - Current subscription ID
- `stripe_subscription_status` - Subscription status (active, past_due, etc.)
- `premium_since` - Timestamp when user became premium

---

## 🧪 Step 6: Test the Integration

### 6.1 Test in Development
1. Start your development server: `npm run dev`
2. Click on a premium feature (e.g., Maya voice button)
3. Click "Upgrade to Pro"
4. Click "Subscribe Monthly" or "Subscribe Yearly"
5. Use Stripe test cards:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

### 6.2 Verify Payment Flow
After successful test payment:
1. Check Stripe Dashboard → **Payments** to see the test payment
2. Check your app - user should now be premium
3. Verify database - user should have `is_premium = true`
4. Check webhook logs in Stripe Dashboard

---

## 🚀 Step 7: Go Live

### 7.1 Switch to Live Mode
1. In Stripe Dashboard, toggle from **Test mode** to **Live mode** (top right)
2. Get your **live** API keys from **Developers** → **API keys**
3. Update environment variables in Vercel with **live** keys:
   - `STRIPE_SECRET_KEY=sk_live_xxx...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...`

### 7.2 Create Live Products & Prices
1. In **Live mode**, recreate your products and prices (same as Step 2)
2. Update these environment variables in Vercel:
   - `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_xxx...` (live)
   - `NEXT_PUBLIC_STRIPE_PRICE_YEARLY=price_xxx...` (live)

### 7.3 Create Live Webhook
1. In **Live mode**, create a new webhook endpoint (same as Step 4.2)
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel with the live signing secret

### 7.4 Deploy
```bash
vercel --prod
```

---

## 💡 Features Included

Your Stripe integration includes:

✅ **Subscription Management**
- Monthly ($10/month) and Yearly ($100/year) plans
- Automatic billing and renewal
- 20% discount on yearly plan

✅ **Customer Portal**
- Users can manage their subscription
- Update payment methods
- View billing history
- Cancel subscription

✅ **Webhook Handling**
- Automatic premium access on payment
- Subscription status updates
- Failed payment handling
- Subscription cancellation handling

✅ **Premium Features**
- 🎤 Maya AI Voice Assistant
- 🗣️ Voice-to-Text Transcription
- 🎨 AI Image Generation
- 📅 Age-Based Memory Dating
- ✨ Advanced Memory Enrichment

---

## 📊 Monitoring & Management

### Stripe Dashboard
- **Payments:** View all transactions
- **Customers:** See subscriber list
- **Subscriptions:** Monitor active subscriptions
- **Logs:** Debug webhook events
- **Reports:** Financial analytics

### Database Queries
Check premium users:
```sql
SELECT id, email, is_premium, premium_since, stripe_subscription_status
FROM users
WHERE is_premium = true
ORDER BY premium_since DESC;
```

---

## 🐛 Troubleshooting

### Webhook not receiving events
1. Check webhook URL is correct in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Check logs: Stripe Dashboard → **Developers** → **Webhooks** → click your endpoint → **Attempts** tab
4. For local dev, ensure Stripe CLI is running: `stripe listen`

### Payment succeeds but user not premium
1. Check webhook is receiving `checkout.session.completed` event
2. Verify webhook secret is correct
3. Check Vercel logs for errors
4. Ensure database migration ran successfully

### Test cards not working
1. Ensure you're in **Test mode** in Stripe Dashboard
2. Use test API keys (starting with `sk_test_` and `pk_test_`)
3. Clear browser cache and try again

---

## 🔒 Security Best Practices

1. ✅ **Never expose secret keys** - keep them server-side only
2. ✅ **Always verify webhook signatures** - prevents fake events
3. ✅ **Use HTTPS** - required for production webhooks
4. ✅ **Validate user IDs** - ensure users can only access their own data
5. ✅ **Log suspicious activity** - monitor for unusual patterns

---

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Webhook Events Reference](https://stripe.com/docs/api/events/types)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

## 🎉 You're All Set!

Your Stripe integration is now ready. Users can:
1. Click "Upgrade to Pro" on any premium feature
2. Choose monthly or yearly plan
3. Pay securely with Stripe
4. Instantly access premium features
5. Manage subscription through customer portal

Questions? Check Stripe Dashboard logs or Vercel logs for detailed error messages.

