'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Calendar, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface LoadingTimeoutHandlerProps {
  isLoading: boolean
  user: { id: string; email: string; birthYear?: number } | null
  onRefresh?: () => void
}

export default function LoadingTimeoutHandler({ 
  isLoading, 
  user, 
  onRefresh 
}: LoadingTimeoutHandlerProps) {
  const [showTimeoutPrompt, setShowTimeoutPrompt] = useState(false)
  const [showDobPrompt, setShowDobPrompt] = useState(false)
  const [birthYear, setBirthYear] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Detect if loading is stuck (more than 10 seconds)
  useEffect(() => {
    if (!isLoading) {
      setShowTimeoutPrompt(false)
      return
    }

    const timer = setTimeout(() => {
      console.log('⏰ LOADING TIMEOUT: Page has been loading for more than 10 seconds')
      
      // Check if the issue might be related to missing birth year
      if (user && !user.birthYear) {
        console.log('📅 Birth year is missing - showing DOB prompt')
        setShowDobPrompt(true)
      } else {
        console.log('⚠️ Showing general timeout prompt')
        setShowTimeoutPrompt(true)
      }
    }, 10000) // 10 seconds

    return () => clearTimeout(timer)
  }, [isLoading, user])

  const getAuthToken = () => {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    return authCookie ? authCookie.split('=')[1] : ''
  }

  const handleUpdateBirthYear = async () => {
    if (!birthYear || parseInt(birthYear) < 1900 || parseInt(birthYear) > new Date().getFullYear()) {
      toast.error('Please enter a valid birth year')
      return
    }

    setIsUpdating(true)
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          birthYear: parseInt(birthYear)
        })
      })

      if (response.ok) {
        toast.success('Birth year updated! Refreshing...')
        setShowDobPrompt(false)
        
        // Refresh the page to reload data
        setTimeout(() => {
          onRefresh?.()
          window.location.reload()
        }, 500)
      } else {
        const error = await response.json()
        toast.error('Failed to update birth year: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to update birth year:', error)
      toast.error('Failed to update birth year. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSkip = () => {
    setShowDobPrompt(false)
    setShowTimeoutPrompt(false)
    onRefresh?.()
  }

  // Show DOB prompt if birth year is missing
  if (showDobPrompt && user && !user.birthYear) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
          {/* Icon and Title */}
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Let's Set Your Birth Year
            </h2>
            <p className="text-slate-600">
              We need your birth year to properly organize your timeline and memories.
            </p>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Year of Birth
            </label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="e.g. 1990"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
              autoFocus
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <p className="font-medium mb-1">Why we need this:</p>
            <ul className="space-y-1 text-blue-800 text-xs">
              <li>• Your timeline starts from your birth year</li>
              <li>• Helps calculate your age for each memory</li>
              <li>• Organizes your life story chronologically</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleUpdateBirthYear}
              disabled={isUpdating || !birthYear}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <CheckCircle size={18} />
              <span>{isUpdating ? 'Saving...' : 'Continue'}</span>
            </button>
            <button
              onClick={handleSkip}
              disabled={isUpdating}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-medium transition-colors"
            >
              Skip
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            You can always update this later in your profile settings
          </p>
        </div>
      </div>
    )
  }

  // Show general timeout prompt if still loading after timeout
  if (showTimeoutPrompt) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
          {/* Icon and Title */}
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Taking Longer Than Expected
            </h2>
            <p className="text-slate-600">
              Your data is taking a while to load. This might be due to a slow connection or temporary issue.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setShowTimeoutPrompt(false)
                onRefresh?.()
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium transition-colors"
            >
              <span>Try Again</span>
            </button>
            <button
              onClick={handleSkip}
              className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
            >
              Continue Anyway
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            If this problem persists, please contact support
          </p>
        </div>
      </div>
    )
  }

  return null
}

// Add animation to globals.css or component styles
const styles = `
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
`

