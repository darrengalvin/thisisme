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
  const [chapters, setChapters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'memories-shared' | 'chapters-shared' | 'shared-by-you'>('memories-shared')

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

      // Fetch both collaborative memories and chapters in parallel
      const [memoriesResponse, chaptersResponse] = await Promise.all([
        fetch('/api/memories/collaborative', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/timezones', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!memoriesResponse.ok) {
        throw new Error('Failed to fetch collaborative memories')
      }

      const memoriesData = await memoriesResponse.json()
      setMemories(memoriesData.data || [])

      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json()
        // Filter to only show chapters NOT created by the user (shared with them)
        // Check multiple field variations for creator ID
        const sharedChapters = (chaptersData.timeZones || []).filter((chapter: any) => {
          const creatorId = chapter.creatorId || chapter.creator_id || chapter.createdById
          return creatorId && creatorId !== user.id
        })
        console.log(`🔍 SHARED: ${chaptersData.timeZones?.length} total, ${sharedChapters.length} shared with you`)
        setChapters(sharedChapters)
      }
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
    if (activeTab === 'memories-shared') return memory.type === 'collaborative'
    if (activeTab === 'shared-by-you') return memory.type === 'shared'
    return true
  })
  
  // Separate pending and accepted memories for "Memories Shared" tab
  const pendingMemories = filteredMemories.filter(m => m.status === 'pending' && activeTab === 'memories-shared')
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
            onClick={() => setActiveTab('memories-shared')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'memories-shared'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Memories</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'memories-shared' ? 'bg-blue-100' : 'bg-gray-200'
              }`}>
                {memories.filter(m => m.type === 'collaborative').length}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('chapters-shared')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'chapters-shared'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Chapters</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'chapters-shared' ? 'bg-blue-100' : 'bg-gray-200'
              }`}>
                {chapters.length}
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
        {/* Chapters Shared Tab - NEW! */}
        {activeTab === 'chapters-shared' && (
          <>
            {chapters.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chapters Shared With You</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  When someone invites you to collaborate on their chapters, they'll appear here. 
                  You'll be able to add memories and contribute to their life story!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="border border-slate-200 bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg mb-1">{chapter.title}</h3>
                        <p className="text-sm text-slate-600">
                          Shared by <span className="font-medium">{chapter.creator?.email || 'Someone'}</span>
                        </p>
                        {chapter.description && (
                          <p className="text-sm text-slate-600 mt-2">{chapter.description}</p>
                        )}
                        {(chapter.startDate || chapter.endDate) && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <Calendar size={14} />
                            {chapter.startDate && new Date(chapter.startDate).getFullYear()}
                            {chapter.endDate && ` - ${new Date(chapter.endDate).getFullYear()}`}
                          </div>
                        )}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-3">
                        Collaborator
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => window.location.href = '/?view=life'}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                      >
                        View in Life Timeline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pending Invitations Section - Only for "Memories Shared" tab */}
        {activeTab === 'memories-shared' && pendingMemories.length > 0 && (
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
              activeTab === 'memories-shared' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              {activeTab === 'memories-shared' ? (
                <UserPlus className="h-8 w-8 text-blue-600" />
              ) : (
                <Share2 className="h-8 w-8 text-purple-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'memories-shared' 
                ? 'No memories shared with you yet' 
                : 'You haven\'t shared any memories yet'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto text-sm">
              {activeTab === 'memories-shared' 
                ? 'When someone shares a memory with you, it will appear here so you can view and contribute based on their permissions.' 
                : 'Share your memories with friends and family! When you invite others to collaborate on your memories, they will appear here.'}
            </p>
          </div>
        ) : acceptedMemories.length > 0 ? (
          <>
            {activeTab === 'memories-shared' && acceptedMemories.length > 0 && (
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                Accepted Collaborations
              </h3>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {acceptedMemories.map((memory) => (
              <div 
                key={memory.id} 
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  activeTab === 'memories-shared' 
                    ? 'border-blue-200 bg-blue-50/30' 
                    : 'border-purple-200 bg-purple-50/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                    {memory.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                    activeTab === 'memories-shared'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {activeTab === 'memories-shared' 
                      ? 'Collaborator' 
                      : `Shared (${memory.collaboratorsCount || 0})`}
                  </span>
                </div>

                {/* Show who shared this memory (only for memories-shared tab) */}
                {activeTab === 'memories-shared' && memory.invitedBy && (
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
                          activeTab === 'memories-shared' ? 'border-blue-200' : 'border-purple-200'
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
                    activeTab === 'memories-shared'
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
