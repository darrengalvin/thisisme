// String constants for types (SQLite doesn't support enums)
export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO'
export type TimeZoneType = 'PRIVATE' | 'GROUP'
export type TimeZoneMemberRole = 'CREATOR' | 'MEMBER'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
export type NotificationType = 'TIMEZONE_INVITATION' | 'NEW_MEMORY' | 'MEMBER_JOINED'

// Base types from database schema
export interface User {
  id: string
  email: string
  password: string
  birthYear?: number | null
  createdAt: Date
  updatedAt: Date
}

export interface Memory {
  id: string
  title?: string | null
  textContent?: string | null
  userId: string
  timeZoneId: string
  createdAt: Date
  updatedAt: Date
}

export interface Media {
  id: string
  memory_id: string
  type: string
  storage_url: string
  thumbnail_url?: string | null
  file_name: string
  file_size: number
  mime_type: string
  created_at: Date
}

export interface TimeZone {
  id: string
  title: string
  description?: string | null
  type: string
  inviteCode?: string | null
  startDate?: string | null
  endDate?: string | null
  location?: string | null
  headerImageUrl?: string | null
  headerImagePosition?: number // 0-100, vertical position percentage
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface TimeZoneMember {
  id: string
  timeZoneId: string
  userId: string
  role: string
  joinedAt: Date
}

export interface Invitation {
  id: string
  code: string
  timeZoneId: string
  createdBy: string
  isActive: boolean
  expiresAt?: Date | null
  createdAt: Date
  status: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: string | null
  isRead: boolean
  createdAt: Date
}

// Extended types with relations
export interface UserWithRelations extends User {
  memories?: Memory[]
  createdTimeZones?: TimeZone[]
  timeZoneMembers?: TimeZoneMember[]
}

export interface MemoryWithRelations extends Memory {
  user?: User
  timeZone?: TimeZone
  media?: Media[]
}

export interface TimeZoneWithRelations extends TimeZone {
  creator?: User
  members?: TimeZoneMember[]
  memories?: Memory[]
  invitations?: Invitation[]
  _count?: {
    members?: number
    memories?: number
  }
}

export interface TimeZoneMemberWithRelations extends TimeZoneMember {
  user?: User
  timeZone?: TimeZone
}

export interface InvitationWithRelations extends Invitation {
  timeZone?: TimeZone
  sender?: User
}

export interface NotificationWithRelations extends Notification {
  user?: User
}

// Form types
export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
}

export interface LoginFormData {
  email: string
  password: string
}

export interface CreateMemoryFormData {
  title?: string
  textContent?: string
  timeZoneId: string
  files?: FileList
}

export interface CreateTimeZoneFormData {
  title: string
  description?: string
  type: TimeZoneType
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthResponse {
  user: User
  token: string
}

// File upload types
export interface FileUpload {
  file: File
  type: MediaType
  preview?: string
}

// UI Component Props
export interface MemoryCardProps {
  memory: MemoryWithRelations
  showActions?: boolean
  onEdit?: (memory: Memory) => void
  onDelete?: (memory: Memory) => void
}

export interface TimeZoneCardProps {
  timeZone: TimeZoneWithRelations
  onSelect?: (timeZone: TimeZone) => void
  showMembers?: boolean
}

// Utility constants
export const MEDIA_TYPES = {
  IMAGE: 'IMAGE' as const,
  VIDEO: 'VIDEO' as const,
  AUDIO: 'AUDIO' as const,
} as const

export const TIMEZONE_TYPES = {
  PRIVATE: 'PRIVATE' as const,
  GROUP: 'GROUP' as const,
} as const

export const MEMBER_ROLES = {
  CREATOR: 'CREATOR' as const,
  MEMBER: 'MEMBER' as const,
} as const

export const INVITATION_STATUS = {
  PENDING: 'PENDING' as const,
  ACCEPTED: 'ACCEPTED' as const,
  EXPIRED: 'EXPIRED' as const,
  CANCELLED: 'CANCELLED' as const,
} as const

export const NOTIFICATION_TYPES = {
  TIMEZONE_INVITATION: 'TIMEZONE_INVITATION' as const,
  NEW_MEMORY: 'NEW_MEMORY' as const,
  MEMBER_JOINED: 'MEMBER_JOINED' as const,
} as const 