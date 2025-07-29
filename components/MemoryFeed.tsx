'use client'

import { useState, useEffect } from 'react'
import { MemoryWithRelations } from '@/lib/types'
// import MemoryCard from './MemoryCard' // Will create simplified version
import { formatRelativeTime } from './utils'

export default function MemoryFeed({ 
  memories: propMemories, 
  onEdit: propOnEdit, 
  onDelete: propOnDelete, 
  onStartCreating 
}: { 
  memories?: MemoryWithRelations[]
  onEdit?: (memory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
  onStartCreating?: () => void
} = {}) {
  const [memories, setMemories] = useState<MemoryWithRelations[]>(propMemories || [])
  const [isLoading, setIsLoading] = useState(!propMemories)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propMemories) {
      fetchMemories()
    }
  }, [propMemories])

  const fetchMemories = async () => {
    try {
      const response = await fetch('/api/memories', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMemories(data.data || [])
      } else {
        setError('Failed to load memories')
      }
    } catch (error) {
      setError('Something went wrong while loading memories')
    } finally {
      setIsLoading(false)
    }
  }

  const getAuthToken = () => {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    return authCookie ? authCookie.split('=')[1] : ''
  }

  const handleEditMemory = (memory: MemoryWithRelations) => {
    if (propOnEdit) {
      propOnEdit(memory)
    } else {
      // TODO: Implement edit functionality
      console.log('Edit memory:', memory)
    }
  }

  const handleDeleteMemory = async (memory: MemoryWithRelations) => {
    if (!confirm('Are you sure you want to delete this memory?')) {
      return
    }

    try {
      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        if (propOnDelete) {
          propOnDelete(memory)
        } else {
          setMemories(prev => prev.filter(m => m.id !== memory.id))
        }
      } else {
        setError('Failed to delete memory')
      }
    } catch (error) {
      setError('Something went wrong while deleting memory')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading memories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={fetchMemories}
            className="mt-2 btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (memories.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-emerald-600 text-3xl">🌳</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No memories yet</h3>
          <p className="text-gray-600 leading-relaxed mb-6">
            Your memory feed will appear here. Start creating memories to grow your tree!
          </p>
          <button 
            onClick={() => onStartCreating?.()}
            className="btn-primary"
          >
            Create Your First Memory
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container-responsive p-4 lg:p-8 space-y-6">
        {memories.length > 0 && (
          <div className="text-center lg:text-left">
            <h2 className="text-2xl lg:text-3xl font-bold text-primary-600">
              Your Memories
            </h2>
            <p className="text-gray-600 mt-1">
              {memories.length} memor{memories.length !== 1 ? 'ies' : 'y'} captured
            </p>
          </div>
        )}
        
        <div className="grid gap-6 lg:gap-8">
          {memories.map((memory) => (
                              <div key={memory.id} className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-primary-600 font-medium">
                        {formatRelativeTime(memory.createdAt)}
                      </span>
                      {memory.timeZone && (
                        <span className="text-xs text-gray-500">
                          {memory.timeZone.title}
                        </span>
                      )}
                    </div>
                    
                    {memory.title && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {memory.title}
                      </h3>
                    )}
                    
                    {memory.textContent && (
                      <p className="text-gray-700 mb-4 leading-relaxed">
                        {memory.textContent}
                      </p>
                    )}
                    
                    {memory.media && memory.media.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {memory.media.map((media) => (
                          <div key={media.id}>
                            {media.type === 'IMAGE' && (
                              <img 
                                src={media.storage_url} 
                                alt="" 
                                className="w-full max-w-lg mx-auto rounded-xl"
                              />
                            )}
                            {media.type === 'VIDEO' && (
                              <video 
                                src={media.storage_url} 
                                controls 
                                className="w-full max-w-lg mx-auto rounded-xl"
                              />
                            )}
                            {media.type === 'AUDIO' && (
                              <audio 
                                src={media.storage_url} 
                                controls 
                                className="w-full max-w-lg mx-auto"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <button className="text-sm text-gray-500 hover:text-red-500">♥ Like</button>
                        <button className="text-sm text-gray-500 hover:text-primary-600">💬 Comment</button>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditMemory(memory)}
                          className="text-sm text-gray-500 hover:text-primary-600"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteMemory(memory)}
                          className="text-sm text-gray-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
          ))}
        </div>
      </div>
    </div>
  )
} 