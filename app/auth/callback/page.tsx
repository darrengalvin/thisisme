'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError(error.message)
          setIsLoading(false)
          return
        }

        if (data.session?.user) {
          console.log('✅ Email confirmed successfully:', data.session.user.email)
          
          // Create user profile if it doesn't exist
          try {
            const profileResponse = await fetch('/api/auth/onboard', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: data.session.user.id,
                email: data.session.user.email,
                birthYear: null // Will be set during onboarding
              })
            })

            if (profileResponse.ok) {
              // Create JWT token for API compatibility
              const tokenResponse = await fetch('/api/auth/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  userId: data.session.user.id,
                  email: data.session.user.email
                })
              })
              
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json()
                document.cookie = `auth-token=${tokenData.token}; path=/; max-age=604800` // 7 days
              }

              // Process any pending invitations for this user
              try {
                console.log('🔍 Checking for pending invitations...')
                const inviteResponse = await fetch('/api/auth/process-invitation', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    userId: data.session.user.id,
                    email: data.session.user.email
                  })
                })

                if (inviteResponse.ok) {
                  const inviteData = await inviteResponse.json()
                  if (inviteData.chaptersAdded > 0) {
                    console.log(`✅ Granted access to ${inviteData.chaptersAdded} chapter(s)`)
                    toast.success(`Email confirmed! You've been granted access to ${inviteData.chaptersAdded} chapter${inviteData.chaptersAdded > 1 ? 's' : ''}.`)
                  } else {
                    toast.success('Email confirmed! Welcome to your life timeline.')
                  }
                } else {
                  console.warn('⚠️ Failed to process invitations, but email confirmed')
                  toast.success('Email confirmed! Welcome to your life timeline.')
                }
              } catch (inviteError) {
                console.warn('⚠️ Error processing invitations:', inviteError)
                toast.success('Email confirmed! Welcome to your life timeline.')
              }
              
              router.push('/')
            } else {
              console.error('Profile creation failed')
              toast.error('Email confirmed but profile setup failed. Please try signing in.')
              router.push('/auth/login')
            }
          } catch (profileError) {
            console.error('Profile creation error:', profileError)
            toast.error('Email confirmed but profile setup failed. Please try signing in.')
            router.push('/auth/login')
          }
        } else {
          setError('No user session found')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Callback error:', error)
        setError('Something went wrong during email confirmation')
        setIsLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-white to-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirming your email...</h2>
          <p className="text-gray-600">Please wait while we verify your account.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-white to-primary-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Confirmation Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => router.push('/auth/register')}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
