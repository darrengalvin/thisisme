import Stripe from 'stripe'

// Initialize Stripe with secret key
// Use a placeholder during build time if env var is not set
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

// Helper to check if Stripe is properly configured at runtime
export function ensureStripeConfigured() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }
}

// Stripe configuration
export const STRIPE_CONFIG = {
  // Price IDs - You'll need to create these in Stripe Dashboard
  // Go to: https://dashboard.stripe.com/products
  prices: {
    monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_xxxxx', // e.g., 'price_1ABC123xyz'
    yearly: process.env.STRIPE_PRICE_YEARLY || 'price_xxxxx',   // e.g., 'price_1XYZ789abc'
  },
  
  // Product features
  features: {
    premium: [
      '🎤 Maya AI Voice Assistant',
      '🗣️ Voice-to-Text Transcription',
      '🎨 AI Image Generation',
      '📅 Age-Based Memory Dating',
      '✨ Advanced Memory Enrichment',
      '🎯 Priority Support',
    ],
  },

  // Pricing display
  pricing: {
    monthly: {
      amount: 10,
      currency: 'USD',
      interval: 'month',
    },
    yearly: {
      amount: 100,
      currency: 'USD',
      interval: 'year',
      savings: 20, // 20% off
    },
  },
}

// Helper function to create or get Stripe customer
export async function getOrCreateStripeCustomer(userId: string, email: string) {
  try {
    // Check if customer already exists
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    if (customers.data.length > 0) {
      return customers.data[0]
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        userId: userId,
      },
    })

    return customer
  } catch (error) {
    console.error('Error getting/creating Stripe customer:', error)
    throw error
  }
}

// Helper function to check if user has active subscription
export async function hasActiveSubscription(customerId: string): Promise<boolean> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    return subscriptions.data.length > 0
  } catch (error) {
    console.error('Error checking subscription:', error)
    return false
  }
}

// Helper function to get subscription details
export async function getSubscriptionDetails(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
      expand: ['data.default_payment_method'],
    })

    if (subscriptions.data.length === 0) {
      return null
    }

    const subscription = subscriptions.data[0] as any // Type assertion for new API version
    
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      priceId: subscription.items?.data?.[0]?.price?.id,
    }
  } catch (error) {
    console.error('Error getting subscription details:', error)
    return null
  }
}

