import { NextRequest, NextResponse } from 'next/server'
import { stripe, ensureStripeConfigured } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'placeholder_for_build'

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ STRIPE: Checkout session completed:', session.id)
  
  const userId = session.metadata?.userId
  const customerId = session.customer as string

  if (!userId) {
    console.error('❌ STRIPE: No userId in session metadata')
    return
  }

  try {
    // Update user to premium
    const { error } = await supabase
      .from('users')
      .update({
        stripe_customer_id: customerId,
        is_premium: true,
        premium_since: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('❌ STRIPE: Error updating user:', error)
    } else {
      console.log('✅ STRIPE: User upgraded to premium:', userId)
    }
  } catch (error) {
    console.error('❌ STRIPE: Error in handleCheckoutCompleted:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 STRIPE: Subscription updated:', subscription.id)
  
  const customerId = subscription.customer as string
  const isActive = subscription.status === 'active'

  try {
    // Update user premium status based on subscription status
    const { error } = await supabase
      .from('users')
      .update({
        is_premium: isActive,
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('❌ STRIPE: Error updating subscription status:', error)
    } else {
      console.log(`✅ STRIPE: Updated subscription status to ${subscription.status}`)
    }
  } catch (error) {
    console.error('❌ STRIPE: Error in handleSubscriptionUpdated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ STRIPE: Subscription deleted:', subscription.id)
  
  const customerId = subscription.customer as string

  try {
    // Revoke premium access
    const { error } = await supabase
      .from('users')
      .update({
        is_premium: false,
        stripe_subscription_id: null,
        stripe_subscription_status: 'cancelled',
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('❌ STRIPE: Error revoking premium:', error)
    } else {
      console.log('✅ STRIPE: Revoked premium access')
    }
  } catch (error) {
    console.error('❌ STRIPE: Error in handleSubscriptionDeleted:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure Stripe is properly configured
    ensureStripeConfigured()
    
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ STRIPE: No signature found')
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err: any) {
      console.error('❌ STRIPE: Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    console.log('📨 STRIPE: Received event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.created':
        // Subscription created - initial setup
        console.log('✨ STRIPE: New subscription created:', event.data.object.id)
        break

      case 'invoice.paid':
        // Payment successful
        console.log('💰 STRIPE: Invoice paid:', event.data.object.id)
        break

      case 'invoice.payment_failed':
        // Payment failed
        console.log('⚠️ STRIPE: Payment failed:', event.data.object.id)
        break

      default:
        console.log(`🔔 STRIPE: Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ STRIPE: Error processing webhook:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

