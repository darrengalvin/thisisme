'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { UserPlus, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Chapter {
  id: string
  title: string
  description?: string
  created_at: string
}

export default function JoinChapterPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, session } = useAuth()
  
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const chapterId = params.chapterId as string
  const token = searchParams.get('token')
  const expires = searchParams.get('expires')
  const invited = searchParams.get('invited')

  // Check if token is expired
  const isExpired = expires && new Date().getTime() > parseInt(expires)

  useEffect(() => {
    if (chapterId) {
      fetchChapter()
    }
  }, [chapterId])

  const fetchChapter = async () => {
    try {
      setLoading(true)
      
      // Get chapter details
      const response = await fetch(`/api/chapters/${chapterId}`)
      
      if (response.ok) {
        const data = await response.json()
        setChapter(data.chapter)
      } else {
        setError('Chapter not found or access denied')
      }
    } catch (error) {
      console.error('Error fetching chapter:', error)
      setError('Failed to load chapter details')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinChapter = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `/auth/login?returnUrl=${returnUrl}`
      return
    }

    try {
      setJoining(true)
      
      // Get JWT token
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Authentication failed')
      }

      const { token } = await tokenResponse.json()

      // Join the chapter
      const response = await fetch('/api/chapters/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chapterId,
          inviteToken: token,
          invitedBy: invited === 'true'
        })
      })

      if (response.ok) {
        setJoined(true)
        toast.success('Successfully joined the chapter!')
        
        // Redirect to chapter after 2 seconds
        setTimeout(() => {
          window.location.href = `/chapters/${chapterId}`
        }, 2000)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to join chapter')
      }
    } catch (error) {
      console.error('Error joining chapter:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      toast.error('Failed to join chapter')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chapter details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
          <p className="text-gray-600 mb-6">
            This invitation link has expired. Please request a new invitation from the chapter owner.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Chapter!</h1>
          <p className="text-gray-600 mb-6">
            You've successfully joined "{chapter?.title}". You'll be redirected to the chapter shortly.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Chapter Collaboration</h1>
          <p className="text-gray-600">
            You've been invited to collaborate on this chapter
          </p>
        </div>

        {chapter && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{chapter.title}</h2>
            {chapter.description && (
              <p className="text-gray-600 text-sm mb-4">{chapter.description}</p>
            )}
            <div className="text-xs text-gray-500">
              Created {new Date(chapter.created_at).toLocaleDateString()}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">As a collaborator, you can:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Add your own memories and photos</li>
              <li>• Comment on and enhance existing memories</li>
              <li>• Share your unique perspective</li>
              <li>• Help build a richer, more complete story</li>
            </ul>
          </div>

          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                You'll need to sign in or create an account to join this chapter.
              </p>
            </div>
          )}

          <button
            onClick={handleJoinChapter}
            disabled={joining}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
          >
            {joining ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Joining...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{user ? 'Join Chapter' : 'Sign In to Join'}</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
