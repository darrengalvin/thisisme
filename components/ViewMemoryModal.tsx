'use client'

import { useState } from 'react'
import { X, Edit, Calendar, MapPin, Share2, Camera, Crop } from 'lucide-react'
import { MemoryWithRelations } from '@/lib/types'
import EditMemoryModal from './EditMemoryModal'
import ShareMemoryModal from './ShareMemoryModal'
import ImageCropper from './ImageCropper'
import PhotoTagDisplay from './PhotoTagDisplay'
import MemoryCollaboration from './MemoryCollaboration'
import SimplePhotoTagger from './SimplePhotoTagger'
import toast from 'react-hot-toast'

interface ViewMemoryModalProps {
  memory: MemoryWithRelations | null
  isOpen: boolean
  onClose: () => void
  onSave?: (updatedMemory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
}

export default function ViewMemoryModal({ memory, isOpen, onClose, onSave, onDelete }: ViewMemoryModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<{ mediaId: string, imageUrl: string } | null>(null)
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)
  
  // Photo tagging modal state
  const [showPhotoTagger, setShowPhotoTagger] = useState(false)
  const [taggingImage, setTaggingImage] = useState<{ url: string; mediaId: string; memoryTitle?: string } | null>(null)

  console.log('👁️ VIEW MEMORY MODAL RENDER:', {
    isOpen,
    hasMemory: !!memory,
    memoryTitle: memory?.title,
    memoryId: memory?.id,
    isEditing
  })

  if (!isOpen || !memory) return null

  // If in editing mode, show the EditMemoryModal instead
  if (isEditing) {
    return (
      <EditMemoryModal
        memory={memory}
        isOpen={true}
        onClose={() => setIsEditing(false)}
        onSave={(updatedMemory) => {
          setIsEditing(false)
          onSave?.(updatedMemory)
        }}
        onDelete={(deletedMemory) => {
          setIsEditing(false)
          onDelete?.(deletedMemory)
        }}
      />
    )
  }

  // Get primary image
  const primaryImage = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url || undefined

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image */}
        <div className="relative">
          {primaryImage ? (
            <div className="relative overflow-hidden">
              <PhotoTagDisplay
                mediaId={memory.media?.[0]?.id || ''}
                imageUrl={primaryImage}
                className="w-full h-auto object-contain max-h-80"
                showTagsOnHover={true}
                showTagIndicator={true}
                onPersonClick={(personId, personName) => {
                  console.log('🏷️ VIEW MODAL: Person clicked:', personName, personId)
                  // TODO: Navigate to My People or show person details
                }}
                onTagNowClick={(mediaId) => {
                  console.log('🏷️ VIEW MODAL: Tag now clicked for media:', mediaId)
                  const media = memory.media?.find(m => m.id === mediaId)
                  if (media) {
                    setTaggingImage({
                      url: media.storage_url,
                      mediaId: media.id,
                      memoryTitle: memory.title || undefined
                    })
                    setShowPhotoTagger(true)
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              
              {/* Title overlay on image */}
              <div className="absolute bottom-4 left-6 right-16">
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                  {memory.title || 'Untitled Memory'}
                </h2>
                {memory.createdAt && (
                  <p className="text-white/90 text-sm mt-1 drop-shadow">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    {new Date(memory.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 h-32 flex items-center justify-center border-b">
              <div className="text-center">
                <Camera className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-slate-700">
                  {memory.title || 'Untitled Memory'}
                </h2>
                {memory.createdAt && (
                  <p className="text-slate-600 text-sm mt-1">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    {new Date(memory.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="w-10 h-10 bg-white/90 hover:bg-white text-slate-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
              title="Edit memory"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/90 hover:bg-white text-slate-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Memory content */}
          {memory.textContent && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-blue-500 rounded-full mr-3"></span>
                Memory Details
              </h3>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {memory.textContent}
                </p>
              </div>
            </div>
          )}

          {/* Location if available */}
          {memory.timeZone?.location && (
            <div className="mb-6">
              <div className="flex items-center text-slate-600 bg-slate-50 rounded-lg p-3">
                <MapPin className="w-5 h-5 mr-2 text-slate-500" />
                <span className="font-medium">{memory.timeZone?.location}</span>
              </div>
            </div>
          )}

          {/* Additional images */}
          {memory.media && memory.media.length > 1 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-green-500 rounded-full mr-3"></span>
                More Photos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {memory.media.slice(1).map((media, index) => (
                  <div key={index} className="rounded-lg overflow-hidden shadow-sm bg-slate-50">
                    <img
                      src={media.storage_url || media.thumbnail_url || ''}
                      alt={`Memory ${index + 2}`}
                      className="w-full h-auto object-contain hover:scale-105 transition-transform duration-200 max-h-48"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memory Collaboration */}
          <div className="border-t border-slate-200 pt-6 mt-6">
            <MemoryCollaboration 
              memoryId={memory.id}
              memoryTitle={memory.title || 'this memory'}
              permissions={['view', 'comment', 'add_text', 'add_images']} // Owner has full access
              isOwner={true}
            />
          </div>

          {/* Memory metadata */}
          <div className="border-t border-slate-200 pt-4 mt-6">
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <span className="font-medium">Created:</span>
                <div className="mt-1">
                  {memory.createdAt ? new Date(memory.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
              <div>
                <span className="font-medium">Last updated:</span>
                <div className="mt-1">
                  {memory.updatedAt ? new Date(memory.updatedAt).toLocaleDateString() : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end items-center flex-shrink-0">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium"
            >
              Edit Memory
            </button>
          </div>
        </div>
      </div>

      {/* Share Memory Modal */}
      <ShareMemoryModal
        memory={memory}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Simple Photo Tagger Modal */}
      {taggingImage && (
        <SimplePhotoTagger
          isOpen={showPhotoTagger}
          onClose={() => {
            setShowPhotoTagger(false)
            setTaggingImage(null)
          }}
          imageUrl={taggingImage.url}
          mediaId={taggingImage.mediaId}
          memoryTitle={taggingImage.memoryTitle}
          onNavigateToMyPeople={() => {
            setShowPhotoTagger(false)
            setTaggingImage(null)
            onClose()
            // Navigate to My People tab - this would need to be passed down from parent
          }}
        />
      )}
    </div>
  )
}