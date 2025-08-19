'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'

interface WebhookLog {
  id: string
  timestamp: string
  type: string
  url?: string
  method?: string
  body?: any
  response?: any
  status?: string
  duration?: number
}

export default function WebhookMonitorPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch webhook logs
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/debug/webhook-logs')
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  // Auto-refresh logs
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 1000) // Refresh every second
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Initial load
  useEffect(() => {
    fetchLogs()
  }, [])

  const clearLogs = async () => {
    try {
      await fetch('/api/debug/webhook-logs', { method: 'DELETE' })
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'webhook_received': return 'bg-blue-100 text-blue-800'
      case 'tool_call': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'response': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🔍 Webhook Monitor</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded ${autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Refresh Now
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      {user && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Monitoring for User</h2>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p className="text-sm text-gray-600 mt-2">
            Start a voice chat with Maya and watch for webhook calls here in real-time!
          </p>
        </div>
      )}

      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">🎤 How to Test</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Keep this page open</li>
          <li>Go to the voice chat page and start talking to Maya</li>
          <li>Tell Maya: "Use the get-user-context tool to learn about me"</li>
          <li>Watch this page for webhook calls in real-time</li>
          <li>If no webhooks appear, Maya isn't calling tools</li>
        </ol>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">
            Live Webhook Activity ({logs.length} calls)
          </h2>
          {autoRefresh && (
            <p className="text-sm text-green-600">🔄 Auto-refreshing every second</p>
          )}
        </div>

        <div className="max-h-96 overflow-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">No webhook calls yet</p>
              <p className="text-sm">Start a voice chat with Maya to see activity here</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.type)}`}>
                        {log.type}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {log.method && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.method}
                        </span>
                      )}
                    </div>
                    {log.duration && (
                      <span className="text-xs text-gray-500">
                        {log.duration}ms
                      </span>
                    )}
                  </div>

                  {log.url && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">URL: </span>
                      <span className="text-xs font-mono bg-gray-100 px-1 rounded">
                        {log.url}
                      </span>
                    </div>
                  )}

                  {log.body && (
                    <details className="mb-2">
                      <summary className="text-sm font-medium cursor-pointer text-blue-600">
                        📥 Request Body
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(log.body, null, 2)}
                      </pre>
                    </details>
                  )}

                  {log.response && (
                    <details className="mb-2">
                      <summary className="text-sm font-medium cursor-pointer text-green-600">
                        📤 Response
                      </summary>
                      <pre className="mt-2 bg-green-50 p-3 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(log.response, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
