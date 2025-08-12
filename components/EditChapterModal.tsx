import React, { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon, Move, Upload } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { TimeZoneWithRelations, MemoryWithRelations } from '@/lib/types'
import ImageCropper from '@/components/ImageCropper'

interface EditChapterModalProps {
  chapter: TimeZoneWithRelations | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface EditingChapter {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  location: string
  headerImageUrl: string | null
  memories?: MemoryWithRelations[]
}

export default function EditChapterModal({ chapter, isOpen, onClose, onSuccess }: EditChapterModalProps) {
  const { user } = useAuth()
  const [editingChapter, setEditingChapter] = useState<EditingChapter | null>(null)
  const [selectedHeaderImage, setSelectedHeaderImage] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)

  // Enhanced memory sorting with error handling and validation
  const sortMemories = (memories: MemoryWithRelations[] | undefined): MemoryWithRelations[] => {
    if (!memories || !Array.isArray(memories)) return []
    
    return [...memories].sort((a, b) => {
      try {
        const dateA = new Date(a.memoryDate || a.createdAt || 0).getTime()
        const dateB = new Date(b.memoryDate || b.createdAt || 0).getTime()
        
        if (isNaN(dateA) || isNaN(dateB)) {
          console.warn('Invalid date detected in memory sorting')
          return 0
        }
        
        return dateA - dateB
      } catch (error) {
        console.error('Error sorting memories:', error)
        return 0
      }
    })
  }

  // Set up editing state when chapter changes with enhanced error handling
  useEffect(() => {
    if (chapter && isOpen) {
      try {
        const sortedMemories = sortMemories(chapter.memories)
        
        const initialChapter = {
          id: chapter.id,
          title: chapter.title,
          description: chapter.description || '',
          startDate: formatDateForInput(chapter.startDate),
          endDate: formatDateForInput(chapter.endDate),
          location: chapter.location || '',
          headerImageUrl: chapter.headerImageUrl || null,
          memories: sortedMemories
        }
        
        setEditingChapter(initialChapter)
        setOriginalChapter({ ...initialChapter })
        setSelectedHeaderImage(null)
        setPreviewImageUrl(null)
        setHasUnsavedChanges(false)
        setLastSaved(null)
        setShowUnsavedWarning(false)
      } catch (error) {
        console.error('Error initializing chapter editing:', error)
        toast.error('Error loading chapter data')
        onClose()
      }
    }
  }, [chapter, isOpen])

  // Rest of the component code remains the same...
}