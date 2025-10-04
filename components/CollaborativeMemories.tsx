'use client'

import { useState, useEffect } from 'react'
import { Eye, MessageSquare, Edit, Image, Users, Calendar } from 'lucide-react'

interface CollaborativeMemory {
  id: string
  title: string
  text_content?: string
  image_url?: string
  user_id: string
  created_at: string
  updated_at: string
  type: 'owned' | 'collaborative'
  permissions: string[]
  isOwner: boolean
  invitedBy?: string
  collaborationId?: string
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
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'collaborative'>('all')

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

  const filteredMemories = memories.filter(memory => {
    if (activeTab === 'all') return true
    if (activeTab === 'owned') return memory.type === 'owned'
    if (activeTab === 'collaborative') return memory.type === 'collaborative'
    return true
  })

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
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Collaborative Memories</h2>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('owned')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'owned'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Memories ({memories.filter(m => m.type === 'owned').length})
          </button>
          <button
            onClick={() => setActiveTab('collaborative')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'collaborative'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Shared ({memories.filter(m => m.type === 'collaborative').length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'all' ? 'No memories yet' : 
               activeTab === 'owned' ? 'No memories created' : 
               'No shared memories'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'all' ? 'Start by creating your first memory or accepting an invitation.' :
               activeTab === 'owned' ? 'Create your first memory to get started.' :
               'Accept memory invitations to see shared memories here.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMemories.map((memory) => (
              <div key={memory.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {memory.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    memory.type === 'owned' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {memory.type === 'owned' ? 'Owner' : 'Collaborator'}
                  </span>
                </div>

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
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <Icon className="h-3 w-3" />
                        {permissionLabels[permission as keyof typeof permissionLabels]}
                      </span>
                    )
                  })}
                </div>

                <button 
                  onClick={() => window.location.href = `/memories/${memory.id}`}
                  className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Memory
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
