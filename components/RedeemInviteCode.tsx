'use client'

import { useState } from 'react'
import { Ticket, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/components/AuthProvider'

interface RedeemInviteCodeProps {
  onSuccess?: () => void
  className?: string
}

export default function RedeemInviteCode({ onSuccess, className = '' }: RedeemInviteCodeProps) {
  const { user } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [showInput, setShowInput] = useState(false)

  const handleRedeem = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code')
      return
    }

    if (!user) {
      toast.error('Please sign in to redeem an invite code')
      return
    }

    setIsRedeeming(true)

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) {
        toast.error('Authentication required. Please sign in.')
        return
      }

      const response = await fetch('/api/auth/redeem-invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim()
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(data.message || 'Invitation redeemed successfully!')
        setInviteCode('')
        setShowInput(false)
        onSuccess?.()
      } else {
        toast.error(data.error || 'Failed to redeem invite code')
      }
    } catch (error) {
      console.error('Error redeeming invite:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsRedeeming(false)
    }
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition-colors ${className}`}
      >
        <Ticket size={18} />
        <span>Have an invite code?</span>
      </button>
    )
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Ticket size={18} className="text-sky-600" />
        <h3 className="font-semibold text-slate-900">Redeem Invite Code</h3>
      </div>
      
      <p className="text-sm text-slate-600 mb-3">
        Enter the invite code you received to join shared chapters
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && handleRedeem()}
          placeholder="XXXX-XXXX"
          maxLength={16}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm uppercase"
          disabled={isRedeeming}
        />
        <button
          onClick={handleRedeem}
          disabled={isRedeeming || !inviteCode.trim()}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRedeeming ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Redeeming...</span>
            </>
          ) : (
            <>
              <Check size={18} />
              <span>Redeem</span>
            </>
          )}
        </button>
        <button
          onClick={() => {
            setShowInput(false)
            setInviteCode('')
          }}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          disabled={isRedeeming}
        >
          <X size={18} />
        </button>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Invite codes are 8 characters long and case-insensitive
      </p>
    </div>
  )
}

