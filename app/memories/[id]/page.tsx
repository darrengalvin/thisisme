'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Eye, MessageSquare, Edit, Image, Lock, CheckCircle, Upload, Users, Play, FileText, Music } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import MemoryCollaboration from '@/components/MemoryCollaboration'

interface Memory {
  id: string
  title: string
  text_content?: string
  image_url?: string
  user_id: string
  created_at: string
  media?: Array<{
    id: string
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
    storage_url: string
    thumbnail_url?: string
    filename: string
    file_size: number
    created_at: string
  }>
  memory_tags?: Array<{
    id: string
    tagged_person_id: string
    user_networks: {
      id: string
      person_name: string
      person_email?: string
      relationship?: string
    }
  }>
}

interface InvitationInfo {
  memory: Memory
  inviterName: string
  permissions: string[]
}

const permissionIcons = {
  view: Eye,
  comment: MessageSquare,
  add_text: Edit,
  add_images: Image
}

const permissionLabels = {
  view: 'View Memory',
  comment: 'Add Comments',
  add_text: 'Edit Text',
  add_images: 'Add Photos'
}

export default function MemoryInvitationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const memoryId = params.id as string
  const isInvited = searchParams.get('invited') === 'true'
  const { user, session, loading: authLoading } = useAuth()
  
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    if (!user && !session) {
      // User not authenticated - redirect to login with return URL
      const currentUrl = window.location.pathname + window.location.search
      window.location.href = `/auth/login?returnUrl=${encodeURIComponent(currentUrl)}`
      return
    }

    if (user && session) {
      // User is authenticated - load the memory
      loadMemory()
    }
  }, [user, session, authLoading, memoryId, isInvited])

  const loadMemory = async () => {
    try {
      if (!user) {
        setError('User not authenticated')
        return
      }

      // Get JWT token for API call
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get authentication token')
      }

      const { token } = await tokenResponse.json()

      const response = await fetch(`/api/memories/${memoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 SHARED MEMORY: API response data:', data)
        setInvitationInfo({
          memory: data.memory,
          inviterName: 'Memory Owner', // This would come from the invitation data
          permissions: data.permissions || ['view', 'comment'] // Use permissions from API response
        })
      } else {
        setError('Memory not found or access denied')
      }
    } catch (error) {
      console.error('Failed to load memory:', error)
      setError('Failed to load memory')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    try {
      if (!user) {
        alert('User not authenticated')
        return
      }

      // User is already authenticated, accept the invitation
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get authentication token')
      }

      const { token } = await tokenResponse.json()

      const response = await fetch(`/api/memories/${memoryId}/accept-invitation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInvitationInfo(data.memory)
        // Redirect to the memory view
        window.location.href = `/memories/${memoryId}`
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Error handling invitation acceptance:', error)
      alert('Error processing invitation. Please try again.')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Authenticating...' : 'Loading memory invitation...'}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/auth/login">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isInvited && !invitationInfo) {
    // Invitation landing page
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-lg">
          <div className="text-center p-6 border-b">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Memory Collaboration Invitation</h1>
            <p className="text-gray-600 mt-2">
              You've been invited to collaborate on a memory
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">What you can do:</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">View the memory and its content</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">Add comments and corrections</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">Edit and add text descriptions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Image className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">Upload and add photos</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleAcceptInvitation} 
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Accept Invitation & Create Account
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 font-semibold">
                Sign In to Existing Account
              </button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>By accepting, you'll be able to collaborate on this memory</p>
              <p>and access other memories you have permission for.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Memory Dashboard View (when user is authenticated)
  if (invitationInfo && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
                  <span className="text-2xl">←</span>
                  <span className="ml-2 font-medium">Back to Dashboard</span>
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <span className="text-gray-600 text-sm">Shared Memory</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Powered by</span>
                <span className="font-bold text-blue-600">This is Me</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            
            {/* Main Memory Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Memory Header */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 break-words">{invitationInfo.memory.title}</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs sm:text-sm text-gray-600">
                      <span className="flex items-center">📅 {new Date(invitationInfo.memory.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center">👤 Shared by {invitationInfo.inviterName}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 sm:ml-4">
                    {invitationInfo.permissions.map(permission => {
                      const Icon = permissionIcons[permission as keyof typeof permissionIcons]
                      return (
                        <span key={permission} className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">
                          <Icon className="h-3 w-3" />
                          <span className="hidden sm:inline">{permissionLabels[permission as keyof typeof permissionLabels]}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Memory Media Gallery */}
                {invitationInfo.memory.media && invitationInfo.memory.media.length > 0 && (
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <Image className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" />
                      Media ({invitationInfo.memory.media.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {invitationInfo.memory.media.map((media) => (
                        <div key={media.id} className="relative group">
                          {media.type === 'IMAGE' && (
                            <div className="relative overflow-hidden rounded-xl shadow-md">
                              <img 
                                src={media.storage_url} 
                                alt={media.filename} 
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <Image className="w-8 h-8 text-white" />
                                </div>
                              </div>
                            </div>
                          )}
                          {media.type === 'VIDEO' && (
                            <div className="relative overflow-hidden rounded-xl shadow-md">
                              <video 
                                src={media.storage_url} 
                                className="w-full h-48 object-cover"
                                controls
                              />
                              <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                                <Play className="w-3 h-3 mr-1" />
                                Video
                              </div>
                            </div>
                          )}
                          {media.type === 'AUDIO' && (
                            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6 shadow-md">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                                  <Music className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 truncate">{media.filename}</p>
                                  <audio src={media.storage_url} controls className="w-full mt-2" />
                                </div>
                              </div>
                            </div>
                          )}
                          {media.type === 'DOCUMENT' && (
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 shadow-md">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 truncate">{media.filename}</p>
                                  <p className="text-sm text-gray-600">
                                    {(media.file_size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy single image fallback */}
                {(!invitationInfo.memory.media || invitationInfo.memory.media.length === 0) && invitationInfo.memory.image_url && (
                  <div className="mb-6">
                    <img 
                      src={invitationInfo.memory.image_url} 
                      alt={invitationInfo.memory.title} 
                      className="w-full h-80 object-cover rounded-xl shadow-md"
                    />
                  </div>
                )}

                {/* Tagged People */}
                {invitationInfo.memory.memory_tags && invitationInfo.memory.memory_tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-green-600" />
                      People in this memory ({invitationInfo.memory.memory_tags.length})
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {invitationInfo.memory.memory_tags.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {tag.user_networks.person_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-green-900">{tag.user_networks.person_name}</p>
                            {tag.user_networks.relationship && (
                              <p className="text-xs text-green-600">{tag.user_networks.relationship}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Memory Text */}
                {invitationInfo.memory.text_content && (
                  <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
                    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border-l-4 border-blue-500">
                      <p className="text-gray-800 leading-relaxed text-sm sm:text-base lg:text-lg">{invitationInfo.memory.text_content}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Contributions Section */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <MemoryCollaboration 
                  memoryId={invitationInfo.memory.id}
                  memoryTitle={invitationInfo.memory.title}
                  permissions={invitationInfo.permissions}
                  isOwner={false}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Start Your Own Timeline CTA */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 text-white">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">✨</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">Start Your Own Timeline</h3>
                  <p className="text-blue-100 mb-4 text-xs sm:text-sm leading-relaxed">
                    Create your own memory collection and share life's precious moments with the people who matter most.
                  </p>
                  <Link href="/">
                    <button className="w-full bg-white text-blue-600 py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm sm:text-base">
                      Get Started Free
                    </button>
                  </Link>
                </div>
              </div>

              {/* Features Highlight */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">What you can do:</h4>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs sm:text-sm">📸</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700">Capture & organize memories</span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs sm:text-sm">👥</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700">Collaborate with family & friends</span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 text-xs sm:text-sm">🗂️</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700">Organize by life chapters</span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 text-xs sm:text-sm">💬</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700">Add comments & stories</span>
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="text-center">
                  <div className="flex justify-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400">⭐</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    "This is Me helps families preserve and share their most precious memories."
                  </p>
                  <p className="text-xs text-gray-500 mt-2">- Happy families everywhere</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
