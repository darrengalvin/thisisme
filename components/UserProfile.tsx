'use client'

import { useState, useEffect } from 'react'
import { User, LogOut, Mail, Calendar, Save, Edit, AlertCircle, Info, Clock, Sparkles } from 'lucide-react'
import { User as UserType } from '@/lib/types'
import toast from 'react-hot-toast'

interface UserProfileProps {
  onLogout: () => void
}

export default function UserProfile({ onLogout }: UserProfileProps) {
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingBirthYear, setIsEditingBirthYear] = useState(false)
  const [birthYear, setBirthYear] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.data)
        setBirthYear(data.data.birthYear?.toString() || '')
      } else {
        toast.error('Failed to load your profile. Please try refreshing the page.')
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      toast.error('Something went wrong loading your profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const getAuthToken = () => {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    return authCookie ? authCookie.split('=')[1] : ''
  }

  const handleUpdateBirthYear = async () => {
    setIsUpdating(true)
    setErrorMessage('')
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          birthYear: birthYear ? parseInt(birthYear) : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.data)
        setIsEditingBirthYear(false)
        toast.success('Birth year updated successfully! 🎉')
      } else {
        const error = await response.json()
        console.error('Failed to update birth year:', error.error)
        
        // Handle specific error cases with nice UI messages
        if (error.error.includes('onboarding')) {
          setErrorMessage('Your profile needs to be set up. Please complete the onboarding process first.')
        } else if (error.error.includes('permissions')) {
          setErrorMessage('Unable to save changes due to permission settings. Please contact support.')
        } else if (error.error.includes('Birth year')) {
          setErrorMessage('Please enter a valid birth year between 1900 and current year.')
        } else {
          setErrorMessage('Unable to save your birth year. Please try again in a moment.')
        }
        
        toast.error('Failed to update birth year')
      }
    } catch (error) {
      console.error('Failed to update birth year:', error)
      setErrorMessage('Something went wrong. Please check your connection and try again.')
      toast.error('Failed to update birth year')
    } finally {
      setIsUpdating(false)
    }
  }

  const cancelEdit = () => {
    setBirthYear(user?.birthYear?.toString() || '')
    setIsEditingBirthYear(false)
    setErrorMessage('')
  }

  const calculateAge = (birthYear: number): number => {
    const currentYear = new Date().getFullYear()
    return currentYear - birthYear
  }

  const getMembershipDuration = (createdAt: Date): string => {
    const now = new Date()
    const created = new Date(createdAt)
    const months = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30))
    
    if (months < 1) return 'Less than a month'
    if (months === 1) return '1 month'
    if (months < 12) return `${months} months`
    
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    
    if (years === 1 && remainingMonths === 0) return '1 year'
    if (years === 1) return `1 year, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`
    if (remainingMonths === 0) return `${years} years`
    return `${years} years, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h2 className="text-2xl font-bold text-slate-900">Your Profile</h2>
        <p className="text-sm text-slate-600 mt-1">Manage your account settings and timeline preferences</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* User Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8 text-white">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                  <User size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-blue-100 flex items-center space-x-1.5 mt-1">
                    <Mail size={14} />
                    <span className="text-sm">{user?.email}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Age Display */}
              {user?.birthYear && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Sparkles size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Current Age</p>
                      <p className="text-xs text-slate-600">Based on your birth year</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {calculateAge(user.birthYear)}
                  </span>
                </div>
              )}

              {/* Membership Duration */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock size={20} className="text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Member For</p>
                    <p className="text-xs text-slate-600">
                      Since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {user?.createdAt ? getMembershipDuration(user.createdAt) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Birth Year Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 text-lg">Birth Year</h4>
                <p className="text-sm text-slate-600 mt-0.5">
                  Sets the starting point for your life timeline
                </p>
              </div>
            </div>

            {isEditingBirthYear ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                  />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
                  <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">How this affects your timeline:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Your timeline will start from this year</li>
                      <li>• Memories will be organized chronologically from your birth</li>
                      <li>• This helps calculate your age for each memory</li>
                      <li>• You can change this anytime without losing memories</li>
                    </ul>
                  </div>
                </div>
                
                {/* Error Message Display */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-900 text-sm font-semibold">Unable to save changes</p>
                      <p className="text-red-800 text-sm mt-1">{errorMessage}</p>
                      {errorMessage.includes('onboarding') && (
                        <button
                          onClick={() => window.location.href = '/'}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 underline font-medium"
                        >
                          Complete onboarding now →
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleUpdateBirthYear}
                    disabled={isUpdating || !birthYear}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    <Save size={16} />
                    <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={isUpdating}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Your birth year</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {user?.birthYear ? user.birthYear : 'Not set'}
                    </p>
                    {user?.birthYear && (
                      <p className="text-xs text-slate-500 mt-1">
                        You are currently {calculateAge(user.birthYear)} years old
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditingBirthYear(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                </div>

                {!user?.birthYear && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-900">
                      <p className="font-medium">Timeline not configured</p>
                      <p className="text-amber-800 mt-1">
                        Set your birth year to unlock the full timeline experience and see your life story chronologically.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 text-lg mb-3">About This is Me</h4>
            <div className="text-sm text-slate-600 space-y-2">
              <p className="flex items-center justify-between">
                <span>Version</span>
                <span className="font-mono font-medium text-slate-900">1.0.0</span>
              </p>
              <p className="text-slate-500 pt-2 border-t border-slate-100">
                Capture, organize, and share your life memories with friends and family.
              </p>
            </div>
          </div>

          {/* Sign Out */}
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
} 