// Enhanced collaboration types for existing timezone system

export interface UserNetworkPerson {
  id: string
  owner_id: string
  person_name: string
  person_email?: string
  person_user_id?: string // If they're a platform user
  relationship?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface MemoryTag {
  id: string
  memory_id: string
  tagged_person_id: string
  tagged_by_user_id: string
  created_at: string
  // Relations
  tagged_person?: UserNetworkPerson
  tagged_by?: {
    id: string
    email: string
  }
}

export interface MemoryContribution {
  id: string
  memory_id: string
  contributor_id: string
  contribution_type: 'COMMENT' | 'ADDITION' | 'CORRECTION'
  content: string
  created_at: string
  updated_at: string
  // Relations
  contributor?: {
    id: string
    email: string
  }
}

export interface EnhancedMemory {
  id: string
  title?: string
  text_content?: string
  user_id: string
  timezone_id?: string
  date_precision?: string
  approximate_date?: string
  created_at: string
  updated_at: string
  // Enhanced relations
  tags?: MemoryTag[]
  contributions?: MemoryContribution[]
  media?: any[] // Existing media type
}

export interface EnhancedNotification {
  id: string
  user_id: string
  type: 'TIMEZONE_INVITATION' | 'NEW_MEMORY' | 'MEMBER_JOINED' | 'MEMORY_TAG' | 'MEMORY_CONTRIBUTION' | 'TIMEZONE_MEMORY_ADDED'
  title: string
  message: string
  data?: {
    memory_id?: string
    timezone_id?: string
    tagged_by?: string
    contributor?: string
    contribution_type?: string
    memory_title?: string
  }
  is_read: boolean
  created_at: string
}

// API Request/Response types
export interface CreateNetworkPersonRequest {
  person_name: string
  person_email?: string
  relationship?: string
  notes?: string
}

export interface TagMemoryRequest {
  memory_id: string
  tagged_person_ids: string[] // Array of user_networks.id
}

export interface CreateContributionRequest {
  memory_id: string
  contribution_type: 'COMMENT' | 'ADDITION' | 'CORRECTION'
  content: string
}

export interface TagSuggestion {
  id: string
  name: string
  email?: string
  relationship?: string
  is_platform_user: boolean
}

// Enhanced timezone with collaboration stats
export interface EnhancedTimeZone {
  id: string
  title: string
  description?: string
  type: 'PRIVATE' | 'GROUP'
  start_date?: string
  end_date?: string
  location?: string
  invite_code?: string
  creator_id: string
  created_at: string
  updated_at: string
  // Stats
  member_count?: number
  memory_count?: number
  recent_activity_count?: number
  // User's role in this timezone
  user_role?: 'CREATOR' | 'MEMBER'
}
