'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ArrowRight, ArrowLeft, Sparkles, Calendar, User, Mail, Cake, Check, BookOpen, Plus, CheckCircle } from 'lucide-react'
import SystemMessageModal from './SystemMessageModal'

type OnboardingStep = 'welcome' | 'name' | 'birth-date' | 'email' | 'timeline-building' | 'timeline-ready' | 'chapter-guide' | 'chapter-creation' | 'memory-guide' | 'memory-creation' | 'complete'

interface UserData {
  name: string
  email: string
  birthDate?: string
  birthYear?: number
  useBirthDateOnly: boolean
}

interface OnboardingWizardProps {
  onComplete: (userData: UserData) => void
  onSkip: () => void
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    useBirthDateOnly: true
  })
  const [animatedYears, setAnimatedYears] = useState<number[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [birthYear, setBirthYear] = useState<number>(new Date().getFullYear() - 25)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasStartedCreation = useRef(false) // Prevent duplicate executions
  const [showExistingUserModal, setShowExistingUserModal] = useState(false)

  // Timeline building effect - create account and go to main timeline
  React.useEffect(() => {
    if (currentStep === 'timeline-building' && !hasStartedCreation.current) {
      console.log('🎬 ONBOARDING: Timeline building started')
      hasStartedCreation.current = true // Mark as started to prevent duplicates
      
      // Show some years incrementally for animation effect
      // Calculate birth year from user input for animations
  const currentBirthYear = userData.useBirthDateOnly 
    ? userData.birthYear 
    : userData.birthDate 
      ? new Date(userData.birthDate).getFullYear() 
      : null
  const targetYear = currentBirthYear || (new Date().getFullYear() - 25) // fallback to 2000
      const currentYear = new Date().getFullYear()
      
      // Generate year markers for timeline animation - ensure no duplicates
      const years: number[] = []
      for (let year = targetYear; year <= currentYear; year += Math.max(1, Math.floor((currentYear - targetYear) / 20))) {
        if (!years.includes(year)) {
          years.push(year)
        }
      }
      
      // Ensure current year is included and unique
      if (!years.includes(currentYear)) {
        years.push(currentYear)
      }

      console.log('🎯 ONBOARDING: Generated unique years for animation:', years)

      let yearIndex = 0
      const yearInterval = setInterval(() => {
        if (yearIndex < years.length) {
          setAnimatedYears(prev => {
            const newYear = years[yearIndex]
            // Only add if not already present
            return prev.includes(newYear) ? prev : [...prev, newYear]
          })
          yearIndex++
        } else {
          clearInterval(yearInterval)
        }
      }, 500)
      
      const buildTimeline = async () => {
        console.log('⏰ Starting account creation process...')
        // Create account
        const result = await handleCreateAccount()
        
        if (result && typeof result === 'object' && 'isExistingUser' in result) {
          console.log('👋 Welcome back! Existing user detected, proceeding to timeline')
          // Complete immediately for existing users
          setIsAnimating(false)
          onComplete(userData)
        } else if (result) {
          console.log('✅ Account creation successful, proceeding to timeline')
          
          // For new users, create JWT token immediately
          console.log('🔑 Creating JWT token for new user...')
          try {
            const tokenResponse = await fetch('/api/auth/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: result.id,
                email: result.email
              })
            })
            
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json()
              console.log('✅ JWT token created and set:', !!tokenData.token)
              
              // Set the auth token as a cookie for API requests
              document.cookie = `auth-token=${tokenData.token}; path=/; max-age=604800` // 7 days
              console.log('🍪 Auth token cookie set for API requests')
            } else {
              console.warn('⚠️ Failed to create JWT token, API requests may not work')
            }
          } catch (tokenError) {
            console.warn('⚠️ JWT token creation failed:', tokenError)
          }
          
          // Short delay just to show the animation, then complete
          setTimeout(() => {
            console.log('🚀 Launching main timeline interface')
            setIsAnimating(false)
            onComplete(userData)
          }, 2000) // Reduced to 2 seconds
        } else {
          console.log('⚠️ Account setup encountered issues, but continuing to timeline anyway')
          // Complete even if there were issues
          setTimeout(() => {
            setIsAnimating(false)
            onComplete(userData)
          }, 1000)
        }
      }
      
      const timeoutId = setTimeout(buildTimeline, 1000) // Delay to show animation first
      return () => {
        console.log('🛑 Timeline building effect cleanup')
        clearTimeout(timeoutId)
        clearInterval(yearInterval)
      }
    }
  }, [currentStep]) // Removed other dependencies to prevent re-runs

  const handleNext = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('name')
        break
      case 'name':
        if (userData.name.trim()) setCurrentStep('birth-date')
        break
      case 'birth-date':
        const userBirthYear = userData.useBirthDateOnly ? userData.birthYear : (userData.birthDate ? new Date(userData.birthDate).getFullYear() : null)
      if (userBirthYear) setCurrentStep('email')
        break
      case 'email':
        if (userData.email.trim()) setCurrentStep('timeline-building')
        break

      case 'chapter-guide':
        setCurrentStep('chapter-creation')
        break
      case 'chapter-creation':
        setCurrentStep('memory-guide')
        break
      case 'memory-guide':
        setCurrentStep('memory-creation')
        break
      case 'memory-creation':
        setCurrentStep('complete')
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'name':
        setCurrentStep('welcome')
        break
      case 'birth-date':
        setCurrentStep('name')
        break
      case 'email':
        setCurrentStep('birth-date')
        break
      case 'chapter-guide':
        setCurrentStep('timeline-ready')
        break
    }
  }

  const handleCreateAccount = async () => {
    try {
      console.log('🚀 ONBOARDING: Starting account creation')
      // Calculate birth year from user input
      const userBirthYear = userData.useBirthDateOnly 
        ? userData.birthYear 
        : userData.birthDate 
          ? new Date(userData.birthDate).getFullYear() 
          : null

      console.log('📝 User data:', {
        name: userData.name,
        email: userData.email,
        birthYear: userBirthYear,
        useBirthDateOnly: userData.useBirthDateOnly
      })
      
      // Check environment variables
      console.log('🔧 Environment check:')
      console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
      
      // Import Supabase client
      console.log('📦 Importing Supabase client...')
      const { supabase } = await import('@/lib/supabase')
      console.log('✅ Supabase client imported successfully')
      
      // Create account with Supabase Auth
      const tempPassword = Math.random().toString(36).slice(-12)
      console.log('🔐 Creating Supabase account with:', {
        email: userData.email,
        passwordLength: tempPassword.length,
        hasOptions: true
      })
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: tempPassword,
        options: {
          data: {
            email: userData.email,
            onboarding: true
          },
          emailRedirectTo: window.location.origin
        }
      })

      console.log('📊 Supabase signup response:', {
        hasData: !!authData,
        hasUser: !!authData?.user,
        userId: authData?.user?.id,
        hasError: !!signUpError,
        errorCode: signUpError?.status,
        errorMessage: signUpError?.message
      })

      // Handle user already exists - check for various error messages
      if (signUpError && (
        signUpError.message.includes('already registered') ||
        signUpError.message.includes('User already registered') ||
        signUpError.message.includes('already exists') ||
        signUpError.message.includes('duplicate') ||
        signUpError.status === 422 // Supabase returns 422 for existing users
      )) {
        console.log('👤 User already exists - showing nice modal')
        
        // Show nice modal instead of ugly alert
        setShowExistingUserModal(true)
        return null
      }

      if (signUpError) {
        console.error('❌ SIGNUP ERROR:', {
          status: signUpError.status,
          message: signUpError.message,
          details: signUpError
        })
        throw signUpError
      }

      if (authData.user) {
        console.log('✅ User created successfully!')
        console.log('👤 User details:', {
          id: authData.user.id,
          email: authData.user.email,
          emailConfirmed: authData.user.email_confirmed_at,
          createdAt: authData.user.created_at
        })
        
        // Create user profile record with birth year
        console.log('📝 Creating user profile with birth year:', userBirthYear)
        
        // Use the onboarding API endpoint to create the profile (bypasses RLS issues)
        const profileResponse = await fetch('/api/auth/onboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: authData.user.id,
            email: authData.user.email,
            birthYear: userBirthYear
          })
        })

        if (!profileResponse.ok) {
          const profileError = await profileResponse.json()
          console.error('❌ PROFILE CREATE ERROR:', profileError)
          throw new Error(profileError.error || 'Failed to create user profile')
        }

        const profileData = await profileResponse.json()
        console.log('✅ User profile created successfully:', profileData.data)

        // Personal timezone creation is now handled by the API endpoint
        console.log('✅ Personal timezone created:', profileData.data.timezoneName)

        console.log('🎉 Account creation completed successfully!')
        return authData.user
      } else {
        console.warn('⚠️ No user data returned from signup')
        return null
      }
    } catch (error) {
      console.error('💥 ACCOUNT CREATION FAILED:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error
      })
      // Don't throw - we'll let them continue to see the timeline
      return null
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      // Account should already be created during timeline animation
      onComplete(userData)
    } catch (error) {
      console.error('Completion error:', error)
      onComplete(userData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'name':
        return userData.name.trim().length > 0
      case 'birth-date':
        const userBirthYear = userData.useBirthDateOnly ? userData.birthYear : (userData.birthDate ? new Date(userData.birthDate).getFullYear() : null)
      return !!userBirthYear
      case 'email':
        return userData.email.trim().length > 0 && userData.email.includes('@')
      default:
        return true
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain">
        
        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="p-8 lg:p-12 text-center">
            <div className="w-20 h-20 bg-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl font-bold">T</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Welcome to <span className="text-sky-600">This is Me</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Your personal timeline awaits – a beautiful, chronological journey through your most precious memories, 
              organised by the chapters of your life.
            </p>
            <div className="bg-slate-50 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center space-x-8 text-sm text-slate-600">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-slate-200 rounded-xl flex items-center justify-center mb-2">
                    <User size={16} />
                  </div>
                  <span>Your Info</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-slate-200 rounded-xl flex items-center justify-center mb-2">
                    <Cake size={16} />
                  </div>
                  <span>Timeline</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-slate-200 rounded-xl flex items-center justify-center mb-2">
                    <Check size={16} />
                  </div>
                  <span>Chapters</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <span>Let's Get Started</span>
              <ArrowRight size={20} />
            </button>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
              >
                Already have an account? Sign In
              </button>
            </div>
            
            {onSkip && (
              <button
                onClick={onSkip}
                className="mt-2 text-slate-500 hover:text-slate-700 transition-colors text-sm"
              >
                Skip onboarding
              </button>
            )}
          </div>
        )}

        {/* Name Step */}
        {currentStep === 'name' && (
          <div className="p-4 sm:p-6 lg:p-12">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="text-sm text-slate-500">Step 1 of 3</div>
            </div>
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="text-slate-600" size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">What's your name?</h2>
              <p className="text-slate-600">This will personalise your timeline experience</p>
            </div>

            <div className="mb-6 sm:mb-8">
              <input
                type="text"
                placeholder="Enter your name"
                value={userData.name}
                onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-4 border border-slate-200 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="pb-4 sm:pb-0">
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Birth Date Step */}
        {currentStep === 'birth-date' && (
          <div className="p-4 sm:p-6 lg:p-12">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="text-sm text-slate-500">Step 2 of 3</div>
            </div>
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-slate-600" size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">When were you born?</h2>
              <p className="text-slate-600 mb-4">This sets the starting point for your timeline</p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                <h3 className="font-semibold text-slate-900 mb-2">💡 Why we need this:</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Your birth year becomes the foundation of your timeline. We'll create a beautiful chronological view 
                  starting from your birth and extending to today, helping you see your entire life journey at a glance. 
                  This makes it easy to organise memories by life phases and visualise how your story unfolds over time.
                </p>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
              {/* Option Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setUserData(prev => ({ ...prev, useBirthDateOnly: false, birthYear: undefined }))}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                    !userData.useBirthDateOnly 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📅 Full Date
                </button>
                <button
                  type="button"
                  onClick={() => setUserData(prev => ({ ...prev, useBirthDateOnly: true, birthDate: undefined }))}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                    userData.useBirthDateOnly 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📊 Just Year
                </button>
              </div>

              {/* Date Picker */}
              {!userData.useBirthDateOnly ? (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Choose your birth date
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Day */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Day</label>
                      <select
                        value={userData.birthDate ? new Date(userData.birthDate).getDate() : ''}
                        onChange={(e) => {
                          const day = e.target.value
                          const currentDate = userData.birthDate ? new Date(userData.birthDate) : new Date()
                          if (day) {
                            currentDate.setDate(parseInt(day))
                            setUserData(prev => ({ ...prev, birthDate: currentDate.toISOString().split('T')[0] }))
                          }
                        }}
                        className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent bg-white text-center font-medium"
                      >
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>

                    {/* Month */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Month</label>
                      <select
                        value={userData.birthDate ? new Date(userData.birthDate).getMonth() + 1 : ''}
                        onChange={(e) => {
                          const month = e.target.value
                          const currentDate = userData.birthDate ? new Date(userData.birthDate) : new Date()
                          if (month) {
                            currentDate.setMonth(parseInt(month) - 1)
                            setUserData(prev => ({ ...prev, birthDate: currentDate.toISOString().split('T')[0] }))
                          }
                        }}
                        className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent bg-white text-center font-medium"
                      >
                        <option value="">Month</option>
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map((month, index) => (
                          <option key={month} value={index + 1}>
                            {month.slice(0, 3)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Year</label>
                      <select
                        value={userData.birthDate ? new Date(userData.birthDate).getFullYear() : ''}
                        onChange={(e) => {
                          const year = e.target.value
                          const currentDate = userData.birthDate ? new Date(userData.birthDate) : new Date()
                          if (year) {
                            currentDate.setFullYear(parseInt(year))
                            setUserData(prev => ({ ...prev, birthDate: currentDate.toISOString().split('T')[0] }))
                          }
                        }}
                        className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent bg-white text-center font-medium"
                      >
                        <option value="">Year</option>
                        {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    What year were you born?
                  </label>
                  <select
                    value={userData.birthYear || ''}
                    onChange={(e) => setUserData(prev => ({ ...prev, birthYear: parseInt(e.target.value) || undefined }))}
                    className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent bg-white text-center text-lg font-medium"
                  >
                    <option value="">Select your birth year</option>
                    {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pb-4 sm:pb-0">
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Email Step */}
        {currentStep === 'email' && (
          <div className="p-4 sm:p-6 lg:p-12">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="text-sm text-slate-500">Step 3 of 3</div>
            </div>
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="text-slate-600" size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">What's your email address?</h2>
              <p className="text-slate-600 mb-4">We'll create your This is Me account automatically – no complicated passwords needed!</p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                <h3 className="font-semibold text-slate-900 mb-2">🔒 Your privacy matters:</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Your email is only used to create your secure account and keep your memories safe. 
                  We'll never share it with anyone, and you can update your security settings once your timeline is ready.
                </p>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <input
                type="email"
                placeholder="your.email@example.com"
                value={userData.email}
                onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-4 border border-slate-200 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="pb-4 sm:pb-0">
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>Start My Timeline</span>
                <Sparkles size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Timeline Building Animation */}
        {currentStep === 'timeline-building' && (
          <div className="p-8 lg:p-12 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Sparkles className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                ✨ Setting up {userData.name}'s This is Me Timeline
              </h2>
              <p className="text-slate-600">
                {userData.useBirthDateOnly ? userData.birthYear : (userData.birthDate ? new Date(userData.birthDate).getFullYear() : null) ? 
                  `Preparing your journey from ${userData.useBirthDateOnly ? userData.birthYear : new Date(userData.birthDate!).getFullYear()} to today...` :
                  'Preparing your personal timeline...'
                }
              </p>
            </div>

            {/* Timeline Animation */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 overflow-hidden">
              <div className="relative h-40">
                {/* Timeline Line */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-t from-slate-800 to-slate-300 h-full rounded-full opacity-50"></div>
                
                {/* Year Markers Animation */}
                <div className="relative h-full flex flex-col justify-between">
                  {(userData.useBirthDateOnly ? userData.birthYear : (userData.birthDate ? new Date(userData.birthDate).getFullYear() : null)) && animatedYears.map((year, index) => (
                    <div 
                      key={year}
                      className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-1000 ease-out ${
                        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                      }`}
                      style={{
                        top: `${(index / (animatedYears.length - 1)) * 100}%`,
                        animationDelay: `${index * 300}ms`
                      }}
                    >
                      <div className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        {year}
                      </div>
                      <div className="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 bg-slate-800 rounded-full mt-2"></div>
                    </div>
                  ))}
                  
                  {/* Birth Year (Start) */}
                  {(userData.useBirthDateOnly ? userData.birthYear : (userData.birthDate ? new Date(userData.birthDate).getFullYear() : null)) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                      <div className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold shadow-lg text-lg">
                        🌱 Born {userData.useBirthDateOnly ? userData.birthYear : new Date(userData.birthDate!).getFullYear()}
                      </div>
                    </div>
                  )}
                  
                  {/* Current Year (End) */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                    <div className="bg-slate-800 text-white px-4 py-2 rounded-full font-bold shadow-lg text-lg">
                      ✨ {new Date().getFullYear()}
                    </div>
                  </div>
                </div>

                {/* Animated Progress Indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-slate-500 mt-4 text-center">
                {isAnimating ? 'Preparing your timeline...' : 'Almost ready...'}
              </div>
            </div>
          </div>
        )}

        {/* Chapter Guide */}
        {currentStep === 'chapter-guide' && (
          <div className="p-8 lg:p-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-slate-600" size={24} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Let's Create a Chapter</h2>
              <p className="text-slate-600">Think of a significant period in your life</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2">💡 Chapter Ideas:</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• School/University years</li>
                  <li>• Your first job or career change</li>
                  <li>• Living in a particular place</li>
                  <li>• A relationship or family period</li>
                  <li>• Travel adventures</li>
                  <li>• Hobbies or interests</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <span>I'm Ready</span>
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Chapter Creation Placeholder */}
        {currentStep === 'chapter-creation' && (
          <div className="p-8 lg:p-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Chapter Creation</h2>
            <p className="text-slate-600 mb-8">This will integrate with your existing chapter creation flow</p>
            <button
              onClick={handleNext}
              className="bg-slate-800 hover:bg-slate-900 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
            >
              Continue to Memory Guide
            </button>
          </div>
        )}

        {/* Memory Guide */}
        {currentStep === 'memory-guide' && (
          <div className="p-8 lg:p-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="text-slate-600" size={24} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Now Add a Memory</h2>
              <p className="text-slate-600">Let's add your first memory to this chapter</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-8">
              <h3 className="font-semibold text-slate-900 mb-2">📸 What Makes a Good Memory?</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• A specific moment or event</li>
                <li>• Something meaningful to you</li>
                <li>• Photos, videos, or just a story</li>
                <li>• Can be big moments or small details</li>
              </ul>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <span>Add My First Memory</span>
              <Plus size={20} />
            </button>
          </div>
        )}

        {/* Memory Creation Placeholder */}
        {currentStep === 'memory-creation' && (
          <div className="p-8 lg:p-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Memory Creation</h2>
            <p className="text-slate-600 mb-8">This will integrate with your existing AddMemoryWizard</p>
            <button
              onClick={handleNext}
              className="bg-slate-800 hover:bg-slate-900 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
            >
              Complete Onboarding
            </button>
          </div>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <div className="p-8 lg:p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to This is Me!</h2>
            <p className="text-slate-600 mb-8">
              Your timeline is ready and your account has been created. Start capturing your life's moments!
            </p>
            
            <button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white py-4 rounded-2xl text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? 'Setting up your account...' : 'Enter This is Me'}
              {!isSubmitting && <ArrowRight size={20} />}
            </button>
          </div>
        )}
      </div>

      {/* Existing User Modal */}
      <SystemMessageModal
        isOpen={showExistingUserModal}
        type="info"
        title="Account Already Exists!"
        message={`You already have an account with ${userData.email}. Choose what you'd like to do.`}
        onClose={() => setShowExistingUserModal(false)}
      />
      {showExistingUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
            <p className="mb-3">You already have an account with <strong>{userData.email}</strong></p>
            <p className="text-sm text-gray-600 mb-4">Choose what you'd like to do:</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowExistingUserModal(false)
                  window.location.href = '/auth/login'
                }}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Sign In to Your Account
              </button>
              <button
                onClick={async () => {
                  try {
                    const { supabase } = await import('@/lib/supabase')
                    const { error } = await supabase.auth.resetPasswordForEmail(userData.email, {
                      redirectTo: `${window.location.origin}/auth/reset-password`
                    })
                    
                    if (error) {
                      console.error('Reset password error:', error)
                    } else {
                      setShowExistingUserModal(false)
                      // Show success message
                      alert('Password reset email sent! Check your inbox.')
                    }
                  } catch (error) {
                    console.error('Failed to send reset email:', error)
                  }
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Forgot Password? Reset It
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
} 