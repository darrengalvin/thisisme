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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My People</h1>
              <p className="text-gray-600">Manage your personal network for @ tagging in memories</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveSubTab('people')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'people'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>My People</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSubTab('access')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'access'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Access Management</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'people' ? (
        <div>
          {/* Add Person Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Person</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newPerson.name}
                onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter person's name"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={newPerson.email}
                onChange={(e) => setNewPerson(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship (optional)
              </label>
              <input
                type="text"
                value={newPerson.relationship}
                onChange={(e) => setNewPerson(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="e.g., Family, Friend"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo URL (optional)
              </label>
              <input
                type="url"
                value={newPerson.photo_url}
                onChange={(e) => setNewPerson(prev => ({ ...prev, photo_url: e.target.value }))}
                placeholder="https://example.com/photo.jpg"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={addPerson}
              disabled={isAdding || !newPerson.name.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add Person'}
            </button>
          </div>
        </div>
      )}

      {/* People List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Your Network ({people.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your people...</p>
          </div>
        ) : people.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No people yet</h3>
            <p className="text-gray-600 mb-4">
              Add people to your network so you can @ tag them in memories
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Your First Person
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {people.map((person) => (
              <div key={person.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Photo or Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
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
                      <User className={`w-6 h-6 text-blue-600 ${person.photo_url ? 'hidden' : ''}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">{person.person_name}</h3>
                        {person.tagged_memories_count && person.tagged_memories_count > 0 && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                            {person.tagged_memories_count} memories
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        {person.person_email && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{person.person_email}</span>
                          </div>
                        )}
                        {person.relationship && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {person.relationship}
                          </span>
                        )}
                        {person.person_user_id && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">
                            Platform User
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Added {new Date(person.created_at).toLocaleDateString()}
                    </div>
                    {person.tagged_memories_count && person.tagged_memories_count > 0 && (
                      <button className="text-xs text-blue-600 hover:text-blue-800 mt-1">
                        View memories →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-2">How to use @ tagging</h3>
        <ul className="text-sm text-blue-800 space-y-1">
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
