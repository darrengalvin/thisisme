'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { RegisterFormData } from '@/lib/types'
import { validateEmail, validatePassword } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!validateEmail(formData.email)) {
        toast.error('Please enter a valid email address')
        return
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
        return
      }

      const passwordValidation = validatePassword(formData.password)
      if (!passwordValidation.isValid) {
        toast.error(passwordValidation.errors[0])
        return
      }

      // Use Supabase auth for registration
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        console.error('Sign up error:', error)
        
        // Handle specific error cases
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast.error(
            <div className="text-center">
              <p className="font-medium">Account already exists!</p>
              <p className="text-sm mt-1">This email is already registered.</p>
              <div className="mt-2 space-x-2">
                <Link 
                  href="/auth/login" 
                  className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                >
                  Sign in instead
                </Link>
                <span className="text-gray-400">•</span>
                <button
                  onClick={() => handleForgotPassword(formData.email)}
                  className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </div>,
            { duration: 8000 }
          )
        } else {
          toast.error(error.message || 'Registration failed')
        }
        return
      }

      if (data.user) {
        console.log('✅ User signed up successfully:', data.user.email)
        
        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          // User is immediately confirmed, create profile
          try {
            const profileResponse = await fetch('/api/auth/onboard', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
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
                  userId: data.user.id,
                  email: data.user.email
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
                    userId: data.user.id,
                    email: data.user.email
                  })
                })

                if (inviteResponse.ok) {
                  const inviteData = await inviteResponse.json()
                  if (inviteData.chaptersAdded > 0) {
                    console.log(`✅ Granted access to ${inviteData.chaptersAdded} chapter(s)`)
                    toast.success(`Account created! You've been granted access to ${inviteData.chaptersAdded} chapter${inviteData.chaptersAdded > 1 ? 's' : ''}.`)
                  } else {
                    toast.success('Account created successfully!')
                  }
                } else {
                  console.warn('⚠️ Failed to process invitations, but account created')
                  toast.success('Account created successfully!')
                }
              } catch (inviteError) {
                console.warn('⚠️ Error processing invitations:', inviteError)
                toast.success('Account created successfully!')
              }
              
              router.push('/')
            } else {
              toast.error('Account created but profile setup failed. Please try signing in.')
              router.push('/auth/login')
            }
          } catch (profileError) {
            console.error('Profile creation error:', profileError)
            toast.error('Account created but profile setup failed. Please try signing in.')
            router.push('/auth/login')
          }
        } else {
          // Email confirmation required
          toast.success(
            <div className="text-center">
              <p className="font-medium">Check your email!</p>
              <p className="text-sm mt-1">We sent a confirmation link to {formData.email}</p>
              <p className="text-xs mt-1 text-gray-600">Click the link to activate your account</p>
            </div>,
            { duration: 10000 }
          )
          router.push('/auth/login')
        }
      } else {
        toast.error('Registration failed - no user data received')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (email: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password reset email sent! Check your inbox.')
      }
    } catch (error) {
      toast.error('Failed to send reset email. Please try again.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-accent-50 via-white to-primary-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">ML</span>
          </div>
          <h2 className="text-4xl font-bold text-primary-600">
            Join My Life
          </h2>
          <p className="mt-3 text-gray-600 text-lg">
            Create your account to start capturing memories
          </p>
        </div>
        <form className="mt-8 space-y-6 card-elevated p-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input mt-1"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input mt-1"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input mt-1"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 