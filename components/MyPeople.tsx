'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Users, Plus, Mail, User, X, Calendar, BookOpen, ArrowLeft, Shield } from 'lucide-react'
import AccessManagement from './AccessManagement'

interface NetworkPerson {
  id: string
  person_name: string
  person_email?: string
  relationship?: string
  person_user_id?: string
  photo_url?: string
  created_at: string
  tagged_memories_count?: number
}

interface TaggedMemory {
  id: string
  title: string
  description: string
  memory_date: string
  tagged_at: string
  chapter: string
}

export default function MyPeople() {
  const { user } = useAuth()
  const [people, setPeople] = useState<NetworkPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'people' | 'access'>('people')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPerson, setNewPerson] = useState({
    name: '',
    email: '',
    relationship: '',
    photo_url: ''
  })
  const [isAdding, setIsAdding] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<NetworkPerson | null>(null)
  const [personMemories, setPersonMemories] = useState<TaggedMemory[]>([])
  const [loadingMemories, setLoadingMemories] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPeople()
    }
  }, [user])

  const fetchPeople = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get JWT token
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) return

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { people } = await response.json()
        setPeople(people)
      }
    } catch (error) {
      console.error('Failed to fetch people:', error)
    } finally {
      setLoading(false)
    }
  }

  const addPerson = async () => {
    if (!user || !newPerson.name.trim()) return

    setIsAdding(true)
    try {
      // Get JWT token
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) throw new Error('Failed to get token')

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          person_name: newPerson.name.trim(),
          person_email: newPerson.email.trim() || undefined,
          relationship: newPerson.relationship.trim() || undefined,
          photo_url: newPerson.photo_url.trim() || undefined
        })
      })

      if (response.ok) {
        setNewPerson({ name: '', email: '', relationship: '', photo_url: '' })
        setShowAddForm(false)
        fetchPeople() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to add person:', error)
    } finally {
      setIsAdding(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p className="text-gray-600">You need to be authenticated to manage your people.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header - Compact mobile design */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <Users className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-3xl font-bold text-gray-900 truncate">My People</h1>
              <p className="hidden sm:block text-sm sm:text-base text-gray-600">Manage your network for @ tagging</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-xs sm:text-base flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">Add Person</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation - Mobile optimized */}
      <div className="mb-6">
        <div className="border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveSubTab('people')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                activeSubTab === 'people'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>My People</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSubTab('access')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeSubTab === 'access'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Access Management</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'people' ? (
        <div>
          {/* Add Person Form - Mobile optimized */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Add New Person</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newPerson.name}
                onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter person's name"
                className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={newPerson.email}
                onChange={(e) => setNewPerson(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Relationship (optional)
              </label>
              <input
                type="text"
                value={newPerson.relationship}
                onChange={(e) => setNewPerson(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="e.g., Family, Friend"
                className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Photo URL (optional)
              </label>
              <input
                type="url"
                value={newPerson.photo_url}
                onChange={(e) => setNewPerson(prev => ({ ...prev, photo_url: e.target.value }))}
                placeholder="https://example.com/photo.jpg"
                className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 sm:py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg sm:border-0 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={addPerson}
              disabled={isAdding || !newPerson.name.trim()}
              className="bg-blue-600 text-white px-6 py-2.5 sm:py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add Person'}
            </button>
          </div>
        </div>
      )}

      {/* People List - Mobile optimized */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold">Your Network ({people.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm sm:text-base text-gray-600">Loading your people...</p>
          </div>
        ) : people.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No people yet</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Add people to your network so you can @ tag them in memories
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              Add Your First Person
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {people.map((person) => (
              <div key={person.id} className="p-4 sm:p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Photo or Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {person.photo_url ? (
                      <img 
                        src={person.photo_url} 
                        alt={person.person_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <User className={`w-5 h-5 sm:w-6 sm:h-6 text-blue-600 ${person.photo_url ? 'hidden' : ''}`} />
                  </div>
                  
                  {/* Person Info - Full width on mobile */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      {/* Name and badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">{person.person_name}</h3>
                          {person.tagged_memories_count && person.tagged_memories_count > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full whitespace-nowrap">
                              {person.tagged_memories_count} memories
                            </span>
                          )}
                        </div>
                        
                        {/* Email, relationship, and status badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {person.person_email && (
                            <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[180px] sm:max-w-none">{person.person_email}</span>
                            </div>
                          )}
                          {person.relationship && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded whitespace-nowrap">
                              {person.relationship}
                            </span>
                          )}
                          {person.person_user_id && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded whitespace-nowrap">
                              Platform User
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Date and action - On mobile, show below on sm+ show on right */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 text-right flex-shrink-0">
                        <div className="text-xs sm:text-sm text-gray-500">
                          {new Date(person.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {person.tagged_memories_count && person.tagged_memories_count > 0 && (
                          <button className="text-xs text-blue-600 hover:text-blue-800 active:text-blue-900 whitespace-nowrap">
                            View memories →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions - Mobile optimized */}
      <div className="mt-6 sm:mt-8 bg-blue-50 rounded-lg p-4 sm:p-6">
        <h3 className="font-medium text-sm sm:text-base text-blue-900 mb-2">How to use @ tagging</h3>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
          <li>• When creating memories, type @ followed by a person's name</li>
          <li>• Select from your network or add new people on the fly</li>
          <li>• Tagged people will be notified if they're platform users</li>
          <li>• Use this to involve family and friends in your memories</li>
        </ul>
      </div>
        </div>
      ) : (
        <div>
          {/* Access Management Tab */}
          <AccessManagement />
        </div>
      )}
    </div>
  )
}
