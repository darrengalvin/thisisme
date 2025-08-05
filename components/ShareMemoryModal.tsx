'use client'

import { useState } from 'react'
import { X, Copy, Check, QrCode, Mail, Facebook, Twitter, Instagram, Eye, Users, Lock, Settings, Calendar, BarChart3, Globe, Shield } from 'lucide-react'
import { MemoryWithRelations } from '@/lib/types'
import NotificationModal from './NotificationModal'

interface ShareMemoryModalProps {
  memory: MemoryWithRelations | null
  isOpen: boolean
  onClose: () => void
}

export default function ShareMemoryModal({ memory, isOpen, onClose }: ShareMemoryModalProps) {
  const [shareLink, setShareLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('friends')
  const [permissions, setPermissions] = useState<'view' | 'contribute' | 'edit'>('view')
  const [expiresIn, setExpiresIn] = useState<'never' | '7days' | '30days' | '1year'>('never')
  const [showQR, setShowQR] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [sharePassword, setSharePassword] = useState('')

  if (!isOpen || !memory) return null

  // Generate short share code (8-character alphanumeric)
  const generateShareCode = () => {
    // Create a deterministic but seemingly random code based on settings
    const settingsString = `${memory.id}-${privacy}-${permissions}-${expiresIn}`
    const hash = settingsString.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    // Convert to base36 and take 8 characters
    const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0').slice(0, 8)
    return code
  }

  // Generate clean share link
  const generateShareLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mylife.app'
    const shareCode = generateShareCode()
    const link = `${baseUrl}/share/${shareCode}`
    setShareLink(link)
    
    // Log the settings for backend reference (in real app, this would be stored in database)
    console.log('🔗 SHARE CODE GENERATED:', {
      shareCode,
      memoryId: memory.id,
      privacy,
      permissions,
      expiresIn,
      hasPassword: privacy === 'private' && sharePassword.length > 0,
      settings: {
        privacy,
        permissions,
        expiresIn,
        memoryId: memory.id,
        password: privacy === 'private' ? sharePassword : null,
        createdAt: new Date().toISOString()
      }
    })
    
    return link
  }

  // Copy link to clipboard
  const copyToClipboard = async () => {
    const link = generateShareLink()
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  // Get primary image for preview
  const primaryImage = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Share Memory</h3>
              <p className="text-blue-100 text-sm mt-1">"{memory.title || 'Untitled Memory'}"</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {/* Social Media Preview */}
          <div className="mb-8">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
              <Eye className="w-4 h-4 mr-2 text-blue-500" />
              Preview
            </h4>
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex space-x-3">
                {primaryImage && (
                  <img 
                    src={primaryImage} 
                    alt="Memory preview" 
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-slate-900 truncate">
                    {memory.title || 'Shared Memory'}
                  </h5>
                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                    {memory.textContent || 'A special memory shared with you'}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">mylife.app</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="mb-8">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-green-500" />
              Privacy Settings
            </h4>
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="mr-3"
                />
                <Globe className="w-4 h-4 mr-2 text-green-500" />
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-sm text-slate-600">Anyone with the link can view</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="privacy"
                  value="friends"
                  checked={privacy === 'friends'}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="mr-3"
                />
                <Users className="w-4 h-4 mr-2 text-blue-500" />
                <div>
                  <div className="font-medium">Friends Only</div>
                  <div className="text-sm text-slate-600">Only people you choose can view</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="mr-3"
                />
                <Lock className="w-4 h-4 mr-2 text-slate-500" />
                <div>
                  <div className="font-medium">Private (Password Protected)</div>
                  <div className="text-sm text-slate-600">Recipients must enter a password to view</div>
                </div>
              </label>
            </div>
            
            {/* Password Field - Only show when Private is selected */}
            {privacy === 'private' && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Set Password
                </label>
                <input
                  type="text"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Enter a memorable password..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <div className="mt-2 text-xs text-slate-500">
                  <p>💡 <strong>How it works:</strong> Recipients will see a password prompt before they can view your memory. Choose something memorable but secure.</p>
                  <p className="mt-1"><strong>Example:</strong> "John's Wedding 2023" or "Summer Vacation!"</p>
                </div>
              </div>
            )}
          </div>

          {/* Collaboration Permissions */}
          <div className="mb-8">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2 text-purple-500" />
              What Recipients Can Do
            </h4>
            <div className="space-y-3">
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="permissions"
                  value="view"
                  checked={permissions === 'view'}
                  onChange={(e) => setPermissions(e.target.value as any)}
                  className="mr-3 mt-0.5"
                />
                <Eye className="w-4 h-4 mr-2 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">View Only (Recommended)</div>
                  <div className="text-sm text-slate-600 mt-1">
                    ✅ Can view the memory and all photos<br/>
                    ❌ Cannot edit, delete, or add content<br/>
                    ❌ Cannot access your chapters or other memories
                  </div>
                </div>
              </label>
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="permissions"
                  value="contribute"
                  checked={permissions === 'contribute'}
                  onChange={(e) => setPermissions(e.target.value as any)}
                  className="mr-3 mt-0.5"
                />
                <Users className="w-4 h-4 mr-2 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">Can Contribute</div>
                  <div className="text-sm text-slate-600 mt-1">
                    ✅ Can view the memory and add photos/comments<br/>
                    ✅ Can contribute additional memories to this shared link<br/>
                    ❌ Cannot edit your original content or delete anything<br/>
                    ❌ Cannot access your chapters or account settings
                  </div>
                </div>
              </label>
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="permissions"
                  value="edit"
                  checked={permissions === 'edit'}
                  onChange={(e) => setPermissions(e.target.value as any)}
                  className="mr-3 mt-0.5"
                />
                <Settings className="w-4 h-4 mr-2 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">Can Edit (Full Access)</div>
                  <div className="text-sm text-slate-600 mt-1">
                    ✅ Can modify the memory title, description, and photos<br/>
                    ⚠️ Can delete photos and content from this memory<br/>
                    ❌ Cannot delete the entire memory<br/>
                    ❌ Cannot access your chapters or account settings
                  </div>
                </div>
              </label>
            </div>
            
            {/* Security Notice */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">🔒 Your Account Stays Secure</p>
                  <p>Recipients can only access this specific shared memory. They cannot see your other memories, edit your chapters, change your account settings, or access any other parts of your profile.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expiration */}
          <div className="mb-8">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-orange-500" />
              Link Expiration
            </h4>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value as any)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="never">Never expires</option>
              <option value="7days">Expires in 7 days</option>
              <option value="30days">Expires in 30 days</option>
              <option value="1year">Expires in 1 year</option>
            </select>
          </div>

          {/* Share Link */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900">Share Link</h4>
              <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Shield className="w-3 h-3" />
                <span className="text-xs font-medium">Clean & Professional</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareLink || generateShareLink()}
                readOnly
                className="flex-1 p-3 border border-slate-300 rounded-lg bg-slate-50 text-sm font-mono"
                placeholder="Generating share link..."
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  linkCopied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                }`}
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              <p>✨ Clean, professional link perfect for sharing anywhere</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-8">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-sm font-medium">
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </span>
            </button>
            {showQR && (
              <div className="mt-3 p-4 bg-white border rounded-lg text-center">
                <div className="w-32 h-32 bg-slate-200 rounded-lg mx-auto flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-400" />
                  <span className="ml-2 text-slate-500 text-sm">QR Code</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">Scan to open memory</p>
              </div>
            )}
          </div>

          {/* Social Media Sharing */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Share Directly</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button 
                onClick={() => {
                  const url = generateShareLink()
                  const text = `Check out this memory: "${memory.title || 'A special moment'}"`
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank')
                }}
                className="flex items-center justify-center space-x-2 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Facebook className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Facebook</span>
              </button>
              <button 
                onClick={() => {
                  const url = generateShareLink()
                  const text = `Check out this memory: "${memory.title || 'A special moment'}"`
                  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank')
                }}
                className="flex items-center justify-center space-x-2 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Twitter className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Twitter</span>
              </button>
              <button 
                onClick={() => {
                  copyToClipboard()
                  setShowNotification(true)
                }}
                className="flex items-center justify-center space-x-2 p-3 border rounded-lg hover:bg-pink-50 hover:border-pink-300 transition-colors"
              >
                <Instagram className="w-4 h-4 text-pink-500" />
                <span className="text-sm">Instagram</span>
              </button>
              <button 
                onClick={() => {
                  const url = generateShareLink()
                  const subject = `Shared Memory: ${memory.title || 'A special moment'}`
                  const body = `I wanted to share this memory with you:\n\n"${memory.title || 'A special moment'}"\n\n${memory.textContent ? memory.textContent.substring(0, 200) + '...' : ''}\n\nView it here: ${url}`
                  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
                }}
                className="flex items-center justify-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-slate-600" />
                <span className="text-sm">Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-slate-500">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">View analytics will be available after sharing</span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                copyToClipboard()
                console.log('🔗 MEMORY SHARED:', {
                  memoryTitle: memory.title,
                  privacy,
                  permissions,
                  expiresIn,
                  shareLink: generateShareLink()
                })
              }}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium"
            >
              Share Memory
            </button>
          </div>
        </div>
      </div>

      {/* Instagram Copy Notification */}
      <NotificationModal
        isOpen={showNotification}
        type="success"
        title="Link Copied!"
        message="Your share link has been copied to clipboard. You can now paste it in your Instagram story or bio."
        onClose={() => setShowNotification(false)}
      />
    </div>
  )
}