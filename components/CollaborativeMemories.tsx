'use client'

import { useState, useEffect } from 'react'
import { Eye, MessageSquare, Edit, Image, Users, Calendar, UserPlus, Info, Share2 } from 'lucide-react'

interface CollaborativeMemory {
  id: string
  title: string
  text_content?: string
  image_url?: string
  user_id: string
  created_at: string
  updated_at: string
  type: 'owned' | 'collaborative' | 'shared'
  permissions: string[]
  isOwner: boolean
  invitedBy?: string
  invitedByEmail?: string
  collaborationId?: string
  collaboratorsCount?: number
  status?: 'pending' | 'accepted'
}

interface CollaborativeMemoriesProps {
  user: any
}

const permissionIcons = {
  view: Eye,
  comment: MessageSquare,
  add_text: Edit,
  add_images: Image
}

const permissionLabels = {
  view: 'View',
  comment: 'Comment',
  add_text: 'Edit',
  add_images: 'Add Photos'
}

export default function CollaborativeMemories({ user }: CollaborativeMemoriesProps) {
  const [memories, setMemories] = useState<CollaborativeMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'shared-with-you' | 'shared-by-you'>('shared-with-you')

  useEffect(() => {
    if (user) {
      fetchCollaborativeMemories()
    }
  }, [user])

  const fetchCollaborativeMemories = async () => {
    try {
      setLoading(true)
      
      // Get JWT token
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get authentication token')
      }

      const { token } = await tokenResponse.json()

      // Fetch collaborative memories
      const response = await fetch('/api/memories/collaborative', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch collaborative memories')
      }

      const data = await response.json()
      setMemories(data.data || [])
    } catch (error) {
      console.error('Error fetching collaborative memories:', error)
      setError('Failed to load collaborative memories')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async (collaborationId: string, memoryId: string) => {
    try {
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to accept invitation')
      }

      // Refresh the list
      await fetchCollaborativeMemories()
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      alert(error.message || 'Failed to accept invitation')
    }
  }

  const filteredMemories = memories.filter(memory => {
    if (activeTab === 'shared-with-you') return memory.type === 'collaborative'
    if (activeTab === 'shared-by-you') return memory.type === 'shared'
    return true
  })
  
  // Separate pending and accepted memories for "Shared With You" tab
  const pendingMemories = filteredMemories.filter(m => m.status === 'pending' && activeTab === 'shared-with-you')
  const acceptedMemories = filteredMemories.filter(m => m.status !== 'pending' || activeTab === 'shared-by-you')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2 mb-4">
          <Share2 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Shared Memories</h2>
        </div>
        
        {/* Explanation Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                About Shared Memories
              </h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                This is your collaboration hub! Here you can see memories that others have shared with you, 
                and memories you've shared with others. Each person has their own timeline, and when someone 
                shares a memory with you, it appears here so you can view, comment, or contribute based on 
                the permissions they've given you.
              </p>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('shared-with-you')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'shared-with-you'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Shared With You</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'shared-with-you' ? 'bg-blue-100' : 'bg-gray-200'
              }`}>
                {memories.filter(m => m.type === 'collaborative').length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('shared-by-you')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'shared-by-you'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Share2 className="h-4 w-4" />
              <span>Shared By You</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'shared-by-you' ? 'bg-purple-100' : 'bg-gray-200'
              }`}>
                {memories.filter(m => m.type === 'shared').length}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Pending Invitations Section - Only for "Shared With You" tab */}
        {activeTab === 'shared-with-you' && pendingMemories.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full mr-2 text-sm">
                {pendingMemories.length}
              </span>
              Pending Invitation{pendingMemories.length !== 1 ? 's' : ''}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingMemories.map((memory) => (
                <div 
                  key={memory.id} 
                  className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                      {memory.title || 'Untitled Memory'}
                    </h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 bg-amber-200 text-amber-900">
                      Pending
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-3 p-2 bg-white rounded-lg border border-amber-200">
                    <UserPlus className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium text-amber-700">{memory.invitedByEmail || 'Someone'}</span> invited you
                    </span>
                  </div>

                  {memory.image_url && (
                    <img 
                      src={memory.image_url} 
                      alt={memory.title || 'Memory'}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}

                  {memory.text_content && (
                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                      {memory.text_content}
                    </p>
                  )}

                  <button 
                    onClick={() => acceptInvitation(memory.collaborationId!, memory.id)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium"
                  >
                    Accept Invitation
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Memories Section */}
        {acceptedMemories.length === 0 && pendingMemories.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              activeTab === 'shared-with-you' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              {activeTab === 'shared-with-you' ? (
                <UserPlus className="h-8 w-8 text-blue-600" />
              ) : (
                <Share2 className="h-8 w-8 text-purple-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'shared-with-you' 
                ? 'No memories shared with you yet' 
                : 'You haven\'t shared any memories yet'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto text-sm">
              {activeTab === 'shared-with-you' 
                ? 'When someone shares a memory with you, it will appear here so you can view and contribute based on their permissions.' 
                : 'Share your memories with friends and family! When you invite others to collaborate on your memories, they will appear here.'}
            </p>
          </div>
        ) : acceptedMemories.length > 0 ? (
          <>
            {activeTab === 'shared-with-you' && acceptedMemories.length > 0 && (
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                Accepted Collaborations
              </h3>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {acceptedMemories.map((memory) => (
              <div 
                key={memory.id} 
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  activeTab === 'shared-with-you' 
                    ? 'border-blue-200 bg-blue-50/30' 
                    : 'border-purple-200 bg-purple-50/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                    {memory.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                    activeTab === 'shared-with-you'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {activeTab === 'shared-with-you' 
                      ? 'Collaborator' 
                      : `Shared (${memory.collaboratorsCount || 0})`}
                  </span>
                </div>

                {/* Show who shared this memory (only for shared-with-you tab) */}
                {activeTab === 'shared-with-you' && memory.invitedBy && (
                  <div className="flex items-center space-x-2 mb-3 p-2 bg-white rounded-lg border border-blue-100">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium text-blue-700">{memory.invitedBy}</span> shared this
                    </span>
                  </div>
                )}

                {memory.image_url && (
                  <img 
                    src={memory.image_url} 
                    alt={memory.title}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}

                {memory.text_content && (
                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                    {memory.text_content}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(memory.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {memory.permissions.map(permission => {
                    const Icon = permissionIcons[permission as keyof typeof permissionIcons]
                    return (
                      <span 
                        key={permission}
                        className={`inline-flex items-center gap-1 px-2 py-1 bg-white text-gray-700 rounded-full text-xs border ${
                          activeTab === 'shared-with-you' ? 'border-blue-200' : 'border-purple-200'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {permissionLabels[permission as keyof typeof permissionLabels]}
                      </span>
                    )
                  })}
                </div>

                <button 
                  onClick={() => window.location.href = `/memories/${memory.id}`}
                  className={`w-full text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium ${
                    activeTab === 'shared-with-you'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  View Memory
                </button>
              </div>
            ))}
          </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
