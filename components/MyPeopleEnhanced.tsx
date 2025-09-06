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
    chapters_access: Array<{
      chapter_name: string
      permissions: string[]
    }>
    memory_access?: Array<{
      memory_title: string
      count?: number
      permissions: string[]
    }>
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
    personType: 'living', // 'living' or 'legacy'
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
      
      // Check if we're in impersonation mode
      const impersonationResponse = await fetch('/api/admin/impersonate')
      const impersonationData = await impersonationResponse.json()
      
      console.log('🎭 IMPERSONATION CHECK:', impersonationData)
      
      // Get JWT token for API call
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          email: user.email 
        })
      })
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        console.error('❌ TOKEN ERROR:', errorData)
        throw new Error(`Failed to get auth token: ${errorData.error || 'Unknown error'}`)
      }
      
      const { token } = await tokenResponse.json()
      console.log('✅ TOKEN SUCCESS: Got JWT token for network API')
      
      // Fetch real network people
      console.log('🔍 FRONTEND: About to call /api/network with token:', token.substring(0, 20) + '...')
      
      const response = await fetch('/api/network', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('🔍 FRONTEND: Network API response status:', response.status)
      console.log('🔍 FRONTEND: Network API response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ NETWORK API ERROR (raw):', errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        
        console.error('❌ NETWORK API ERROR (parsed):', errorData)
        throw new Error(`Failed to fetch network people: ${errorData.error || 'Unknown error'}`)
      }
      
      const responseText = await response.text()
      console.log('🔍 FRONTEND: Network API raw response:', responseText)
      
      const { people: networkPeople } = JSON.parse(responseText)
      console.log('✅ NETWORK API SUCCESS:', networkPeople)
      
      // Transform real data and fetch tagged memories for each person
      const transformedRealPeople = await Promise.all(
        (networkPeople || []).map(async (person: any) => {
          // Fetch tagged memories for this person
          let taggedMemoriesCount = 0
          let recentMemories: any[] = []
          
          try {
            const memoriesResponse = await fetch(`/api/network/${person.id}/memories`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (memoriesResponse.ok) {
              const memoriesData = await memoriesResponse.json()
              taggedMemoriesCount = memoriesData.total_memories || 0
              recentMemories = (memoriesData.memories || []).slice(0, 3).map((mem: any) => ({
                id: mem.id,
                title: mem.title,
                image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop', // Placeholder
                date: mem.memory_date,
                chapter: mem.chapter || 'Personal'
              }))
            }
          } catch (error) {
            console.log('Could not fetch memories for', person.person_name, error)
          }

          return {
            ...person,
            tagged_memories_count: taggedMemoriesCount,
            recent_memories: recentMemories,
        permissions: {
          can_view_memories: true,
          can_add_text: false,
          can_add_images: false,
          can_comment: true,
          chapters_access: [
            { chapter_name: 'Childhood', permissions: ['view', 'comment'] },
            { chapter_name: 'University', permissions: ['view', 'add_text', 'comment'] }
          ],
          memory_access: taggedMemoriesCount > 0 ? [
            { memory_title: 'Tagged memories', count: taggedMemoriesCount, permissions: ['view', 'comment'] }
          ] : []
        },
            collaboration_stats: {
              contributions_made: 0,
              memories_shared: taggedMemoriesCount,
              last_active: taggedMemoriesCount > 0 ? 'Recently' : 'Never'
            }
          }
        })
      )

      // Only show demo data for the developer account (dgalvin@yourcaio.co.uk) when NOT impersonating
      // Demo data should never show when impersonating (even if admin is the developer)
      const isImpersonating = impersonationData.isImpersonating
      const isDeveloper = user?.email === 'dgalvin@yourcaio.co.uk'
      
      const shouldShowDemoData = isDeveloper && !isImpersonating
      
      console.log('🎭 DEMO DATA CHECK:', { 
        userEmail: user?.email,
        isImpersonating,
        isDeveloper,
        shouldShowDemoData,
        adminUserEmail: impersonationData.adminUser?.email,
        targetUserEmail: impersonationData.targetUser?.email
      })
      
      const demoData = shouldShowDemoData ? [
          {
            id: '1',
            person_name: 'Sarah Johnson',
            person_email: 'sarah@example.com',
            relationship: 'Sister',
            photo_url: null, // Use default icon instead of fake photo
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
              chapters_access: [
                { chapter_name: 'Family Holidays', permissions: ['view', 'add_text', 'add_images', 'comment'] },
                { chapter_name: 'Celebrations', permissions: ['view', 'add_text', 'comment'] }
              ],
              memory_access: [
                { memory_title: 'Beach Vacation 2024', permissions: ['view', 'add_images', 'comment'] },
                { memory_title: 'Mom\'s Birthday Party', permissions: ['view', 'add_text', 'comment'] }
              ]
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
            photo_url: null, // Use default icon instead of fake photo
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
              chapters_access: [
                { chapter_name: 'College Days', permissions: ['view', 'add_text', 'comment'] },
                { chapter_name: 'Adventures', permissions: ['view', 'comment'] }
              ],
              memory_access: [
                { memory_title: 'College Reunion', permissions: ['view', 'add_text', 'comment'] },
                { memory_title: 'Road Trip to Coast', permissions: ['view', 'comment'] }
              ]
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
              chapters_access: [
                { chapter_name: 'Cultural Events', permissions: ['view', 'comment'] }
              ],
              memory_access: [
                { memory_title: 'Art Gallery Opening', permissions: ['view', 'comment'] }
              ]
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
              chapters_access: [
                { chapter_name: 'Family Gatherings', permissions: ['view', 'add_text', 'add_images', 'comment'] },
                { chapter_name: 'Father-Son Time', permissions: ['view', 'add_text', 'add_images', 'comment'] },
                { chapter_name: 'Family Legacy', permissions: ['view', 'add_text', 'comment'] }
              ],
              memory_access: [
                { memory_title: 'Father\'s Day BBQ', permissions: ['view', 'add_text', 'add_images', 'comment'] },
                { memory_title: 'Fishing Trip', permissions: ['view', 'add_images', 'comment'] },
                { memory_title: 'Grandpa\'s Workshop', permissions: ['view', 'add_text', 'comment'] }
              ]
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
              chapters_access: [
                { chapter_name: 'Development', permissions: ['view', 'add_text', 'comment'] }
              ],
              memory_access: [
                { memory_title: 'API Testing Session', permissions: ['view', 'add_text', 'comment'] }
              ]
            },
            collaboration_stats: {
              contributions_made: 2,
              memories_shared: 1,
              last_active: '2025-09-06'
            }
          }
        ] : []
      
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
    if (!newPerson.name.trim() || !user) return

    setIsAdding(true)
    try {
      console.log('🔄 ADDING PERSON: Starting add person process for:', newPerson.name)
      
      // Get JWT token for API call (this handles impersonation correctly)
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          email: user.email 
        })
      })
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        console.error('❌ TOKEN ERROR:', errorData)
        throw new Error(`Failed to get auth token: ${errorData.error || 'Unknown error'}`)
      }
      
      const { token } = await tokenResponse.json()
      console.log('✅ TOKEN SUCCESS: Got JWT token for add person API')
      
      // Add person via API
      const addResponse = await fetch('/api/network', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          person_name: newPerson.name.trim(),
          person_email: newPerson.email?.trim() || null,
          relationship: newPerson.relationship?.trim() || null,
          photo_url: newPerson.photo_url?.trim() || null
        })
      })
      
      if (!addResponse.ok) {
        const errorData = await addResponse.json()
        console.error('❌ ADD PERSON ERROR:', errorData)
        throw new Error(`Failed to add person: ${errorData.error || 'Unknown error'}`)
      }
      
      const result = await addResponse.json()
      console.log('✅ ADD PERSON SUCCESS:', result)
      
      // Refresh the people list to show the new person
      await fetchPeople()
      
      // Reset form
      setNewPerson({ 
        name: '', 
        email: '', 
        relationship: '', 
        photo_url: '',
        personType: 'living',
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
      
    } catch (error) {
      console.error('❌ Error adding person:', error)
      setIsAdding(false)
      // You might want to show a toast notification here
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
              
              {/* Person Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What type of person are you adding?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPerson(prev => ({ ...prev, personType: 'living' }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      newPerson.personType === 'living' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">👥</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Living Person</h4>
                        <p className="text-sm text-gray-500">Someone who can receive invitations and contribute</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNewPerson(prev => ({ ...prev, personType: 'legacy' }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      newPerson.personType === 'legacy' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🕊️</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Legacy Person</h4>
                        <p className="text-sm text-gray-500">Someone who has passed away (for tagging in memories)</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              
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
                      <select
                        value={newPerson.relationship}
                        onChange={(e) => setNewPerson(prev => ({ ...prev, relationship: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select relationship...</option>
                        <optgroup label="👨‍👩‍👧‍👦 Family">
                          <option value="Mother">Mother</option>
                          <option value="Father">Father</option>
                          <option value="Sister">Sister</option>
                          <option value="Brother">Brother</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Son">Son</option>
                          <option value="Grandmother">Grandmother</option>
                          <option value="Grandfather">Grandfather</option>
                          <option value="Aunt">Aunt</option>
                          <option value="Uncle">Uncle</option>
                          <option value="Cousin">Cousin</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Partner">Partner</option>
                        </optgroup>
                        <optgroup label="👥 Friends">
                          <option value="Best Friend">Best Friend</option>
                          <option value="Close Friend">Close Friend</option>
                          <option value="Friend">Friend</option>
                          <option value="Childhood Friend">Childhood Friend</option>
                          <option value="College Friend">College Friend</option>
                        </optgroup>
                        <optgroup label="💼 Professional">
                          <option value="Colleague">Colleague</option>
                          <option value="Boss">Boss</option>
                          <option value="Mentor">Mentor</option>
                          <option value="Business Partner">Business Partner</option>
                          <option value="Client">Client</option>
                        </optgroup>
                        {newPerson.personType === 'living' && (
                          <optgroup label="🕊️ In Memory (for memorial helpers)">
                            <option value="Mother (In Memory)">Mother (In Memory)</option>
                            <option value="Father (In Memory)">Father (In Memory)</option>
                            <option value="Grandmother (In Memory)">Grandmother (In Memory)</option>
                            <option value="Grandfather (In Memory)">Grandfather (In Memory)</option>
                            <option value="Sister (In Memory)">Sister (In Memory)</option>
                            <option value="Brother (In Memory)">Brother (In Memory)</option>
                            <option value="Friend (In Memory)">Friend (In Memory)</option>
                            <option value="Spouse (In Memory)">Spouse (In Memory)</option>
                            <option value="Beloved Pet (In Memory)">Beloved Pet (In Memory)</option>
                          </optgroup>
                        )}
                        {newPerson.personType === 'legacy' && (
                          <optgroup label="🕊️ Legacy Person">
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Grandmother">Grandmother</option>
                            <option value="Grandfather">Grandfather</option>
                            <option value="Sister">Sister</option>
                            <option value="Brother">Brother</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Son">Son</option>
                            <option value="Aunt">Aunt</option>
                            <option value="Uncle">Uncle</option>
                            <option value="Cousin">Cousin</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Partner">Partner</option>
                            <option value="Best Friend">Best Friend</option>
                            <option value="Close Friend">Close Friend</option>
                            <option value="Friend">Friend</option>
                            <option value="Mentor">Mentor</option>
                            <option value="Beloved Pet">Beloved Pet</option>
                          </optgroup>
                        )}
                        <optgroup label="✏️ Custom">
                          <option value="custom">Other (specify below)</option>
                        </optgroup>
                      </select>
                      {newPerson.relationship === 'custom' && (
                        <input
                          type="text"
                          placeholder="Enter custom relationship..."
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                          onChange={(e) => setNewPerson(prev => ({ ...prev, relationship: e.target.value }))}
                        />
                      )}
                    </div>
                    {newPerson.personType === 'living' && (
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
                    )}
                    
                    {newPerson.personType === 'legacy' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Birth Year (optional)
                        </label>
                        <input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          placeholder="e.g., 1945"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Helps organize memories chronologically
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Photo (optional)
                      </label>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {newPerson.photo_url ? (
                            <img
                              src={newPerson.photo_url}
                              alt="Preview"
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                              {newPerson.personType === 'legacy' ? (
                                <span className="text-2xl">🕊️</span>
                              ) : (
                                <User className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                // Create a preview URL
                                const reader = new FileReader()
                                reader.onload = (e) => {
                                  setNewPerson(prev => ({ ...prev, photo_url: e.target?.result as string }))
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Upload a photo or leave empty to use default icon
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions - Only for living people */}
                {newPerson.personType === 'living' && (
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
                )}

                {/* Invitation Method - Only for living people */}
                {newPerson.personType === 'living' && (
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
                )}

                {/* Email Templates - Only for living people */}
                {newPerson.personType === 'living' && (
                  <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📧 Email Templates
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewPerson(prev => ({ ...prev, customMessage: e.target.value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                  >
                    <option value="">Choose a template...</option>
                    <option value={`Hi ${newPerson.person_name || '[Name]'},

I'm using This Is Me to organize and share my life memories, and I'd love for you to be part of it! 

I've created a personal network where I can tag people in my memories and share special moments. You'll be able to see memories you're tagged in and even add your own photos or stories to help make them more complete.

Would you like to join me in preserving these precious memories together?

Best regards,
[Your name]`}>🤝 General Invitation</option>
                    <option value={`Dear ${newPerson.person_name || '[Name]'},

I've been working on documenting our family history and memories using This Is Me, and your perspective would be invaluable!

I'd love to invite you to contribute to our shared family stories. You can add photos, share your memories of events, and help me fill in details I might have missed.

Your memories and photos would mean so much to our family's digital legacy.

With love,
[Your name]`}>👨‍👩‍👧‍👦 Family Member</option>
                    <option value={`Hey ${newPerson.person_name || '[Name]'},

Remember all those amazing times we've shared? I'm putting together a digital collection of our memories on This Is Me!

I'd love for you to join me so you can see all the photos and stories from our adventures together. Plus, you can add your own photos and memories that I might not have.

It'll be like our own private social network of memories!

Talk soon,
[Your name]`}>🎉 Close Friend</option>
                    <option value={`Hi ${newPerson.person_name || '[Name]'},

I'm documenting my professional journey and career milestones using This Is Me, and I'd value having you as part of this network.

You've been an important part of my professional story, and I'd love to include memories from our time working together. You're welcome to add your own perspectives and photos from our shared projects.

Looking forward to preserving these professional memories together.

Best regards,
[Your name]`}>💼 Professional Contact</option>
                    <option value={`Hi ${newPerson.person_name || '[Name]'},

I'm creating a memory collection on This Is Me and would love to include you! I've already tagged you in some special memories we've shared.

You'll be able to see these memories and add your own photos or stories to make them even more meaningful. It's a beautiful way to preserve our shared experiences.

Hope you'll join me in this journey of memory keeping!

Warm regards,
[Your name]`}>📸 Already Tagged</option>
                    <option value={`Dear ${newPerson.person_name || '[Name]'},

I hope this message finds you well. I'm using This Is Me to create a digital archive of important life moments and memories.

I'd be honored if you'd join my memory network. You can contribute photos, stories, and your unique perspective on the experiences we've shared over the years.

Your participation would help create a richer, more complete picture of these precious memories.

Sincerely,
[Your name]`}>✨ Formal Invitation</option>
                    <option value={`Dear Family and Friends,

I'm creating a digital memorial and memory collection for ${newPerson.person_name || '[Name]'} on This Is Me, and I would love your help in preserving their legacy.

I'm gathering photos, stories, and memories that celebrate their life and the impact they had on all of us. If you have any photos, stories, or special memories of ${newPerson.person_name || '[Name]'}, I would be deeply grateful if you could contribute them to this collection.

This memorial will serve as a beautiful tribute that we can all visit to remember and honor them. Your memories and photos would mean so much in creating a complete picture of their wonderful life.

Thank you for helping me preserve these precious memories.

With love and remembrance,
[Your name]`}>🕊️ Memorial/Legacy</option>
                  </select>
                  </div>
                )}

                {/* Custom Message - Only for living people */}
                {newPerson.personType === 'living' && (
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Message
                  </label>
                  <textarea
                    value={newPerson.customMessage}
                    onChange={(e) => setNewPerson(prev => ({ ...prev, customMessage: e.target.value }))}
                    placeholder="Choose a template above or write your own personal message..."
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Templates will auto-fill the person's name. You can customize the message after selecting.
                  </p>
                  </div>
                )}
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
                      <span>
                        {newPerson.personType === 'legacy' ? 'Add Legacy Person' : 'Add Person & Send Invite'}
                      </span>
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
                          {person.photo_url && !person.photo_url.includes('unsplash') ? (
                            <img
                              src={person.photo_url}
                              alt={person.person_name}
                              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
                              {person.relationship?.includes('In Memory') || person.personType === 'legacy' ? (
                                <span className="text-2xl">🕊️</span>
                              ) : (
                                <User className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                          )}
                          {person.person_user_id && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{person.person_name}</h3>
                            {person.relationship?.includes('In Memory') && (
                              <span className="text-gray-400">🕊️</span>
                            )}
                          </div>
                          <p className={`text-sm ${person.relationship?.includes('In Memory') ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                            {person.relationship}
                          </p>
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

                      {/* Specific Chapter & Memory Permissions */}
                      {person.permissions && (person.permissions.chapters_access?.length > 0 || person.permissions.memory_access?.length > 0) && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-3">Specific Access</p>
                          
                          {/* Chapter Permissions */}
                          {person.permissions.chapters_access?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-600 mb-2">📚 Chapters</p>
                              <div className="space-y-2">
                                {person.permissions.chapters_access.map((chapter: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                                    <span className="text-xs font-medium text-blue-800">{chapter.chapter_name}</span>
                                    <div className="flex items-center space-x-1">
                                      {chapter.permissions.includes('view') && <Eye className="w-3 h-3 text-green-500" title="Can view" />}
                                      {chapter.permissions.includes('add_text') && <FileText className="w-3 h-3 text-blue-500" title="Can add text" />}
                                      {chapter.permissions.includes('add_images') && <Image className="w-3 h-3 text-purple-500" title="Can add images" />}
                                      {chapter.permissions.includes('comment') && <MessageCircle className="w-3 h-3 text-orange-500" title="Can comment" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Memory Permissions */}
                          {person.permissions.memory_access?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-2">💭 Memories</p>
                              <div className="space-y-2">
                                {person.permissions.memory_access.map((memory: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                                    <div className="flex-1">
                                      <span className="text-xs font-medium text-purple-800">{memory.memory_title}</span>
                                      {memory.count && <span className="text-xs text-purple-600 ml-1">({memory.count})</span>}
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {memory.permissions.includes('view') && <Eye className="w-3 h-3 text-green-500" title="Can view" />}
                                      {memory.permissions.includes('add_text') && <FileText className="w-3 h-3 text-blue-500" title="Can add text" />}
                                      {memory.permissions.includes('add_images') && <Image className="w-3 h-3 text-purple-500" title="Can add images" />}
                                      {memory.permissions.includes('comment') && <MessageCircle className="w-3 h-3 text-orange-500" title="Can comment" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
