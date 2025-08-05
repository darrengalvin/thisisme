'use client'

import { useState, useEffect } from 'react'
import { User, LogOut, Settings, Mail, Calendar, Save, Edit, AlertCircle, CheckCircle } from 'lucide-react'
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* User Info */}
          <div className="text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User size={32} className="text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {user?.email?.split('@')[0] || 'User'}
            </h3>
            <p className="text-gray-600 flex items-center justify-center space-x-1">
              <Mail size={16} />
              <span>{user?.email}</span>
            </p>
          </div>

          {/* Birth Year Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Birth Year</h4>
            {isEditingBirthYear ? (
              <div className="space-y-3">
                <div>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="e.g. 1990"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This sets the starting point for your life timeline
                  </p>
                </div>
                
                {/* Error Message Display */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 text-sm font-medium">Unable to save changes</p>
                      <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                      {errorMessage.includes('onboarding') && (
                        <button
                          onClick={() => window.location.href = '/'}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                        >
                          Complete onboarding now →
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateBirthYear}
                    disabled={isUpdating}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
                  >
                    <Save size={14} />
                    <span>{isUpdating ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={isUpdating}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-700">
                    {user?.birthYear ? user.birthYear : 'Not set'}
                  </span>
                </div>
                <button
                  onClick={() => setIsEditingBirthYear(true)}
                  className="flex items-center space-x-1 px-2 py-1 text-primary-600 hover:bg-primary-50 rounded-md text-sm"
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Account Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Member since:</span>
                <span className="text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User ID:</span>
                <span className="text-gray-900 font-mono text-xs">{user?.id}</span>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-3">About This is Me</h4>
            <div className="text-sm text-slate-600 space-y-2">
              <p>Version 1.0.0 - Timeline MVP</p>
              <p>Capture, organise, and share your life memories with friends and family.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button className="w-full btn-outline flex items-center justify-center space-x-2">
              <Settings size={16} />
              <span>Settings</span>
            </button>
            
            <button 
              onClick={onLogout}
              className="w-full btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center space-x-2"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 