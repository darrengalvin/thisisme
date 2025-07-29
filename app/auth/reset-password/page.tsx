'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setIsValidSession(true)
        } else {
          toast.error('Invalid or expired reset link')
          router.push('/auth/login')
        }
      } catch (error) {
        toast.error('Error validating reset link')
        router.push('/auth/login')
      }
    }

    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated successfully!')
        router.push('/')
      }
    } catch (error) {
      toast.error('Failed to update password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-xl font-bold">L</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Validating reset link...</h3>
          <p className="text-slate-300">Please wait while we verify your request.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h2 className="text-4xl font-bold text-white">
            Reset Password
          </h2>
          <p className="mt-3 text-slate-300 text-lg">
            Enter your new password below
          </p>
        </div>
        
        <form className="mt-8 space-y-6 bg-white rounded-3xl shadow-2xl p-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl text-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Back to sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 