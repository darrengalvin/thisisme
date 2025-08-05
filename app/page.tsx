'use client'

import { useAuth } from '@/components/AuthProvider'
import Dashboard from '@/components/Dashboard'
import OnboardingWizard from '@/components/OnboardingWizard'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [checkingExistingUser, setCheckingExistingUser] = useState(true)

  // Debug logging
  useEffect(() => {
    console.log('🔍 PAGE: State update -', {
      hasUser: !!user,
      userEmail: user?.email,
      loading,
      showOnboarding,
      onboardingCompleted,
      checkingExistingUser
    })
  }, [user, loading, showOnboarding, onboardingCompleted, checkingExistingUser])

  // Check if we should show onboarding or existing user login
  useEffect(() => {
    const checkUserExists = async () => {
      // Only check if we're not already authenticated
      if (!user && !loading) {
        // For now, we'll let the onboarding handle existing user detection
        // This could be enhanced to check for existing users upfront
        setCheckingExistingUser(false)
      } else {
        setCheckingExistingUser(false)
      }
    }

    checkUserExists()
  }, [user, loading])

  const handleOnboardingComplete = () => {
    console.log('🎉 PAGE: Onboarding completed, waiting for auth session...')
    setOnboardingCompleted(true)
    // Don't immediately hide onboarding - wait for user session to be detected
  }

  // Auto-hide onboarding once we have a user after completion
  useEffect(() => {
    if (onboardingCompleted && user) {
      console.log('✅ PAGE: User session detected after onboarding, showing dashboard')
      setShowOnboarding(false)
    }
  }, [onboardingCompleted, user])

  // Auto-hide onboarding for existing authenticated users
  useEffect(() => {
    if (user && !loading) {
      console.log('🔄 PAGE: Authenticated user detected, hiding onboarding')
      setShowOnboarding(false)
    }
  }, [user, loading])

  if (loading || checkingExistingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Loading This is Me</h3>
          <p className="text-slate-600">
            {checkingExistingUser ? 'Checking your account...' : 'Preparing your story...'}
          </p>
        </div>
      </div>
    )
  }

  // Show loading state while waiting for auth after onboarding completion
  if (onboardingCompleted && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">🎉 Account Created!</h3>
          <p className="text-slate-600">Launching your timeline...</p>
        </div>
      </div>
    )
  }

  // Show onboarding for new users only
  if (!user && showOnboarding) {
    return (
      <OnboardingWizard 
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    )
  }

  // Show login page for users who skipped onboarding or existing users
  if (!user && !showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to This is Me</h1>
            <p className="text-slate-600">Choose how you'd like to continue</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.href = '/auth/login'
              }}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Sign In to Existing Account
            </button>
            
            <div className="text-center text-sm text-slate-500">or</div>
            
            <button
              onClick={async () => {
                console.log('🔄 PAGE: Creating new account - clearing any lingering session...')
                
                // Clear any lingering session/cookies first
                const { supabase } = await import('@/lib/supabase')
                await supabase.auth.signOut()
                
                // Clear auth cookies
                document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                
                // Force a clean state
                setTimeout(() => {
                  console.log('✅ PAGE: Starting fresh onboarding...')
                  setShowOnboarding(true)
                }, 100)
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium transition-colors"
            >
              Create New Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show dashboard for authenticated users
  if (user && !showOnboarding) {
    console.log('🏠 PAGE: Showing Dashboard for authenticated user:', user?.email)
    return <Dashboard />
  }

  // If user exists but onboarding is still showing, stay in onboarding
  if (user && showOnboarding && !onboardingCompleted) {
    console.log('⏳ PAGE: User authenticated but onboarding still in progress...')
    return (
      <OnboardingWizard 
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    )
  }
} 