'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BetaPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main app with beta parameter
    router.push('/?beta=true')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">🧪 Loading Beta Mode</h1>
        <p className="text-gray-600">Redirecting to beta features...</p>
      </div>
    </div>
  )
}
