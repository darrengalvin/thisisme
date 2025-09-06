'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Users, Plus, Mail, User, X, Calendar, BookOpen, ArrowLeft, Shield, UserPlus, Settings, Eye, MessageCircle, Image, FileText, Lock, Unlock, Crown, Star } from 'lucide-react'
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
  recent_memories?: Array<{
    id: string
    title: string
    image_url: string
    date: string
    chapter: string
  }>
  permissions?: {
    can_view_memories: boolean
    can_add_text: boolean
    can_add_images: boolean
    can_comment: boolean
    chapters_access: string[]
  }
  collaboration_stats?: {
    contributions_made: number
    memories_shared: number
    last_active: string
  }
}

interface TaggedMemory {
  id: string
  title: string
  description: string
  memory_date: string
  tagged_at: string
  chapter: string
  image_url?: string
}

export default function MyPeopleEnhanced() {
  const { user } = useAuth()
  const [people, setPeople] = useState<NetworkPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'people' | 'access'>('people')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPerson, setNewPerson] = useState({
    name: '',
    email: '',
    relationship: '',
    photo_url: '',
    inviteMethod: 'email', // 'email' or 'sms'
    customMessage: '',
    taggedMemories: [] as string[],
    permissions: {
      can_view_memories: true,
      can_add_text: false,
      can_add_images: false,
      can_comment: true
    }
  })
  const [isAdding, setIsAdding] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<NetworkPerson | null>(null)
  const [personMemories, setPersonMemories] = useState<TaggedMemory[]>([])
  const [loadingMemories, setLoadingMemories] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [editingPermissions, setEditingPermissions] = useState<NetworkPerson | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<any>(null)
  const [showMemoryModal, setShowMemoryModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPeople()
    }
  }, [user])

  // Fetch real people from user's network
  const fetchPeople = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Get JWT token for API call
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, session: user })
      })
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get auth token')
      }
      
      const { token } = await tokenResponse.json()
      
      // Fetch real network people
      const response = await fetch('/api/network', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch network people')
      }
      
      const { people: networkPeople } = await response.json()
      
      // Transform real data to match our interface
      const transformedRealPeople = networkPeople?.map((person: any) => ({
        ...person,
        tagged_memories_count: 0, // Will be fetched separately
        recent_memories: [], // Will be fetched separately
        permissions: {
          can_view_memories: true,
          can_add_text: false,
          can_add_images: false,
          can_comment: true,
          chapters_access: []
        },
        collaboration_stats: {
          contributions_made: 0,
          memories_shared: 0,
          last_active: 'Never'
        }
      })) || []

      // Always show demo data for visualization (as requested by user dgalvin@yourcaio.co.uk)
      const demoData = [
          {
            id: '1',
            person_name: 'Sarah Johnson',
            person_email: 'sarah@example.com',
            relationship: 'Sister',
            photo_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
            created_at: '2024-01-15T10:30:00Z',
            tagged_memories_count: 23,
            person_user_id: 'user_sarah_123',
            recent_memories: [
              {
                id: 'mem1',
                title: 'Family Christmas 2023',
                image_url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=200&h=150&fit=crop',
                date: '2023-12-25',
                chapter: 'Family Holidays'
              },
              {
                id: 'mem2', 
                title: 'Sarah\'s Birthday Party',
                image_url: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=200&h=150&fit=crop',
                date: '2024-03-15',
                chapter: 'Celebrations'
              },
              {
                id: 'mem3',
                title: 'Weekend Hiking Trip',
                image_url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=150&fit=crop',
                date: '2024-05-20',
                chapter: 'Adventures'
              }
            ],
            permissions: {
              can_view_memories: true,
              can_add_text: true,
              can_add_images: true,
              can_comment: true,
              chapters_access: ['family-holidays', 'celebrations']
            },
            collaboration_stats: {
              contributions_made: 12,
              memories_shared: 8,
              last_active: '2024-08-15'
            }
          },
          {
            id: '2', 
            person_name: 'Mike Chen',
            person_email: 'mike.chen@gmail.com',
            relationship: 'Best Friend',
            photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            created_at: '2024-02-20T14:15:00Z',
            tagged_memories_count: 18,
            person_user_id: 'user_mike_456',
            recent_memories: [
              {
                id: 'mem4',
                title: 'College Reunion',
                image_url: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=200&h=150&fit=crop',
                date: '2024-06-10',
                chapter: 'College Days'
              },
              {
                id: 'mem5',
                title: 'Road Trip to Coast',
                image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=150&fit=crop',
                date: '2024-07-04',
                chapter: 'Adventures'
              }
            ],
            permissions: {
              can_view_memories: true,
              can_add_text: true,
              can_add_images: false,
              can_comment: true,
              chapters_access: ['college-days', 'adventures']
            },
            collaboration_stats: {
              contributions_made: 7,
              memories_shared: 3,
              last_active: '2024-08-20'
            }
          },
          {
            id: '3',
            person_name: 'Emma Rodriguez',
            person_email: 'emma.r@outlook.com',
            relationship: 'College Friend',
            photo_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
            created_at: '2024-03-10T09:45:00Z',
            tagged_memories_count: 15,
            person_user_id: 'user_emma_789',
            recent_memories: [
              {
                id: 'mem6',
                title: 'Art Gallery Opening',
                image_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200&h=150&fit=crop',
                date: '2024-04-12',
                chapter: 'Cultural Events'
              }
            ],
            permissions: {
              can_view_memories: true,
              can_add_text: false,
              can_add_images: false,
              can_comment: true,
              chapters_access: ['cultural-events']
            },
            collaboration_stats: {
              contributions_made: 3,
              memories_shared: 1,
              last_active: '2024-07-30'
            }
          },
          {
            id: '4',
            person_name: 'Dad (Robert)',
            person_email: 'robert.smith@email.com',
            relationship: 'Father',
            photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            created_at: '2023-12-05T16:20:00Z',
            tagged_memories_count: 34,
            recent_memories: [
              {
                id: 'mem7',
                title: 'Father\'s Day BBQ',
                image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=150&fit=crop',
                date: '2024-06-16',
                chapter: 'Family Gatherings'
              },
              {
                id: 'mem8',
                title: 'Fishing Trip',
                image_url: 'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=200&h=150&fit=crop',
                date: '2024-05-25',
                chapter: 'Father-Son Time'
              },
              {
                id: 'mem9',
                title: 'Grandpa\'s Workshop',
                image_url: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=200&h=150&fit=crop',
                date: '2024-03-30',
                chapter: 'Family Legacy'
              }
            ],
            permissions: {
              can_view_memories: true,
              can_add_text: true,
              can_add_images: true,
              can_comment: true,
              chapters_access: ['family-gatherings', 'father-son-time', 'family-legacy']
            },
            collaboration_stats: {
              contributions_made: 18,
              memories_shared: 12,
              last_active: '2024-08-25'
            }
          },
          {
            id: '5',
            person_name: 'Test Person API',
            person_email: 'test-api@example.com',
            relationship: 'Test Friend',
            photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
            created_at: '2025-09-06T12:00:00Z',
            tagged_memories_count: 5,
            recent_memories: [
              {
                id: 'mem10',
                title: 'API Testing Session',
                image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=150&fit=crop',
                date: '2025-09-06',
                chapter: 'Development'
              }
            ],
            permissions: {
              can_view_memories: true,
              can_add_text: true,
              can_add_images: false,
              can_comment: true,
              chapters_access: ['development']
            },
            collaboration_stats: {
              contributions_made: 2,
              memories_shared: 1,
              last_active: '2025-09-06'
            }
          }
        ]
      
      // Combine real people with demo data
      const allPeople = [...transformedRealPeople, ...demoData]
      
      console.log('📊 PEOPLE DATA:', {
        realPeople: transformedRealPeople.length,
        demoData: demoData.length,
        total: allPeople.length,
        realPeopleNames: transformedRealPeople.map(p => p.person_name)
      })
      
      setPeople(allPeople)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching people:', error)
      setLoading(false)
    }
  }

  const addPerson = async () => {
    if (!newPerson.name.trim()) return

    setIsAdding(true)
    try {
      // Simulate API call
      setTimeout(() => {
        const newPersonData: NetworkPerson = {
          id: Date.now().toString(),
          person_name: newPerson.name,
          person_email: newPerson.email,
          relationship: newPerson.relationship,
          photo_url: newPerson.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          created_at: new Date().toISOString(),
          tagged_memories_count: 0,
          recent_memories: [],
          permissions: {
            can_view_memories: false,
            can_add_text: false,
            can_add_images: false,
            can_comment: false,
            chapters_access: []
          },
          collaboration_stats: {
            contributions_made: 0,
            memories_shared: 0,
            last_active: 'Never'
          }
        }
        
        setPeople(prev => [newPersonData, ...prev])
        setNewPerson({ 
          name: '', 
          email: '', 
          relationship: '', 
          photo_url: '',
          inviteMethod: 'email',
          customMessage: '',
          taggedMemories: [],
          permissions: {
            can_view_memories: true,
            can_add_text: false,
            can_add_images: false,
            can_comment: true
          }
        })
        setShowAddForm(false)
        setIsAdding(false)
      }, 1000)
    } catch (error) {
      console.error('Error adding person:', error)
      setIsAdding(false)
    }
  }

  const viewPersonDetails = (person: NetworkPerson) => {
    setSelectedPerson(person)
    // Mock memories for this person
    const mockMemories: TaggedMemory[] = person.recent_memories?.map(mem => ({
      id: mem.id,
      title: mem.title,
      description: `Memory featuring ${person.person_name}`,
      memory_date: mem.date,
      tagged_at: new Date().toISOString(),
      chapter: mem.chapter,
      image_url: mem.image_url
    })) || []
    
    setPersonMemories(mockMemories)
  }

  const getPermissionIcon = (permission: boolean) => {
    return permission ? (
      <Unlock className="w-4 h-4 text-green-500" />
    ) : (
      <Lock className="w-4 h-4 text-red-500" />
    )
  }

  const getCollaborationBadge = (stats: any) => {
    const total = stats.contributions_made + stats.memories_shared
    if (total >= 15) return { label: 'Super Collaborator', color: 'bg-purple-100 text-purple-800', icon: '👑' }
    if (total >= 8) return { label: 'Active Contributor', color: 'bg-blue-100 text-blue-800', icon: '⭐' }
    if (total >= 3) return { label: 'Contributor', color: 'bg-green-100 text-green-800', icon: '✨' }
    return { label: 'New Member', color: 'bg-gray-100 text-gray-800', icon: '🌱' }
  }

  const viewMemory = (memory: any, person: NetworkPerson) => {
    // Enhance memory object with person context
    const enhancedMemory = {
      ...memory,
      person_context: person,
      description: `A wonderful memory featuring ${person.person_name} from ${memory.chapter}`,
      content: `This memory was captured on ${new Date(memory.date).toLocaleDateString()} and features ${person.person_name}. It's part of the "${memory.chapter}" chapter and represents a special moment in time.`,
      tags: [person.person_name, memory.chapter],
      location: 'Unknown', // Could be enhanced with real data
      media_type: 'image'
    }
    
    setSelectedMemory(enhancedMemory)
    setShowMemoryModal(true)
  }

  const generateInviteTemplate = (method: 'email' | 'sms', personName: string, relationship: string, taggedMemories: string[]) => {
    const memoryText = taggedMemories.length > 0 
      ? ` I'd especially love for you to contribute towards ${taggedMemories.length === 1 ? 'this memory' : 'these memories'}: ${taggedMemories.join(', ')}.`
      : ''
    
    if (method === 'email') {
      return {
        subject: `Join me on This Is Me - Memory Collaboration Invitation`,
        body: `Hi ${personName},

I hope this message finds you well! I've been using This Is Me to capture and organize my life memories, and I'd love to have you be part of this journey.

As my ${relationship.toLowerCase()}, you've been such an important part of so many special moments in my life. I'm inviting you to join my memory network where you can:

• View and contribute to shared memories
• Add your own photos and stories to our shared experiences  
• Help me remember details I might have forgotten
• Be part of preserving our shared history${memoryText}

Your perspective and memories would mean so much to me. Would you like to join?

Best regards,
[Your Name]

P.S. This Is Me keeps all our memories private and secure - only people we invite can see our shared content.`
      }
    } else {
      return {
        message: `Hi ${personName}! I'm using This Is Me to organize my memories and I'd love to have you contribute to our shared experiences as my ${relationship.toLowerCase()}. ${memoryText} Would you like to join my memory network? It's private and secure. Let me know! 😊`
      }
    }
  }

  const getPermissionDescription = (permission: string) => {
    switch (permission) {
      case 'can_view_memories': return 'Can see memories in shared chapters'
      case 'can_add_text': return 'Can add descriptions and text content'
      case 'can_add_images': return 'Can upload and add photos'
      case 'can_comment': return 'Can add comments and corrections'
      default: return ''
    }
  }

  if (!user) return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My People</h1>
              <p className="text-gray-600">Manage your collaborative memory network</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Permissions</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Person</span>
            </button>
          </div>
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
                <span>My People ({people.length})</span>
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
          {/* Enhanced Add Person Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Add New Person to Your Network</span>
              </h2>
              
              {/* Basic Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Basic Information</h3>
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
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={newPerson.relationship}
                        onChange={(e) => setNewPerson(prev => ({ ...prev, relationship: e.target.value }))}
                        placeholder="e.g., Mother, Sister, Best Friend"
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
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Permissions</span>
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(newPerson.permissions).map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setNewPerson(prev => ({
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                [key]: e.target.checked
                              }
                            }))}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {key.replace('can_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <p className="text-xs text-gray-500">{getPermissionDescription(key)}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Invitation Method */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <span>Invitation Method</span>
                  </h3>
                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="inviteMethod"
                        value="email"
                        checked={newPerson.inviteMethod === 'email'}
                        onChange={(e) => setNewPerson(prev => ({ ...prev, inviteMethod: e.target.value as 'email' | 'sms' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Email</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="inviteMethod"
                        value="sms"
                        checked={newPerson.inviteMethod === 'sms'}
                        onChange={(e) => setNewPerson(prev => ({ ...prev, inviteMethod: e.target.value as 'email' | 'sms' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">SMS</span>
                    </label>
                  </div>

                  {/* Template Preview */}
                  {newPerson.name && newPerson.relationship && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        {newPerson.inviteMethod === 'email' ? 'Email Template Preview' : 'SMS Template Preview'}
                      </h4>
                      {(() => {
                        const template = generateInviteTemplate(
                          newPerson.inviteMethod, 
                          newPerson.name, 
                          newPerson.relationship, 
                          newPerson.taggedMemories
                        )
                        
                        if (newPerson.inviteMethod === 'email') {
                          return (
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-blue-800">Subject:</span>
                                <p className="text-sm text-blue-700">{template.subject}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-blue-800">Message:</span>
                                <p className="text-sm text-blue-700 whitespace-pre-line">{template.body}</p>
                              </div>
                            </div>
                          )
                        } else {
                          return (
                            <p className="text-sm text-blue-700">{template.message}</p>
                          )
                        }
                      })()}
                    </div>
                  )}
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Message (optional)
                  </label>
                  <textarea
                    value={newPerson.customMessage}
                    onChange={(e) => setNewPerson(prev => ({ ...prev, customMessage: e.target.value }))}
                    placeholder="Add a personal note to the invitation..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addPerson}
                  disabled={isAdding || !newPerson.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding & Sending Invite...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Person & Send Invite</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* People Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
                  <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-4"></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-16 bg-gray-300 rounded"></div>
                    <div className="h-16 bg-gray-300 rounded"></div>
                    <div className="h-16 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No people in your network yet</h3>
              <p className="text-gray-500 mb-4">Start building your collaborative memory network</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Person
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {people.map((person) => {
                const badge = getCollaborationBadge(person.collaboration_stats || { contributions_made: 0, memories_shared: 0 })
                
                return (
                  <div key={person.id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    {/* Header with Photo and Basic Info */}
                    <div className="p-6 pb-4">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                          <img
                            src={person.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'}
                            alt={person.person_name}
                            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                          {person.person_user_id && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{person.person_name}</h3>
                          <p className="text-sm text-gray-500">{person.relationship}</p>
                          {person.person_email && (
                            <p className="text-xs text-gray-400 truncate">{person.person_email}</p>
                          )}
                        </div>
                      </div>

                      {/* Collaboration Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          <span className="mr-1">{badge.icon}</span>
                          {badge.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {person.tagged_memories_count} memories
                        </span>
                      </div>

                      {/* Recent Memories Preview */}
                      {person.recent_memories && person.recent_memories.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recent Memories</p>
                          <div className="grid grid-cols-3 gap-2">
                            {person.recent_memories.slice(0, 3).map((memory) => (
                              <div 
                                key={memory.id} 
                                className="relative group/memory cursor-pointer"
                                onClick={() => viewMemory(memory, person)}
                              >
                                <img
                                  src={memory.image_url}
                                  alt={memory.title}
                                  className="w-full h-16 object-cover rounded-lg transition-transform group-hover/memory:scale-105"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/memory:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white opacity-0 group-hover/memory:opacity-100 transition-opacity" />
                                </div>
                                <div className="absolute bottom-1 left-1 right-1">
                                  <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/memory:opacity-100 transition-opacity truncate">
                                    {memory.title}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Collaboration Stats */}
                      {person.collaboration_stats && (
                        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900">{person.collaboration_stats.contributions_made}</p>
                            <p className="text-xs text-gray-500">Contributions</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900">{person.collaboration_stats.memories_shared}</p>
                            <p className="text-xs text-gray-500">Shared</p>
                          </div>
                        </div>
                      )}

                      {/* Visual Permissions Overview */}
                      {person.permissions && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Access Level</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {person.permissions.can_view_memories && person.permissions.can_add_text && person.permissions.can_add_images && person.permissions.can_comment ? (
                                <div className="flex items-center space-x-1">
                                  <Crown className="w-4 h-4 text-yellow-500" />
                                  <span className="text-xs font-medium text-yellow-700">Full Access</span>
                                </div>
                              ) : person.permissions.can_view_memories && (person.permissions.can_add_text || person.permissions.can_comment) ? (
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 text-blue-500" />
                                  <span className="text-xs font-medium text-blue-700">Contributor</span>
                                </div>
                              ) : person.permissions.can_view_memories ? (
                                <div className="flex items-center space-x-1">
                                  <Eye className="w-4 h-4 text-green-500" />
                                  <span className="text-xs font-medium text-green-700">Viewer</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <Lock className="w-4 h-4 text-gray-400" />
                                  <span className="text-xs font-medium text-gray-500">No Access</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              {person.permissions.can_add_text && <FileText className="w-3 h-3 text-green-500" />}
                              {person.permissions.can_add_images && <Image className="w-3 h-3 text-blue-500" />}
                              {person.permissions.can_comment && <MessageCircle className="w-3 h-3 text-purple-500" />}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewPersonDetails(person)}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingPermissions(person)
                            setShowPermissionsModal(true)
                          }}
                          className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Person Details Modal */}
          {selectedPerson && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={selectedPerson.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'}
                        alt={selectedPerson.person_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedPerson.person_name}</h2>
                        <p className="text-gray-600">{selectedPerson.relationship}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPerson(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Shared Memories ({personMemories.length})</h3>
                  {personMemories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {personMemories.map((memory) => (
                        <div 
                          key={memory.id} 
                          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                          onClick={() => viewMemory(memory, selectedPerson!)}
                        >
                          {memory.image_url && (
                            <div className="relative overflow-hidden rounded-lg mb-3">
                              <img
                                src={memory.image_url}
                                alt={memory.title}
                                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          )}
                          <h4 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{memory.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{memory.chapter}</p>
                          <p className="text-xs text-gray-500">{new Date(memory.memory_date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No shared memories yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Permissions Management Modal */}
          {showPermissionsModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingPermissions ? `Manage Permissions: ${editingPermissions.person_name}` : 'Bulk Permission Management'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowPermissionsModal(false)
                      setEditingPermissions(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Permission Types</h3>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span><strong>Add Text:</strong> Can add text content and descriptions to memories</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Image className="w-4 h-4" />
                        <span><strong>Add Images:</strong> Can upload and add photos to memories</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" />
                        <span><strong>Comment:</strong> Can add comments, additions, and corrections</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span><strong>View:</strong> Can see memories in shared chapters</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      Full permission management system coming soon! This will allow you to:
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1">
                      <li>• Set granular permissions per person</li>
                      <li>• Control access to specific chapters</li>
                      <li>• Invite people directly from memories</li>
                      <li>• Send contextual collaboration requests</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowPermissionsModal(false)
                        setEditingPermissions(null)
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Memory Viewing Modal */}
          {showMemoryModal && selectedMemory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-6 h-6 text-blue-600" />
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{selectedMemory.title}</h2>
                          <p className="text-gray-600">{selectedMemory.chapter} • {new Date(selectedMemory.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowMemoryModal(false)
                        setSelectedMemory(null)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Featured Person */}
                  {selectedMemory.person_context && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center space-x-3">
                        <img
                          src={selectedMemory.person_context.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'}
                          alt={selectedMemory.person_context.person_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-blue-900">Featured Person</p>
                          <p className="text-blue-700">{selectedMemory.person_context.person_name} ({selectedMemory.person_context.relationship})</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Image */}
                  {selectedMemory.image_url && (
                    <div className="mb-6">
                      <img
                        src={selectedMemory.image_url}
                        alt={selectedMemory.title}
                        className="w-full max-h-96 object-cover rounded-xl shadow-lg"
                      />
                    </div>
                  )}

                  {/* Memory Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedMemory.description}</p>
                    </div>

                    {selectedMemory.content && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Memory Details</h3>
                        <p className="text-gray-700 leading-relaxed">{selectedMemory.content}</p>
                      </div>
                    )}

                    {/* Tags */}
                    {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedMemory.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Memory Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <Calendar className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-900">Date</p>
                        <p className="text-xs text-gray-500">{new Date(selectedMemory.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-center">
                        <BookOpen className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-900">Chapter</p>
                        <p className="text-xs text-gray-500">{selectedMemory.chapter}</p>
                      </div>
                      <div className="text-center">
                        <User className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-900">Featured</p>
                        <p className="text-xs text-gray-500">{selectedMemory.person_context?.person_name || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Memory ID: {selectedMemory.id}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        View Full Memory
                      </button>
                      <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                        Edit Memory
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
