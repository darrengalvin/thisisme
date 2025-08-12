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

  // Sort memories when chapter is loaded or updated
  const sortMemories = (memories: MemoryWithRelations[] | undefined) => {
    if (!memories) return []
    return [...memories].sort((a, b) => {
      const dateA = new Date(a.memoryDate || a.createdAt).getTime()
      const dateB = new Date(b.memoryDate || b.createdAt).getTime()
      return dateA - dateB
    })
  }

  // Set up editing state when chapter changes
  useEffect(() => {
    if (chapter && isOpen) {
      const initialChapter = {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description || '',
        startDate: formatDateForInput(chapter.startDate),
        endDate: formatDateForInput(chapter.endDate),
        location: chapter.location || '',
        headerImageUrl: chapter.headerImageUrl || null,
        memories: sortMemories(chapter.memories)
      }
      
      setEditingChapter(initialChapter)
      setOriginalChapter({ ...initialChapter })
      setSelectedHeaderImage(null)
      setPreviewImageUrl(null)
      setHasUnsavedChanges(false)
      setLastSaved(null)
      setShowUnsavedWarning(false)
    }
  }, [chapter, isOpen])

  // Rest of the component code remains the same...
}