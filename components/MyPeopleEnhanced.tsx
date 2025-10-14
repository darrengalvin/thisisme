'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Users, Plus, Mail, User, X, Calendar, BookOpen, ArrowLeft, UserPlus, Settings, Eye, MessageCircle, Image, FileText, Lock, Unlock, Crown, Star } from 'lucide-react'
import toast from 'react-hot-toast'

// ✨ Improved TypeScript interfaces for better type safety
interface NetworkPerson {
  id: string;
  person_name: string;
  person_email?: string | null;
  person_phone?: string | null;
  relationship?: string | null;
  person_user_id?: string | null;
  photo_url?: string | null;
  created_at: string;
  personType?: 'living' | 'legacy';
  tagged_memories_count?: number;
  chapter_access?: string[]; // ⚡ NEW: Chapter IDs from single query
  pending_chapter_invitations?: string[]; // Array of chapter UUIDs
  recent_memories?: RecentMemory[];
  permissions?: PersonPermissions;
  collaboration_stats?: CollaborationStats;
}

interface RecentMemory {
  id: string;
  title: string;
  image_url: string;
  date: string;
  chapter: string;
}

interface PersonPermissions {
  can_view_memories: boolean;
  can_add_text: boolean;
  can_add_images: boolean;
  can_comment: boolean;
  chapters_access: ChapterAccess[];
  memory_access?: MemoryAccess[];
}

interface ChapterAccess {
  chapter_name: string;
  permissions: string[];
}

interface MemoryAccess {
  memory_title: string;
  count?: number;
  permissions: string[];
}

interface CollaborationStats {
  contributions_made: number;
  memories_shared: number;
  last_active: string;
}

interface TaggedMemory {
  id: string;
  title: string;
  description: string;
  memory_date: string;
  tagged_at: string;
  chapter: string;
  image_url?: string;
}

export default function MyPeopleEnhanced() {
  const { user } = useAuth()
  const [people, setPeople] = useState<NetworkPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPerson, setNewPerson] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    photo_url: '',
    personType: 'living' as 'living' | 'legacy',
    inviteMethod: 'email' as 'email' | 'sms' | 'both',
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
  const [editingPerson, setEditingPerson] = useState<NetworkPerson | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<NetworkPerson | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [invitingPerson, setInvitingPerson] = useState<NetworkPerson | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'both'>('email')
  const [addPersonError, setAddPersonError] = useState<string | null>(null)
  const [addPersonFieldErrors, setAddPersonFieldErrors] = useState<string[]>([])
  const [inviteMessage, setInviteMessage] = useState('')
  const [availableChapters, setAvailableChapters] = useState<any[]>([])
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [newPersonSelectedChapters, setNewPersonSelectedChapters] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      fetchPeople()
    }
  }, [user])

  // Fetch available chapters for invitation
  const fetchChapters = async () => {
    if (!user) return

    setLoadingChapters(true)
    try {
      console.log('📚 FETCH CHAPTERS: Starting...', { userId: user.id })

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
        console.error('❌ FETCH CHAPTERS: Failed to get auth token')
        return
      }
      
      const { token } = await tokenResponse.json()
      console.log('✅ FETCH CHAPTERS: Got auth token')

      // Fetch chapters
      const response = await fetch('/api/timezones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ FETCH CHAPTERS: Loaded chapters:', data.timeZones?.length || 0)
        setAvailableChapters(data.timeZones || [])
      } else {
        console.error('❌ FETCH CHAPTERS: Failed to fetch chapters:', response.status)
      }
    } catch (error) {
      console.error('❌ FETCH CHAPTERS: Error:', error)
    } finally {
      setLoadingChapters(false)
    }
  }

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
      console.log('✅ NETWORK API SUCCESS:', {
        count: networkPeople?.length || 0,
        people: networkPeople
      })
      
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
          chapters_access: [], // Real chapter access would come from database
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
              chapters_access: [],
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
              chapters_access: [],
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
              chapters_access: [],
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
              chapters_access: [],
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
              chapters_access: [],
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

    // Clear previous errors
    setAddPersonError(null)
    setAddPersonFieldErrors([])

    // Client-side validation based on invite method
    const errors: string[] = []
    if (newPerson.inviteMethod === 'email' && !newPerson.email.trim()) {
      errors.push('Email is required when using email invitation')
    }
    if (newPerson.inviteMethod === 'sms' && !newPerson.phone.trim()) {
      errors.push('Phone number is required when using SMS invitation')
    }
    if (newPerson.inviteMethod === 'both') {
      if (!newPerson.email.trim()) errors.push('Email is required for combined invitation')
      if (!newPerson.phone.trim()) errors.push('Phone is required for combined invitation')
    }

    if (errors.length > 0) {
      setAddPersonFieldErrors(errors)
      toast.error('Please fill in all required fields')
      return
    }

    setIsAdding(true)
    try {
      console.log('🔄 ADDING PERSON: Starting add person process for:', newPerson.name)
      console.log('📧 EMAIL FIELD DEBUG:', { 
        email: newPerson.email, 
        emailTrimmed: newPerson.email?.trim(), 
        hasEmail: newPerson.email && newPerson.email.trim(),
        inviteMethod: newPerson.inviteMethod 
      })
      
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
          person_phone: newPerson.phone?.trim() || null,
          relationship: newPerson.relationship?.trim() || null,
          photo_url: newPerson.photo_url?.trim() || null,
          selectedChapters: newPersonSelectedChapters
        })
      })
      
      if (!addResponse.ok) {
        const errorData = await addResponse.json()
        console.error('❌ ADD PERSON ERROR:', errorData)
        
        // Extract detailed error messages
        if (errorData.details && Array.isArray(errorData.details)) {
          setAddPersonFieldErrors(errorData.details)
        }
        setAddPersonError(errorData.error || 'Failed to add person')
        
        throw new Error(`Failed to add person: ${errorData.error || 'Unknown error'}`)
      }
      
      const result = await addResponse.json()
      console.log('✅ ADD PERSON SUCCESS:', result)
      
      // IMPORTANT: Clear errors since add was successful
      setAddPersonError(null)
      setAddPersonFieldErrors([])
      
      // Send platform invitation if person has email or phone (based on selected method)
      const hasEmail = newPerson.email && newPerson.email.trim()
      const hasPhone = newPerson.phone && newPerson.phone.trim()
      const shouldSendInvite = (newPerson.inviteMethod === 'email' && hasEmail) || 
                              (newPerson.inviteMethod === 'sms' && hasPhone) || 
                              (newPerson.inviteMethod === 'both' && hasEmail && hasPhone)
      
      console.log('📧 INVITATION LOGIC DEBUG:', {
        hasEmail,
        hasPhone,
        inviteMethod: newPerson.inviteMethod,
        shouldSendInvite,
        emailValue: newPerson.email,
        phoneValue: newPerson.phone
      })
      
      if (shouldSendInvite) {
        try {
          console.log('🔄 SENDING PLATFORM INVITATION: Sending invitation to:', newPerson.name)
          
          const inviteResponse = await fetch('/api/network/invite', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              personId: result.person.id,
              personName: newPerson.name.trim(),
              personEmail: newPerson.email.trim(),
              personPhone: newPerson.phone.trim(),
              relationship: newPerson.relationship?.trim() || null,
              inviteMethod: newPerson.inviteMethod, // Use selected invitation method
              customMessage: `Hi ${newPerson.name}! I'd love you to be part of my memory network on ThisIsMe. It's a platform where we can share and collaborate on our memories together - from family stories to life milestones.`,
              selectedChapters: newPersonSelectedChapters
            })
          })
          
          if (inviteResponse.ok) {
            console.log('✅ PLATFORM INVITATION SENT: Successfully sent invitation')
            toast.success(`Person added and invitation sent to ${newPerson.name}!`)
          } else {
            let errorData
            try {
              errorData = await inviteResponse.json()
            } catch (parseError) {
              errorData = { error: 'Failed to parse error response', rawResponse: await inviteResponse.text() }
            }
            console.log('⚠️ PLATFORM INVITATION FAILED: Person added but invitation failed', {
              status: inviteResponse.status,
              statusText: inviteResponse.statusText,
              error: errorData,
              url: inviteResponse.url
            })
            toast.success(`Person added to your network! (Invitation failed - you can send it manually later)`)
          }
        } catch (inviteError) {
          console.error('❌ PLATFORM INVITATION ERROR:', inviteError)
          toast.success(`Person added to your network! (Invitation failed - you can send it manually later)`)
        }
      } else {
        console.log('ℹ️ NO INVITATION SENT: Person added but missing required contact info for selected method')
        const missingInfo = []
        if (newPerson.inviteMethod === 'email' && !hasEmail) missingInfo.push('email')
        if (newPerson.inviteMethod === 'sms' && !hasPhone) missingInfo.push('phone')
        if (newPerson.inviteMethod === 'both') {
          if (!hasEmail) missingInfo.push('email')
          if (!hasPhone) missingInfo.push('phone')
        }
        toast.success(`Person added to your network! (Add ${missingInfo.join(' and ')} to send invitations)`)
      }
      
      // Refresh the people list to show the new person
      console.log('🔄 REFRESHING PEOPLE LIST: About to fetch updated people...')
      await fetchPeople()
      console.log('✅ PEOPLE LIST REFRESHED: Should now show the new person')
      
      // Show success message
      toast.success(`${newPerson.name} added to your network!`)
      
      // Reset form
      setNewPerson({
        name: '', 
        email: '', 
        phone: '',
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
      setNewPersonSelectedChapters([])
      setShowAddForm(false)
      setIsAdding(false)
      
    } catch (error) {
      console.error('❌ Error adding person:', error)
      setIsAdding(false)
      
      // Show user-friendly error message
      if (addPersonError) {
        toast.error(addPersonError)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to add person to your network')
      }
    }
  }

  const editPerson = (person: NetworkPerson) => {
    setEditingPerson(person)
    setShowEditModal(true)
  }

  const updatePerson = async () => {
    if (!editingPerson || !user) return

    setIsUpdating(true)
    try {
      console.log('🔄 UPDATING PERSON: Starting update process for:', editingPerson.person_name)
      
      // Check if this is mock/demo data (numeric ID instead of UUID)
      const isMockData = /^\d+$/.test(editingPerson.id)
      if (isMockData) {
        console.log('⚠️ UPDATING PERSON: This is demo data, updating locally only')
        // Update local state only
        setPeople(prevPeople => 
          prevPeople.map(p => p.id === editingPerson.id ? editingPerson : p)
        )
        setShowEditModal(false)
        setEditingPerson(null)
        setIsUpdating(false)
        toast.success(`Demo person "${editingPerson.person_name}" updated locally`)
        return
      }
      
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
      console.log('✅ TOKEN SUCCESS: Got JWT token for update person API')
      
      // Update person via API
      const updateResponse = await fetch(`/api/network/${editingPerson.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          person_name: editingPerson.person_name.trim(),
          person_email: editingPerson.person_email?.trim() || null,
          person_phone: editingPerson.person_phone?.trim() || null,
          relationship: editingPerson.relationship?.trim() || null,
          photo_url: editingPerson.photo_url?.trim() || null
        })
      })
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        console.error('❌ UPDATE PERSON ERROR:', errorData)
        throw new Error(`Failed to update person: ${errorData.error || 'Unknown error'}`)
      }
      
      const result = await updateResponse.json()
      console.log('✅ UPDATE PERSON SUCCESS:', result)
      
      // Refresh the people list to show the updated person
      await fetchPeople()
      setShowEditModal(false)
      setEditingPerson(null)
      setIsUpdating(false)
      
    } catch (error) {
      console.error('❌ Error updating person:', error)
      setIsUpdating(false)
      // You might want to show a toast notification here
    }
  }

  const deletePerson = (person: NetworkPerson) => {
    setPersonToDelete(person)
    setShowDeleteModal(true)
  }

  const confirmDeletePerson = async () => {
    if (!personToDelete || !user) return

    setIsDeleting(true)
    try {
      console.log('🔄 DELETING PERSON: Starting delete process for:', personToDelete.person_name)
      console.log('🔍 DELETING PERSON: Person ID:', personToDelete.id)
      console.log('🔍 DELETING PERSON: Full person object:', JSON.stringify(personToDelete, null, 2))
      
      // Check if this is mock/demo data (numeric ID instead of UUID)
      const isMockData = /^\d+$/.test(personToDelete.id)
      if (isMockData) {
        console.log('⚠️ DELETING PERSON: This is demo data, removing locally only')
        // Remove from local state only (not from database since it doesn't exist there)
        setPeople(prevPeople => prevPeople.filter(p => p.id !== personToDelete.id))
        setShowDeleteModal(false)
        setPersonToDelete(null)
        setIsDeleting(false)
        toast.success(`Demo person "${personToDelete.person_name}" removed from view`)
        return
      }
      
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
      console.log('✅ TOKEN SUCCESS: Got JWT token for delete person API')
      
      // Delete person via API
      const deleteResponse = await fetch(`/api/network/${personToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json()
        console.error('❌ DELETE PERSON ERROR:', errorData)
        throw new Error(`Failed to delete person: ${errorData.error || 'Unknown error'}`)
      }
      
      const result = await deleteResponse.json()
      console.log('✅ DELETE PERSON SUCCESS:', result)
      
      // Refresh the people list to remove the deleted person
      await fetchPeople()
      setShowDeleteModal(false)
      setPersonToDelete(null)
      setIsDeleting(false)
      
    } catch (error) {
      console.error('❌ Error deleting person:', error)
      setIsDeleting(false)
      // You might want to show a toast notification here
    }
  }

  const invitePerson = (person: NetworkPerson) => {
    setInvitingPerson(person)
    setInviteMethod(person.person_email ? 'email' : 'sms')
    setInviteMessage('')
    setSelectedChapters([])
    setShowInviteModal(true)
    // Fetch chapters when opening invitation modal
    fetchChapters()
  }

  const openAddForm = () => {
    setShowAddForm(true)
    setNewPersonSelectedChapters([])
    // Fetch chapters when opening add form
    fetchChapters()
  }

  const sendInvitation = async () => {
    if (!invitingPerson || !user) return

    setIsInviting(true)
    try {
      console.log('🔄 SENDING INVITATION: Starting invitation process for:', invitingPerson.person_name)
      
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
      console.log('✅ TOKEN SUCCESS: Got JWT token for invitation API')
      
      // Send invitation via API
      const inviteResponse = await fetch('/api/network/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personId: invitingPerson.id,
          personName: invitingPerson.person_name,
          personEmail: invitingPerson.person_email,
          personPhone: invitingPerson.person_phone,
          relationship: invitingPerson.relationship,
          inviteMethod: inviteMethod, // Use selected invitation method
          customMessage: inviteMessage,
          selectedChapters: selectedChapters
        })
      })
      
      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json()
        console.error('❌ INVITATION ERROR:', errorData)
        throw new Error(`Failed to send invitation: ${errorData.error || 'Unknown error'}`)
      }
      
      const result = await inviteResponse.json()
      console.log('✅ INVITATION SUCCESS:', result)
      
      setShowInviteModal(false)
      setInvitingPerson(null)
      setInviteMessage('')
      setIsInviting(false)
      
      // You might want to show a success toast notification here
      
    } catch (error) {
      console.error('❌ Error sending invitation:', error)
      setIsInviting(false)
      // You might want to show an error toast notification here
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

  const generateInviteTemplate = (method: 'email' | 'sms' | 'both', personName: string, relationship: string, taggedMemories: string[], selectedChapters: string[] = []) => {
    const memoryText = taggedMemories.length > 0 
      ? ` I'd especially love for you to contribute towards ${taggedMemories.length === 1 ? 'this memory' : 'these memories'}: ${taggedMemories.join(', ')}.`
      : ''
    
    // Get chapter names from selected chapter IDs
    const selectedChapterNames = selectedChapters
      .map(chapterId => availableChapters.find(chapter => chapter.id === chapterId)?.title)
      .filter(Boolean)
    
    const chapterText = selectedChapterNames.length > 0 
      ? `\n\nI'd love to have you collaborate on these specific chapters of my life story:\n• ${selectedChapterNames.join('\n• ')}`
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
• Be part of preserving our shared history${memoryText}${chapterText}

Your perspective and memories would mean so much to me. Would you like to join?

Best regards,
[Your Name]

P.S. This Is Me keeps all our memories private and secure - only people we invite can see our shared content.`
      }
    } else if (method === 'sms') {
      return {
        message: `Hi ${personName}! I'm using This Is Me to organize my memories and I'd love to have you contribute to our shared experiences as my ${relationship.toLowerCase()}.${chapterText} ${memoryText} Would you like to join my memory network? It's private and secure. Let me know! 😊`
      }
    } else { // both
      return {
        subject: `Join me on This Is Me - Memory Collaboration Invitation`,
        body: `Hi ${personName},

I hope this message finds you well! I've been using This Is Me to capture and organize my life memories, and I'd love to have you be part of this journey.

As my ${relationship.toLowerCase()}, you've been such an important part of so many special moments in my life. I'm inviting you to join my memory network where you can:

• View and contribute to shared memories
• Add your own photos and stories to our shared experiences  
• Help me remember details I might have forgotten
• Be part of preserving our shared history${memoryText}${chapterText}

Your perspective and memories would mean so much to me. Would you like to join?

Best regards,
[Your Name]

P.S. This Is Me keeps all our memories private and secure - only people we invite can see our shared content.`,
        sms: `Hi ${personName}! I'm using This Is Me to organize my memories and I'd love to have you contribute to our shared experiences as my ${relationship.toLowerCase()}.${chapterText} ${memoryText} Would you like to join my memory network? It's private and secure. Let me know! 😊`
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <Users className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-3xl font-bold text-gray-900 truncate">My People</h1>
              <p className="text-xs sm:text-base text-gray-600 hidden sm:block">Manage your collaborative memory network</p>
            </div>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center space-x-1.5 sm:space-x-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-xs sm:text-sm flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Content - No more tabs needed */}
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

                    {/* Error Display */}
                    {(addPersonError || addPersonFieldErrors.length > 0) && (
                      <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800 mb-1">
                              {addPersonError || 'Please fix the following errors:'}
                            </h3>
                            {addPersonFieldErrors.length > 0 && (
                              <ul className="text-sm text-red-700 space-y-1">
                                {addPersonFieldErrors.map((error, index) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <span>•</span>
                                    <span>{error}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {newPerson.personType === 'living' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email {newPerson.inviteMethod === 'email' || newPerson.inviteMethod === 'both' ? <span className="text-red-600">*</span> : '(optional)'}
                          </label>
                          <input
                            type="email"
                            value={newPerson.email}
                            onChange={(e) => {
                              setNewPerson(prev => ({ ...prev, email: e.target.value }))
                              // Clear errors when user starts typing
                              if (addPersonFieldErrors.length > 0) {
                                setAddPersonFieldErrors([])
                                setAddPersonError(null)
                              }
                            }}
                            placeholder="Enter email address"
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              (addPersonFieldErrors.some(e => e.toLowerCase().includes('email')) || 
                               (newPerson.inviteMethod === 'email' || newPerson.inviteMethod === 'both') && !newPerson.email.trim())
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300'
                            }`}
                            required={newPerson.inviteMethod === 'email' || newPerson.inviteMethod === 'both'}
                          />
                          {(newPerson.inviteMethod === 'email' || newPerson.inviteMethod === 'both') && (
                            <p className="text-xs text-gray-500 mt-1">
                              Required for {newPerson.inviteMethod === 'both' ? 'email' : 'platform'} invitation
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number {newPerson.inviteMethod === 'sms' || newPerson.inviteMethod === 'both' ? <span className="text-red-600">*</span> : '(optional)'}
                          </label>
                          <input
                            type="tel"
                            value={newPerson.phone}
                            onChange={(e) => {
                              setNewPerson(prev => ({ ...prev, phone: e.target.value }))
                              // Clear errors when user starts typing
                              if (addPersonFieldErrors.length > 0) {
                                setAddPersonFieldErrors([])
                                setAddPersonError(null)
                              }
                            }}
                            placeholder="Enter phone number"
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              (addPersonFieldErrors.some(e => e.toLowerCase().includes('phone')) || 
                               (newPerson.inviteMethod === 'sms' || newPerson.inviteMethod === 'both') && !newPerson.phone.trim())
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300'
                            }`}
                            required={newPerson.inviteMethod === 'sms' || newPerson.inviteMethod === 'both'}
                          />
                          {(newPerson.inviteMethod === 'sms' || newPerson.inviteMethod === 'both') && (
                            <p className="text-xs text-gray-500 mt-1">
                              Required for SMS invitation
                            </p>
                          )}
                        </div>
                      </>
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
                    <Lock className="w-4 h-4 text-green-600" />
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

                {/* Platform Invitation Method - Only for living people */}
                {newPerson.personType === 'living' && (
                  <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <span>Platform Invitation Method</span>
                  </h3>
                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="inviteMethod"
                        value="email"
                        checked={newPerson.inviteMethod === 'email'}
                        onChange={(e) => setNewPerson(prev => ({ ...prev, inviteMethod: e.target.value as 'email' | 'sms' | 'both' }))}
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
                        onChange={(e) => setNewPerson(prev => ({ ...prev, inviteMethod: e.target.value as 'email' | 'sms' | 'both' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">SMS</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="inviteMethod"
                        value="both"
                        checked={newPerson.inviteMethod === 'both'}
                        onChange={(e) => setNewPerson(prev => ({ ...prev, inviteMethod: e.target.value as 'email' | 'sms' | 'both' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <MessageCircle className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-sm font-medium">Both</span>
                    </label>
                  </div>

                  {/* Platform Invitation Template Preview */}
                  {newPerson.name && newPerson.relationship && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        {newPerson.inviteMethod === 'email' ? 'Email Template Preview' : newPerson.inviteMethod === 'sms' ? 'SMS Template Preview' : 'Email & SMS Template Preview'}
                      </h4>
                      {(() => {
                        if (newPerson.inviteMethod === 'email') {
                          return (
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-blue-800">Subject:</span>
                                <p className="text-sm text-blue-700">Join me on ThisIsMe - Let's share our memories together!</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-blue-800">Message:</span>
                                <div className="text-sm text-blue-700 whitespace-pre-line bg-white rounded p-3">
                                  <p>Hi {newPerson.name}!</p>
                                  <p className="mt-2">I'd love you to be part of my memory network on ThisIsMe. It's a platform where we can share and collaborate on our memories together - from family stories to life milestones.</p>
                                  <p className="mt-2">You'll be able to:</p>
                                  <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>View and contribute to my memories</li>
                                    <li>Add your own memories and stories</li>
                                    <li>Collaborate on shared experiences</li>
                                    <li>Keep our family history alive together</li>
                                  </ul>
                                  <p className="mt-3 text-blue-600 font-medium">Click here to join my network and start sharing memories!</p>
                                </div>
                              </div>
                            </div>
                          )
                        } else if (newPerson.inviteMethod === 'sms') {
                          return (
                            <div>
                              <span className="text-xs font-medium text-blue-800">SMS Message:</span>
                              <p className="text-sm text-blue-700 bg-white rounded p-3">
                                Hi {newPerson.name}! I'd love you to join my memory network on ThisIsMe. Let's share our stories together! Join here: [link]
                              </p>
                            </div>
                          )
                        } else { // both
                          return (
                            <div className="space-y-4">
                              <div>
                                <span className="text-xs font-medium text-blue-800">Email Subject:</span>
                                <p className="text-sm text-blue-700">Join me on ThisIsMe - Let's share our memories together!</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-blue-800">Email Message:</span>
                                <div className="text-sm text-blue-700 whitespace-pre-line bg-white rounded p-3">
                                  <p>Hi {newPerson.name}!</p>
                                  <p className="mt-2">I'd love you to be part of my memory network on ThisIsMe. It's a platform where we can share and collaborate on our memories together - from family stories to life milestones.</p>
                                  <p className="mt-2">You'll be able to:</p>
                                  <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>View and contribute to my memories</li>
                                    <li>Add your own memories and stories</li>
                                    <li>Collaborate on shared experiences</li>
                                    <li>Keep our family history alive together</li>
                                  </ul>
                                  <p className="mt-3 text-blue-600 font-medium">Click here to join my network and start sharing memories!</p>
                                </div>
                              </div>
                              <div className="border-t border-blue-200 pt-2">
                                <span className="text-xs font-medium text-blue-800">SMS Message:</span>
                                <p className="text-sm text-blue-700 bg-white rounded p-3">
                                  Hi {newPerson.name}! I'd love you to join my memory network on ThisIsMe. Let's share our stories together! Join here: [link]
                                </p>
                              </div>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  )}
                  </div>
                )}

                {/* Message Templates - Only for living people */}
                {newPerson.personType === 'living' && (
                  <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {newPerson.inviteMethod === 'email' ? '📧 Email Templates' : newPerson.inviteMethod === 'sms' ? '📱 SMS Templates' : '📧📱 Message Templates'}
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
                    {newPerson.inviteMethod === 'email' ? (
                      <>
                        <option value={`Hi ${newPerson.name || '[Name]'},

I'm using This Is Me to organize and share my life memories, and I'd love for you to be part of it! 

I've created a personal network where I can tag people in my memories and share special moments. You'll be able to see memories you're tagged in and even add your own photos or stories to help make them more complete.

Would you like to join me in preserving these precious memories together?

Best regards,
[Your name]`}>🤝 General Invitation</option>
                      </>
                    ) : newPerson.inviteMethod === 'sms' ? (
                      <>
                        <option value={`Hi ${newPerson.name || '[Name]'}! I'd love you to join my memory network on ThisIsMe. Let's share our stories together! Join here: [link]`}>🤝 General SMS</option>
                        <option value={`Hey ${newPerson.name || '[Name]'}! I'm building a family memory network on ThisIsMe. Would love for you to join and share our stories! [link]`}>👨‍👩‍👧‍👦 Family SMS</option>
                        <option value={`Hi ${newPerson.name || '[Name]'}! I'm organizing my life memories on ThisIsMe and would love your input. Join me: [link]`}>📸 Memory SMS</option>
                      </>
                    ) : (
                      <>
                        <option value={`Hi ${newPerson.name || '[Name]'},

I'm using This Is Me to organize and share my life memories, and I'd love for you to be part of it! 

I've created a personal network where I can tag people in my memories and share special moments. You'll be able to see memories you're tagged in and even add your own photos or stories to help make them more complete.

Would you like to join me in preserving these precious memories together?

Best regards,
[Your name]`}>🤝 General Invitation</option>
                      </>
                    )}
                    <option value={`Dear ${newPerson.name || '[Name]'},

I've been working on documenting our family history and memories using This Is Me, and your perspective would be invaluable!

I'd love to invite you to contribute to our shared family stories. You can add photos, share your memories of events, and help me fill in details I might have missed.

Your memories and photos would mean so much to our family's digital legacy.

With love,
[Your name]`}>👨‍👩‍👧‍👦 Family Member</option>
                    <option value={`Hey ${newPerson.name || '[Name]'},

Remember all those amazing times we've shared? I'm putting together a digital collection of our memories on This Is Me!

I'd love for you to join me so you can see all the photos and stories from our adventures together. Plus, you can add your own photos and memories that I might not have.

It'll be like our own private social network of memories!

Talk soon,
[Your name]`}>🎉 Close Friend</option>
                    <option value={`Hi ${newPerson.name || '[Name]'},

I'm documenting my professional journey and career milestones using This Is Me, and I'd value having you as part of this network.

You've been an important part of my professional story, and I'd love to include memories from our time working together. You're welcome to add your own perspectives and photos from our shared projects.

Looking forward to preserving these professional memories together.

Best regards,
[Your name]`}>💼 Professional Contact</option>
                    <option value={`Hi ${newPerson.name || '[Name]'},

I'm creating a memory collection on This Is Me and would love to include you! I've already tagged you in some special memories we've shared.

You'll be able to see these memories and add your own photos or stories to make them even more meaningful. It's a beautiful way to preserve our shared experiences.

Hope you'll join me in this journey of memory keeping!

Warm regards,
[Your name]`}>📸 Already Tagged</option>
                    <option value={`Dear ${newPerson.name || '[Name]'},

I hope this message finds you well. I'm using This Is Me to create a digital archive of important life moments and memories.

I'd be honored if you'd join my memory network. You can contribute photos, stories, and your unique perspective on the experiences we've shared over the years.

Your participation would help create a richer, more complete picture of these precious memories.

Sincerely,
[Your name]`}>✨ Formal Invitation</option>
                    <option value={`Dear Family and Friends,

I'm creating a digital memorial and memory collection for ${newPerson.name || '[Name]'} on This Is Me, and I would love your help in preserving their legacy.

I'm gathering photos, stories, and memories that celebrate their life and the impact they had on all of us. If you have any photos, stories, or special memories of ${newPerson.name || '[Name]'}, I would be deeply grateful if you could contribute them to this collection.

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

                {/* Chapter Selection - Only for living people */}
                {newPerson.personType === 'living' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Chapters to Add Person To</label>
                    {loadingChapters ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading chapters...</span>
                      </div>
                    ) : availableChapters.length > 0 ? (
                      <div className="space-y-2">
                        {/* Do this later option */}
                        <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200 bg-gray-50">
                          <input
                            type="radio"
                            name="chapterSelection"
                            checked={newPersonSelectedChapters.length === 0}
                            onChange={() => setNewPersonSelectedChapters([])}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Do this later</div>
                            <div className="text-xs text-gray-500">Add to chapters after creating the person</div>
                          </div>
                        </label>
                        
                        {/* Chapter selection */}
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {availableChapters.map((chapter) => (
                            <label key={chapter.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={newPersonSelectedChapters.includes(chapter.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewPersonSelectedChapters(prev => [...prev, chapter.id])
                                  } else {
                                    setNewPersonSelectedChapters(prev => prev.filter(id => id !== chapter.id))
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">{chapter.title}</span>
                                {chapter.description && (
                                  <p className="text-xs text-gray-500 mt-1">{chapter.description}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No chapters available</p>
                        <p className="text-xs">Create a chapter first to add people to it</p>
                      </div>
                    )}
                    {newPersonSelectedChapters.length > 0 ? (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ {newPersonSelectedChapters.length} chapter{newPersonSelectedChapters.length > 1 ? 's' : ''} selected
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">
                        ℹ️ No chapters selected - you can add them later
                      </p>
                    )}
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
                onClick={openAddForm}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Person
              </button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Side: People List */}
              <div className="w-full lg:w-2/5 xl:w-1/3">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-semibold text-gray-900">People ({people.length})</h2>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                    {people.map((person) => {
                      const badge = getCollaborationBadge(person.collaboration_stats || { contributions_made: 0, memories_shared: 0 })
                      const isSelected = selectedPerson?.id === person.id
                      
                      return (
                        <div
                          key={person.id}
                          onClick={() => viewPersonDetails(person)}
                          className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-blue-50 ${
                            isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              {person.photo_url && !person.photo_url.includes('unsplash') ? (
                                <img
                                  src={person.photo_url}
                                  alt={person.person_name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                  {person.relationship?.includes('In Memory') || person.personType === 'legacy' ? (
                                    <span className="text-xl">🕊️</span>
                                  ) : (
                                    <User className="w-6 h-6 text-blue-600" />
                                  )}
                                </div>
                              )}
                              {person.person_user_id && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{person.person_name}</h3>
                              <p className="text-sm text-gray-500 truncate">{person.relationship}</p>
                            </div>
                            
                            {/* Memory Count Badge */}
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {person.tagged_memories_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side: Person Details */}
              <div className="flex-1">
                {selectedPerson ? (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header with Photo and Basic Info */}
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            {selectedPerson.photo_url && !selectedPerson.photo_url.includes('unsplash') ? (
                              <img
                                src={selectedPerson.photo_url}
                                alt={selectedPerson.person_name}
                              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
                              {selectedPerson.relationship?.includes('In Memory') || selectedPerson.personType === 'legacy' ? (
                                <span className="text-2xl">🕊️</span>
                              ) : (
                                <User className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                          )}
                          {selectedPerson.person_user_id && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-2xl font-bold text-gray-900">{selectedPerson.person_name}</h3>
                            {selectedPerson.relationship?.includes('In Memory') && (
                              <span className="text-gray-400">🕊️</span>
                            )}
                          </div>
                          <p className={`text-sm ${selectedPerson.relationship?.includes('In Memory') ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                            {selectedPerson.relationship}
                          </p>
                          {selectedPerson.person_email && (
                            <p className="text-sm text-gray-500 mt-1">{selectedPerson.person_email}</p>
                          )}
                          {selectedPerson.person_phone && (
                            <p className="text-sm text-gray-500">{selectedPerson.person_phone}</p>
                          )}
                        </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={() => editPerson(selectedPerson)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Edit Person"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => invitePerson(selectedPerson)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Send Invitation"
                          >
                            <UserPlus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deletePerson(selectedPerson)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete Person"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Collaboration Badge */}
                      <div className="flex items-center justify-between mb-4">
                        {(() => {
                          const badge = getCollaborationBadge(selectedPerson.collaboration_stats || { contributions_made: 0, memories_shared: 0 })
                          return (
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${badge.color}`}>
                              <span className="mr-1.5">{badge.icon}</span>
                              {badge.label}
                            </span>
                          )
                        })()}
                        <span className="text-base font-semibold text-gray-700">
                          {selectedPerson.tagged_memories_count || 0} memories
                        </span>
                      </div>

                      {/* Recent Memories Preview */}
                      {selectedPerson.recent_memories && selectedPerson.recent_memories.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-900 mb-3">Recent Memories</p>
                          <div className="grid grid-cols-3 gap-3">
                            {selectedPerson.recent_memories.slice(0, 3).map((memory) => (
                              <div 
                                key={memory.id} 
                                className="relative group/memory cursor-pointer"
                                onClick={() => viewMemory(memory, selectedPerson)}
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
                      {selectedPerson.collaboration_stats && (
                        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{selectedPerson.collaboration_stats.contributions_made}</p>
                            <p className="text-sm text-gray-600">Contributions</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{selectedPerson.collaboration_stats.memories_shared}</p>
                            <p className="text-sm text-gray-600">Shared</p>
                          </div>
                        </div>
                      )}

                      {/* Chapter Access */}
                      {selectedPerson.permissions?.chapters_access && selectedPerson.permissions.chapters_access.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-900 mb-3">Chapter Access</p>
                          <div className="space-y-2">
                            {selectedPerson.permissions.chapters_access.slice(0, 2).map((chapter, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <BookOpen className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-900">{chapter.chapter_name}</span>
                                </div>
                                <span className="text-xs text-gray-500">({chapter.permissions.join(', ')})</span>
                              </div>
                            ))}
                            {selectedPerson.permissions.chapters_access.length > 2 && (
                              <p className="text-sm text-gray-500 text-center">
                                +{selectedPerson.permissions.chapters_access.length - 2} more chapters
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Visual Permissions Overview */}
                      {selectedPerson.permissions && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-900 mb-3">Access Level</p>
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              {selectedPerson.permissions.can_view_memories && selectedPerson.permissions.can_add_text && selectedPerson.permissions.can_add_images && selectedPerson.permissions.can_comment ? (
                                <div className="flex items-center space-x-2">
                                  <Crown className="w-5 h-5 text-yellow-600" />
                                  <span className="text-sm font-semibold text-yellow-800">Full Access</span>
                                </div>
                              ) : selectedPerson.permissions.can_view_memories && (selectedPerson.permissions.can_add_text || selectedPerson.permissions.can_comment) ? (
                                <div className="flex items-center space-x-2">
                                  <Star className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-semibold text-blue-800">Contributor</span>
                                </div>
                              ) : selectedPerson.permissions.can_view_memories ? (
                                <div className="flex items-center space-x-2">
                                  <Eye className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-semibold text-green-800">Viewer</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Lock className="w-5 h-5 text-gray-500" />
                                  <span className="text-sm font-semibold text-gray-600">No Access</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {selectedPerson.permissions.can_add_text && <FileText className="w-4 h-4 text-green-600" />}
                              {selectedPerson.permissions.can_add_images && <Image className="w-4 h-4 text-blue-600" />}
                              {selectedPerson.permissions.can_comment && <MessageCircle className="w-4 h-4 text-purple-600" />}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Specific Chapter & Memory Permissions */}
                      {selectedPerson.permissions && ((selectedPerson.permissions.chapters_access?.length || 0) > 0 || (selectedPerson.permissions.memory_access?.length || 0) > 0) && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-3">Specific Access</p>
                          
                          {/* Chapter Permissions */}
                          {(selectedPerson.permissions.chapters_access?.length || 0) > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-900 mb-2">📚 Chapters</p>
                              <div className="space-y-2">
                                {selectedPerson.permissions.chapters_access?.map((chapter: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                                    <span className="text-sm font-medium text-blue-900">{chapter.chapter_name}</span>
                                    <div className="flex items-center space-x-1">
                                      {chapter.permissions.includes('view') && <div title="Can view"><Eye className="w-4 h-4 text-green-600" /></div>}
                                      {chapter.permissions.includes('add_text') && <div title="Can add text"><FileText className="w-4 h-4 text-blue-600" /></div>}
                                      {chapter.permissions.includes('add_images') && <div title="Can add images"><Image className="w-4 h-4 text-purple-600" /></div>}
                                      {chapter.permissions.includes('comment') && <div title="Can comment"><MessageCircle className="w-4 h-4 text-orange-600" /></div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Memory Permissions */}
                          {(selectedPerson.permissions.memory_access?.length || 0) > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">💭 Memories</p>
                              <div className="space-y-2">
                                {selectedPerson.permissions.memory_access?.map((memory: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                                    <div className="flex-1">
                                      <span className="text-xs font-medium text-purple-800">{memory.memory_title}</span>
                                      {memory.count && <span className="text-xs text-purple-600 ml-1">({memory.count})</span>}
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {memory.permissions.includes('view') && <div title="Can view"><Eye className="w-3 h-3 text-green-500" /></div>}
                                      {memory.permissions.includes('add_text') && <div title="Can add text"><FileText className="w-3 h-3 text-blue-500" /></div>}
                                      {memory.permissions.includes('add_images') && <div title="Can add images"><Image className="w-3 h-3 text-purple-500" /></div>}
                                      {memory.permissions.includes('comment') && <div title="Can comment"><MessageCircle className="w-3 h-3 text-orange-500" /></div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
                    <Users className="w-20 h-20 text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Person</h3>
                    <p className="text-gray-500 max-w-sm">
                      Click on someone from the list to view their details, memories, and permissions.
                    </p>
                  </div>
                )}
              </div>
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
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
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
                <div className="p-6 overflow-y-auto flex-1 min-h-0">
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
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex-shrink-0">
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

      {/* Edit Person Modal */}
      {showEditModal && editingPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Person</h2>
              <p className="text-sm text-gray-600 mt-1">Update {editingPerson.person_name}'s information</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingPerson.person_name}
                  onChange={(e) => setEditingPerson({...editingPerson, person_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter person's name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editingPerson.person_email || ''}
                  onChange={(e) => setEditingPerson({...editingPerson, person_email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={editingPerson.person_phone || ''}
                  onChange={(e) => setEditingPerson({...editingPerson, person_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                <input
                  type="text"
                  value={editingPerson.relationship || ''}
                  onChange={(e) => setEditingPerson({...editingPerson, relationship: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Sister, Friend, Colleague"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {editingPerson.photo_url ? (
                      <img
                        src={editingPerson.photo_url}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
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
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            setEditingPerson({...editingPerson, photo_url: event.target?.result as string})
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload a new photo or keep the current one</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingPerson(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={updatePerson}
                  disabled={isUpdating || !editingPerson.person_name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUpdating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isUpdating ? 'Updating...' : 'Update Person'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && personToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-red-600">Delete Person</h2>
              <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
            </div>
            
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Are you sure you want to delete</p>
                  <p className="text-lg font-semibold text-gray-900">{personToDelete.person_name}?</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently delete {personToDelete.person_name} from your network and remove all associated memory tags.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setPersonToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePerson}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isDeleting ? 'Deleting...' : 'Delete Person'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Person Modal */}
      {showInviteModal && invitingPerson && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isInviting) {
              setShowInviteModal(false)
              setInvitingPerson(null)
              setInviteMessage('')
              setSelectedChapters([])
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Send Invitation</h2>
                <p className="text-sm text-gray-600 mt-1">Invite {invitingPerson.person_name} to join This Is Me</p>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInvitingPerson(null)
                  setInviteMessage('')
                  setSelectedChapters([])
                }}
                className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                disabled={isInviting}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Platform Invitation Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Platform Invitation Method</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="inviteMethod"
                      value="email"
                      checked={inviteMethod === 'email'}
                      onChange={(e) => setInviteMethod(e.target.value as 'email' | 'sms' | 'both')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled={!invitingPerson.person_email}
                    />
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Email {!invitingPerson.person_email && '(No email available)'}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="inviteMethod"
                      value="sms"
                      checked={inviteMethod === 'sms'}
                      onChange={(e) => setInviteMethod(e.target.value as 'email' | 'sms' | 'both')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled={!invitingPerson.person_phone}
                    />
                    <span className="text-sm font-medium">SMS {!invitingPerson.person_phone && '(No phone available)'}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="inviteMethod"
                      value="both"
                      checked={inviteMethod === 'both'}
                      onChange={(e) => setInviteMethod(e.target.value as 'email' | 'sms' | 'both')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled={!invitingPerson.person_email || !invitingPerson.person_phone}
                    />
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm font-medium">Both {(!invitingPerson.person_email || !invitingPerson.person_phone) && '(Email or phone missing)'}</span>
                  </label>
                </div>
              </div>

              {/* Platform Invitation Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Platform Invitation Preview</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    {inviteMethod === 'email' ? 'Email Template Preview' : inviteMethod === 'sms' ? 'SMS Template Preview' : 'Email & SMS Template Preview'}
                  </h4>
                  {(() => {
                    if (inviteMethod === 'email') {
                      return (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-blue-800">Subject:</span>
                            <p className="text-sm text-blue-700">Join me on ThisIsMe - Let's share our memories together!</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-blue-800">Message:</span>
                            <div className="text-sm text-blue-700 whitespace-pre-line bg-white rounded p-3">
                              <p>Hi {invitingPerson.person_name}!</p>
                              <p className="mt-2">I'd love you to be part of my memory network on ThisIsMe. It's a platform where we can share and collaborate on our memories together - from family stories to life milestones.</p>
                              <p className="mt-2">You'll be able to:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>View and contribute to my memories</li>
                                <li>Add your own memories and stories</li>
                                <li>Collaborate on shared experiences</li>
                                <li>Keep our family history alive together</li>
                              </ul>
                              <p className="mt-3 text-blue-600 font-medium">Click here to join my network and start sharing memories!</p>
                            </div>
                          </div>
                        </div>
                      )
                    } else if (inviteMethod === 'sms') {
                      return (
                        <div>
                          <span className="text-xs font-medium text-blue-800">SMS Message:</span>
                          <p className="text-sm text-blue-700 bg-white rounded p-3">
                            Hi {invitingPerson.person_name}! I'd love you to join my memory network on ThisIsMe. Let's share our stories together! Join here: [link]
                          </p>
                        </div>
                      )
                    } else { // both
                      return (
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs font-medium text-blue-800">Email Subject:</span>
                            <p className="text-sm text-blue-700">Join me on ThisIsMe - Let's share our memories together!</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-blue-800">Email Message:</span>
                            <div className="text-sm text-blue-700 whitespace-pre-line bg-white rounded p-3">
                              <p>Hi {invitingPerson.person_name}!</p>
                              <p className="mt-2">I'd love you to be part of my memory network on ThisIsMe. It's a platform where we can share and collaborate on our memories together - from family stories to life milestones.</p>
                              <p className="mt-2">You'll be able to:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>View and contribute to my memories</li>
                                <li>Add your own memories and stories</li>
                                <li>Collaborate on shared experiences</li>
                                <li>Keep our family history alive together</li>
                              </ul>
                              <p className="mt-3 text-blue-600 font-medium">Click here to join my network and start sharing memories!</p>
                            </div>
                          </div>
                          <div className="border-t border-blue-200 pt-2">
                            <span className="text-xs font-medium text-blue-800">SMS Message:</span>
                            <p className="text-sm text-blue-700 bg-white rounded p-3">
                              Hi {invitingPerson.person_name}! I'd love you to join my memory network on ThisIsMe. Let's share our stories together! Join here: [link]
                            </p>
                          </div>
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>

              {/* Chapter Access Information */}
              {invitingPerson.permissions?.chapters_access && invitingPerson.permissions.chapters_access.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chapter Access</label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 mb-2">
                      {invitingPerson.person_name} has access to these chapters:
                    </p>
                    <div className="space-y-1">
                      {invitingPerson.permissions.chapters_access.map((chapter, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700 font-medium">{chapter.chapter_name}</span>
                          <span className="text-xs text-blue-600">
                            ({chapter.permissions.join(', ')})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Message (optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a personal message to your invitation..."
                  rows={3}
                />
              </div>

              {/* Chapter Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Chapters to Invite To</label>
                {loadingChapters ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading chapters...</span>
                  </div>
                ) : availableChapters.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {availableChapters.map((chapter) => (
                      <label key={chapter.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedChapters.includes(chapter.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChapters(prev => [...prev, chapter.id])
                            } else {
                              setSelectedChapters(prev => prev.filter(id => id !== chapter.id))
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{chapter.title}</span>
                          {chapter.description && (
                            <p className="text-xs text-gray-500 mt-1">{chapter.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No chapters available</p>
                    <p className="text-xs">Create a chapter first to invite people to it</p>
                  </div>
                )}
                {selectedChapters.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ {selectedChapters.length} chapter{selectedChapters.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Preview */}
              {inviteMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Preview</h4>
                  <p className="text-sm text-blue-800">
                    {inviteMethod === 'email' 
                      ? `Email will be sent to ${invitingPerson.person_email}`
                      : `SMS will be sent to ${invitingPerson.person_phone}`
                    }
                  </p>
                  <p className="text-xs text-blue-700 mt-1">"{inviteMessage}"</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex-shrink-0">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false)
                    setInvitingPerson(null)
                    setInviteMessage('')
                    setSelectedChapters([])
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isInviting}
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvitation}
                  disabled={isInviting || (inviteMethod === 'email' && !invitingPerson.person_email) || (inviteMethod === 'sms' && !invitingPerson.person_phone) || (inviteMethod === 'both' && (!invitingPerson.person_email || !invitingPerson.person_phone))}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isInviting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isInviting ? 'Sending...' : 'Send Invitation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
