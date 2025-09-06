'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import TaggingInput from '@/components/TaggingInput'

export default function TestCollaborationPage() {
  const { user } = useAuth()
  const [memoryText, setMemoryText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [network, setNetwork] = useState<any[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonEmail, setNewPersonEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchNetwork()
    }
  }, [user])

  const fetchNetwork = async () => {
    if (!user) return

    try {
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
        setNetwork(people)
      }
    } catch (error) {
      console.error('Failed to fetch network:', error)
    }
  }

  const addPersonToNetwork = async () => {
    if (!user || !newPersonName.trim()) return

    setLoading(true)
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
          person_name: newPersonName.trim(),
          person_email: newPersonEmail.trim() || undefined,
          relationship: 'Test'
        })
      })

      if (response.ok) {
        setMessage('✅ Person added to network!')
        setNewPersonName('')
        setNewPersonEmail('')
        fetchNetwork() // Refresh the list
      } else {
        const error = await response.json()
        setMessage(`❌ Error: ${error.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to test collaboration features</h1>
          <p className="text-gray-600">You need to be authenticated to use this test page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">🤝 Test Collaboration Features</h1>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* User Network Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">👥 Your Personal Network</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Person Form */}
            <div>
              <h3 className="font-medium mb-3">Add New Person</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Person's name"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newPersonEmail}
                  onChange={(e) => setNewPersonEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <button
                  onClick={addPersonToNetwork}
                  disabled={loading || !newPersonName.trim()}
                  className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Person'}
                </button>
              </div>
            </div>

            {/* Network List */}
            <div>
              <h3 className="font-medium mb-3">Current Network ({network.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {network.length === 0 ? (
                  <p className="text-gray-500 italic">No people in your network yet</p>
                ) : (
                  network.map((person) => (
                    <div key={person.id} className="p-2 bg-gray-50 rounded">
                      <div className="font-medium">{person.person_name}</div>
                      {person.person_email && (
                        <div className="text-sm text-gray-600">{person.person_email}</div>
                      )}
                      {person.person_user_id && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                          Platform User
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tagging Test Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">🏷️ Test @ Tagging</h2>
          
          <div className="space-y-4">
            <TaggingInput
              value={memoryText}
              onChange={setMemoryText}
              onTagsChange={setTags}
              placeholder="Try typing @ followed by a name from your network..."
              className="min-h-32"
            />
            
            {tags.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Detected Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      @{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Test Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 API Test Results</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Current User:</h3>
              <pre className="text-sm text-gray-600">
                {JSON.stringify({ id: user.id, email: user.email }, null, 2)}
              </pre>
            </div>
            
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Network API Response:</h3>
              <pre className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                {JSON.stringify(network, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">📋 Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>First, add some people to your network using the form above</li>
            <li>Then try typing @ in the text area and see if suggestions appear</li>
            <li>Select a person from the suggestions to tag them</li>
            <li>The detected tags will appear below the text area</li>
            <li>Check the API responses to see if data is being saved correctly</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
