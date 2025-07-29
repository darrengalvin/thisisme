'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { LoginFormData } from '@/lib/types'
import { validateEmail } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Please enter your email address first')
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password reset email sent! Check your inbox.')
        setShowForgotPassword(false)
      }
    } catch (error) {
      toast.error('Failed to send reset email. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!validateEmail(formData.email)) {
        toast.error('Please enter a valid email address')
        return
      }

      // Use Supabase auth for sign in
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        console.error('Sign in error:', error)
        toast.error(error.message || 'Sign in failed')
        return
      }

      if (data.user) {
        console.log('✅ User signed in successfully:', data.user.email)
        
        // Create JWT token for API compatibility
        try {
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
            console.log('🍪 API auth token set')
          }
        } catch (tokenError) {
          console.warn('⚠️ Failed to create API token, but Supabase session is active')
        }
        
        toast.success('Welcome back!')
        router.push('/')
      } else {
        toast.error('Sign in failed - no user data received')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h2 className="text-4xl font-bold text-white">
            Welcome back!
          </h2>
          <p className="mt-3 text-slate-300 text-lg">
            Sign in to access your memories
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white rounded-3xl shadow-2xl p-8" onSubmit={handleSubmit}>
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
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl text-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="font-medium text-slate-800 hover:text-slate-900"
              >
                Create one here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 