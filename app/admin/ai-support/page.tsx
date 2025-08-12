import dynamic from 'next/dynamic'

const AISupportDashboard = dynamic(() => import('./AISupportDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading AI Support Dashboard...</p>
      </div>
    </div>
  )
})

export default function AISupportPage() {
  return <AISupportDashboard />
}