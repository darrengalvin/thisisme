'use client'

import { useState } from 'react'
import { X, Sparkles, Lock, Mail, Check, AlertTriangle, CreditCard } from 'lucide-react'
import { useAuth } from './AuthProvider'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgradeSuccess?: () => void
  feature?: 'voice-transcription' | 'ai-image-generation' | 'age-dating' | 'general'
}

export default function UpgradeModal({ isOpen, onClose, onUpgradeSuccess, feature = 'general' }: UpgradeModalProps) {
  const { user } = useAuth()
  const [showCodeEntry, setShowCodeEntry] = useState(false)
  const [showEmailEntry, setShowEmailEntry] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [email, setEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  if (!isOpen) return null

  const handleUpgradeToProClick = () => {
    setShowPricing(true)
    setShowCodeEntry(false)
    setShowEmailEntry(false)
    setMessage('')
    setMessageType('')
  }

  const handleStripeCheckout = async (priceId: string) => {
    if (!user) {
      setMessage('Please log in to upgrade')
      setMessageType('error')
      return
    }

    setIsProcessing(true)
    setMessage('')

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          priceId: priceId,
          mode: 'subscription',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout URL
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error: any) {
      console.error('Stripe checkout error:', error)
      setMessage(error.message || 'Failed to start checkout')
      setMessageType('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCodeEntryClick = () => {
    setShowCodeEntry(true)
    setShowPricing(false)
    setShowEmailEntry(false)
    setMessage('')
    setMessageType('')
  }

  const handleRequestAccess = () => {
    setShowEmailEntry(true)
    setShowCodeEntry(false)
    setShowPricing(false)
    setMessage('')
    setMessageType('')
  }

  const handleCodeSubmit = async () => {
    if (!inviteCode.trim()) return

    setIsProcessing(true)
    setMessage('')

    try {
      if (inviteCode.trim().toUpperCase() === 'RODINVITE') {
        console.log('🔑 UPGRADE: Starting premium upgrade with RODINVITE')
        
        // Get auth token exactly like Timeline API does - this is the working pattern
        if (!user) {
          throw new Error('No user found')
        }
        
        console.log('🔑 UPGRADE: Getting auth token for user:', user.id, user.email)
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email }),
        })

        if (!tokenResponse.ok) {
          console.error('❌ UPGRADE: Failed to get auth token:', tokenResponse.status)
          throw new Error('Failed to get authentication token')
        }

        const { token } = await tokenResponse.json()
        console.log('✅ UPGRADE: Got auth token successfully')
        
        const response = await fetch('/api/admin/simple-enable-premium', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        console.log('📡 UPGRADE: Response status:', response.status)
        const responseData = await response.json()
        console.log('📊 UPGRADE: Response data:', responseData)

        if (response.ok) {
          console.log('✅ UPGRADE: Premium upgrade successful!')
          setMessage('🎉 Successfully upgraded to Pro! Premium features are now unlocked.')
          setMessageType('success')
          
          // Call the refresh callback to update premium status
          if (onUpgradeSuccess) {
            onUpgradeSuccess()
          }
          
          setTimeout(() => {
            onClose()
          }, 2000)
        } else {
          console.error('❌ UPGRADE: Premium upgrade failed:', responseData)
          setMessage(`Failed to upgrade: ${responseData.error || 'Unknown error'}. Please try again or contact support.`)
          setMessageType('error')
        }
      } else {
        setMessage('Invalid invite code. Please check your code and try again.')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.')
      setMessageType('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEmailSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      setMessage('Please enter a valid email address.')
      setMessageType('error')
      return
    }

    setIsProcessing(true)
    setMessage('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ Request submitted! We\'ll review your request and get back to you soon.')
        setMessageType('success')
        setTimeout(() => {
          setShowEmailEntry(false)
          setEmail('')
        }, 3000)
      } else if (response.status === 409) {
        setMessage('This email is already on our waitlist.')
        setMessageType('error')
      } else {
        setMessage(data.error || 'Failed to submit request. Please try again.')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to submit request. Please try again.')
      setMessageType('error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Premium Feature</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto border border-purple-200">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>

            {/* Message */}
            <div>
              <p className="text-slate-900 leading-relaxed">
                {feature === 'voice-transcription' && (
                  <>🎤 Voice-to-Text Transcription is a premium feature! This converts your speech directly into text in the memory form.</>
                )}
                {feature === 'ai-image-generation' && (
                  <>✨ AI Image Generation is a premium feature! Create unique images for your memories. As you upload photos of people in your network, the AI gets better at matching generated images to them, almost recreating your memories.</>
                )}
                {feature === 'age-dating' && (
                  <>🎂 Age-Based Memory Dating is a premium feature! Tell Maya how old you were, and AI will intelligently place the memory on your timeline using your birth year.</>
                )}
                {feature === 'general' && (
                  <>✨ This is a premium feature! Upgrade to AI Pro to unlock all advanced features.</>
                )}
              </p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <Lock className="w-4 h-4 inline mr-1" />
                  This product is in invite-only mode. You need a code to access premium features.
                </p>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-3 rounded-lg ${
                messageType === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  {messageType === 'success' ? (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <p className="text-sm">{message}</p>
                </div>
              </div>
            )}

            {/* Pricing Section */}
            {showPricing && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900 text-center mb-4">Choose Your Plan</h4>
                
                {/* Monthly Plan */}
                <div className="border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-slate-900">Monthly</h5>
                      <p className="text-sm text-slate-600">Billed monthly</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">$10</p>
                      <p className="text-xs text-slate-500">/month</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStripeCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || 'price_monthly')}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <CreditCard size={16} />
                    <span>{isProcessing ? 'Processing...' : 'Subscribe Monthly'}</span>
                  </button>
                </div>

                {/* Yearly Plan */}
                <div className="border-2 border-purple-400 rounded-lg p-4 hover:border-purple-600 transition-colors bg-purple-50 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    SAVE 20%
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-slate-900">Yearly</h5>
                      <p className="text-sm text-slate-600">Billed annually</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">$100</p>
                      <p className="text-xs text-slate-500 line-through">$120/year</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStripeCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || 'price_yearly')}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                  >
                    <CreditCard size={16} />
                    <span>{isProcessing ? 'Processing...' : 'Subscribe Yearly'}</span>
                  </button>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setShowPricing(false)}
                    className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCodeEntryClick}
                    className="flex-1 px-4 py-2 text-purple-600 hover:text-purple-800 border border-purple-300 rounded-lg transition-colors text-sm"
                  >
                    Have a code?
                  </button>
                </div>
              </div>
            )}

            {/* Code Entry Section */}
            {showCodeEntry && (
              <div className="space-y-3">
                <div className="text-left">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Enter your upgrade code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCodeSubmit()
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCodeEntry(false)}
                    className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCodeSubmit}
                    disabled={!inviteCode.trim() || isProcessing}
                    className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Checking...' : 'Upgrade'}
                  </button>
                </div>
              </div>
            )}

            {/* Email Entry Section */}
            {showEmailEntry && (
              <div className="space-y-3">
                <div className="text-left">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Request access to premium features
                  </label>
                  <p className="text-xs text-slate-600 mb-3">
                    If you would like to use the service and have not been given a code, drop your email below and we will consider you.
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEmailSubmit()
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowEmailEntry(false)}
                    className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleEmailSubmit}
                    disabled={!email.trim() || isProcessing}
                    className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - only show when not in code/email/pricing entry mode */}
        {!showCodeEntry && !showEmailEntry && !showPricing && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between space-x-3">
            <button
              onClick={handleRequestAccess}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Request Access</span>
            </button>
            <button
              onClick={handleUpgradeToProClick}
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium"
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
