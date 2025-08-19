'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import VoiceChatButton from '@/components/VoiceChatButton'

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
  results?: any[]
  toolCalls?: any[]
}

interface ConversationMessage {
  id: string
  timestamp: string
  type: 'user' | 'assistant' | 'tool_call' | 'tool_response'
  content: string
  toolName?: string
  toolArgs?: any
  toolResult?: string
  status?: 'pending' | 'completed' | 'error'
}

export default function DebugVAPIPage() {
  const { user } = useAuth()
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  
  // Webhook monitoring state
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState<'voice' | 'tools' | 'webhooks' | 'conversation'>('voice')
  const [callStatus, setCallStatus] = useState<'idle' | 'starting' | 'active' | 'ending'>('idle')
  const [realTimeLogs, setRealTimeLogs] = useState<string[]>([])
  const [showRealTimeLogs, setShowRealTimeLogs] = useState(true)
  const [conversationThread, setConversationThread] = useState<ConversationMessage[]>([])
  const [toolCallHistory, setToolCallHistory] = useState<any[]>([])

  // Fetch webhook logs
  const fetchWebhookLogs = async () => {
    try {
      const response = await fetch('/api/debug/webhook-logs')
      const data = await response.json()
      const logs = data.logs || []
      
      // Only update if logs actually changed to prevent flashing
      setWebhookLogs(prevLogs => {
        const prevString = JSON.stringify(prevLogs.map((l: any) => l.id))
        const newString = JSON.stringify(logs.map((l: any) => l.id))
        return prevString !== newString ? logs : prevLogs
      })
      
      // Build conversation thread from webhook logs
      updateConversationThread(logs)
      updateToolCallHistory(logs)
      
      // Update call status based on recent webhook activity
      const recentLogs = logs.slice(0, 5) // Check last 5 logs
      const hasRecentActivity = recentLogs.some((log: WebhookLog) => {
        const logTime = new Date(log.timestamp).getTime()
        const now = new Date().getTime()
        return (now - logTime) < 30000 // Within last 30 seconds
      })
      
      if (hasRecentActivity) {
        setCallStatus('active')
      } else if (logs.length > 0) {
        // Has logs but no recent activity
        setCallStatus('idle')
      }
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error)
    }
  }

  // Auto-refresh webhook logs (less aggressive)
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchWebhookLogs, 3000) // Refresh every 3 seconds instead of 1
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Initial load
  useEffect(() => {
    fetchWebhookLogs()
  }, [])

  // Capture console logs in real-time
  useEffect(() => {
    if (!showRealTimeLogs) return

    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    const addRealTimeLog = (level: string, ...args: any[]) => {
      const timestamp = new Date().toLocaleTimeString()
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      
      setRealTimeLogs(prev => [
        `[${timestamp}] ${level}: ${message}`,
        ...prev.slice(0, 49) // Keep last 50 logs
      ])
    }

    console.log = (...args) => {
      originalConsoleLog(...args)
      if (args.some(arg => String(arg).includes('🎤') || String(arg).includes('VAPI'))) {
        addRealTimeLog('LOG', ...args)
      }
    }

    console.error = (...args) => {
      originalConsoleError(...args)
      if (args.some(arg => String(arg).includes('🎤') || String(arg).includes('VAPI'))) {
        addRealTimeLog('ERROR', ...args)
      }
    }

    console.warn = (...args) => {
      originalConsoleWarn(...args)
      if (args.some(arg => String(arg).includes('🎤') || String(arg).includes('VAPI'))) {
        addRealTimeLog('WARN', ...args)
      }
    }

    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }, [showRealTimeLogs])

  // Build conversation thread from webhook logs
  const updateConversationThread = (logs: WebhookLog[]) => {
    const messages: ConversationMessage[] = []
    
    logs.forEach(log => {
      if (log.type === 'webhook_body' && log.body?.message?.type === 'tool-calls') {
        const toolCalls = log.body.message.toolCallList || []
        toolCalls.forEach((tool: any) => {
          messages.push({
            id: `tool-call-${tool.id}`,
            timestamp: log.timestamp,
            type: 'tool_call',
            content: `Maya is calling: ${tool.name}`,
            toolName: tool.name,
            toolArgs: tool.arguments,
            status: 'pending'
          })
        })
      }
      
      if (log.type === 'tool_call_response' && log.results) {
        log.results.forEach((result: any, idx: number) => {
          const toolCall = log.toolCalls?.[idx]
          messages.push({
            id: `tool-response-${result.toolCallId}`,
            timestamp: log.timestamp,
            type: 'tool_response',
            content: `${toolCall?.name || 'Tool'} completed`,
            toolName: toolCall?.name,
            toolResult: result.result,
            status: 'completed'
          })
        })
      }
    })
    
    // Sort by timestamp and keep latest 20
    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setConversationThread(messages.slice(0, 20))
  }

  // Update tool call history
  const updateToolCallHistory = (logs: WebhookLog[]) => {
    const toolCalls: any[] = []
    
    logs.forEach(log => {
      if (log.type === 'webhook_body' && log.body?.message?.type === 'tool-calls') {
        const calls = log.body.message.toolCallList || []
        calls.forEach((tool: any) => {
          // Find corresponding response
          const responseLog = logs.find(l => 
            l.type === 'tool_call_response' && 
            l.results?.some((r: any) => r.toolCallId === tool.id)
          )
          
          const response = responseLog?.results?.find((r: any) => r.toolCallId === tool.id)
          
          toolCalls.push({
            id: tool.id,
            name: tool.name,
            arguments: tool.arguments,
            timestamp: log.timestamp,
            result: response?.result,
            status: response ? 'completed' : 'pending',
            duration: responseLog ? 
              new Date(responseLog.timestamp).getTime() - new Date(log.timestamp).getTime() : 
              null
          })
        })
      }
    })
    
    // Sort by timestamp (newest first)
    toolCalls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setToolCallHistory(toolCalls.slice(0, 10))
  }

  const testWebhookReachability = async () => {
    setIsLoading(true)
    setLogs(prev => [...prev, `🌐 Testing webhook reachability...`])

    try {
      const response = await fetch('/api/debug/test-webhook-reachable')
      const result = await response.json()
      setTestResult(result)
      
      if (result.reachable) {
        setLogs(prev => [...prev, `✅ Webhook is reachable! VAPI should be able to call it.`])
      } else {
        setLogs(prev => [...prev, `❌ Webhook NOT reachable! This is why Maya can't call tools.`])
        setLogs(prev => [...prev, `🔧 Error: ${result.error || 'Unknown error'}`])
      }

    } catch (error) {
      setLogs(prev => [...prev, `❌ Webhook test failed: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setIsLoading(false)
    }
  }

  const testTool = async (toolName: string) => {
    if (!user) {
      alert('Please log in first')
      return
    }

    setIsLoading(true)
    setLogs(prev => [...prev, `🔧 Testing tool: ${toolName} for user: ${user.id}`])

    try {
      const response = await fetch('/api/debug/test-vapi-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName,
          userId: user.id
        })
      })

      const result = await response.json()
      setTestResult(result)
      setLogs(prev => [...prev, `✅ Tool test completed: ${JSON.stringify(result, null, 2)}`])

    } catch (error) {
      setLogs(prev => [...prev, `❌ Tool test failed: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setIsLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setTestResult(null)
  }

  const clearWebhookLogs = async () => {
    try {
      await fetch('/api/debug/webhook-logs', { method: 'DELETE' })
      setWebhookLogs([])
    } catch (error) {
      console.error('Failed to clear webhook logs:', error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'webhook_received': return 'bg-blue-100 text-blue-800'
      case 'webhook_body': return 'bg-indigo-100 text-indigo-800'
      case 'tool_call_response': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHumanDescription = (log: WebhookLog) => {
    if (log.type === 'webhook_received') {
      return '📞 Maya is calling our backend'
    }
    
    if (log.type === 'webhook_body' && log.body?.message?.type === 'tool-calls') {
      const tools = log.body.message.toolCallList || []
      if (tools.length > 0) {
        const toolNames = tools.map((t: any) => t.name).join(', ')
        return `🔧 Maya wants to use tools: ${toolNames}`
      }
      return '🔧 Maya is trying to use tools'
    }
    
    if (log.type === 'tool_call_response' && log.results) {
      const toolCount = log.results.length
      return `✅ Sent ${toolCount} tool result${toolCount > 1 ? 's' : ''} back to Maya`
    }
    
    if (log.type === 'error') {
      return '❌ Something went wrong'
    }
    
    return log.type
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🔧 VAPI Debug Center</h1>
        <p>Please log in to access the debug tools.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🔧 VAPI Debug Center</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded text-sm ${autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}
          >
            {autoRefresh ? '🔄 Auto-refresh' : '⏸️ Paused'}
          </button>
                      <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Webhooks: {webhookLogs.length}
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  callStatus === 'active' ? 'bg-green-500 animate-pulse' : 
                  callStatus === 'starting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-gray-400'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {callStatus === 'active' ? '🎤 Call Active' : 
                   callStatus === 'starting' ? '⏳ Starting...' : 
                   '💤 No Call'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                v{Date.now().toString().slice(-6)} {/* Deployment indicator */}
              </span>
            </div>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold mb-1">User: {user.email}</h2>
            <p className="text-sm text-gray-600">ID: {user.id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {autoRefresh && '🔄 Live monitoring active'}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'voice' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🎤 Voice Chat & Monitor
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tools' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔧 Test Tools
        </button>
        <button
          onClick={() => setActiveTab('conversation')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'conversation' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          💬 Conversation Flow
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'webhooks' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📡 Webhook Details
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Voice Chat */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🎤 Voice Chat with Maya</h2>
            <VoiceChatButton />
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">🎯 Test Instructions</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li><strong>Click the big blue "Start Voice Chat with Maya" button above</strong></li>
                <li>Watch the real-time logs and webhook monitor</li>
                <li>Say: "Hi Maya, tell me about myself"</li>
                <li>Maya should automatically call get-user-context</li>
                <li>If she says "having trouble", check the logs for errors</li>
              </ol>
            </div>
            
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold mb-2">✅ What Success Looks Like</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>You'll see "📞 Maya is calling our backend"</li>
                <li>Then "🔧 Maya wants to use tools: get-user-context"</li>
                <li>Finally "✅ Sent 1 tool result back to Maya"</li>
                <li>Maya will greet you by name and know your details!</li>
              </ul>
            </div>
          </div>

          {/* Real-Time Console Logs */}
          <div className="bg-black text-green-400 p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-white">🔍 Real-Time Logs</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRealTimeLogs(!showRealTimeLogs)}
                  className={`px-2 py-1 rounded text-xs ${
                    showRealTimeLogs ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  {showRealTimeLogs ? '🟢 ON' : '⚪ OFF'}
                </button>
                <button
                  onClick={() => setRealTimeLogs([])}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="font-mono text-xs max-h-80 overflow-auto">
              {realTimeLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  <p>No VAPI logs yet</p>
                  <p>Start voice chat to see real-time activity</p>
                </div>
              ) : (
                realTimeLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`mb-1 ${
                      log.includes('ERROR') ? 'text-red-400' : 
                      log.includes('WARN') ? 'text-yellow-400' : 
                      'text-green-400'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Webhook Monitor */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">📡 Live Webhook Activity</h2>
              <div className="flex gap-2">
                <div className={`px-2 py-1 rounded text-xs ${
                  webhookLogs.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {webhookLogs.length > 0 ? '🟢 ACTIVE' : '⚪ WAITING'}
                </div>
                <button
                  onClick={fetchWebhookLogs}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 rounded text-sm ${autoRefresh ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                >
                  {autoRefresh ? '⏸️ Pause' : '▶️ Resume'}
                </button>
                <button
                  onClick={clearWebhookLogs}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="max-h-96 overflow-auto border rounded">
              {webhookLogs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No webhook activity yet</p>
                  <p className="text-sm">Start voice chat to see Maya's tool calls</p>
                </div>
              ) : (
                <div className="divide-y">
                  {webhookLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.type)}`}>
                            {log.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Human-readable description */}
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-800">
                          {getHumanDescription(log)}
                        </p>
                      </div>
                      
                      {log.type === 'tool_call_response' && log.results && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-green-600 mb-1">
                            📤 Data sent to Maya:
                          </p>
                          {log.results.map((result: any, idx: number) => (
                            <div key={idx} className="text-xs bg-green-50 p-2 rounded mt-1">
                              <strong>Tool:</strong> {log.toolCalls?.[idx]?.name}<br/>
                              <strong>Preview:</strong> {result.result.substring(0, 80)}...
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {log.body && log.body.message?.type === 'tool-calls' && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-blue-600 mb-1">
                            🔧 Tools Maya requested:
                          </p>
                          {log.body.message.toolCallList?.map((tool: any, idx: number) => (
                            <div key={idx} className="text-xs bg-blue-50 p-2 rounded mt-1">
                              <strong>{tool.name}</strong>
                              {tool.arguments && (
                                <div className="mt-1 text-gray-600">
                                  Args: {JSON.stringify(tool.arguments).substring(0, 50)}...
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tool Testing */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🔧 Test Tools Directly</h2>
            
            <div className="space-y-3">
              <button
                onClick={testWebhookReachability}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : '🌐 Test Webhook Reachability'}
              </button>
              
              <button
                onClick={() => testTool('get-user-context')}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test get-user-context'}
              </button>
              
              <button
                onClick={() => testTool('search-memories')}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test search-memories'}
              </button>
              
              <button
                onClick={() => testTool('save-memory')}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test save-memory'}
              </button>
              
              <button
                onClick={() => testTool('create-chapter')}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test create-chapter'}
              </button>
            </div>

            <button
              onClick={clearLogs}
              className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>

          {/* Results */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {testResult && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Latest Result:</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Debug Logs */}
            <div className="mt-4 bg-black text-green-400 p-3 rounded-lg">
              <h3 className="text-sm font-semibold mb-2">Debug Logs</h3>
              <div className="font-mono text-xs max-h-40 overflow-auto">
                {logs.length === 0 ? (
                  <p>No logs yet. Test a tool to see debug output.</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">📡 Detailed Webhook Logs</h2>
              <div className="flex gap-2">
                <button
                  onClick={fetchWebhookLogs}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={clearWebhookLogs}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Total logs: {webhookLogs.length} | Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </p>
          </div>

          <div className="max-h-96 overflow-auto">
            {webhookLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg">No webhook calls yet</p>
                <p className="text-sm">Start a voice chat with Maya to see activity here</p>
              </div>
            ) : (
              <div className="divide-y">
                {webhookLogs.map((log) => (
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

                    {log.results && (
                      <details className="mb-2">
                        <summary className="text-sm font-medium cursor-pointer text-green-600">
                          📤 Tool Results
                        </summary>
                        <pre className="mt-2 bg-green-50 p-3 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(log.results, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'conversation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversation Thread */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">💬 Conversation Thread</h2>
              <div className="text-sm text-gray-500">
                {conversationThread.length} messages
              </div>
            </div>
            
            <div className="max-h-96 overflow-auto space-y-3">
              {conversationThread.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No conversation activity yet</p>
                  <p className="text-sm">Start a voice chat to see the conversation flow</p>
                </div>
              ) : (
                conversationThread.map((message) => (
                  <div key={message.id} className={`p-3 rounded-lg ${
                    message.type === 'tool_call' ? 'bg-blue-50 border-l-4 border-blue-400' :
                    message.type === 'tool_response' ? 'bg-green-50 border-l-4 border-green-400' :
                    'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          message.type === 'tool_call' ? 'bg-blue-100 text-blue-800' :
                          message.type === 'tool_response' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {message.type === 'tool_call' ? '🔧 Tool Call' :
                           message.type === 'tool_response' ? '✅ Tool Response' :
                           message.type}
                        </span>
                        {message.toolName && (
                          <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                            {message.toolName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      {message.content}
                    </p>
                    
                    {message.toolArgs && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">Arguments</summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(message.toolArgs, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {message.toolResult && (
                      <div className="mt-2">
                        <p className="text-xs text-green-600 font-medium mb-1">Result:</p>
                        <div className="text-xs bg-green-50 p-2 rounded border">
                          {message.toolResult.length > 200 ? 
                            `${message.toolResult.substring(0, 200)}...` : 
                            message.toolResult
                          }
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tool Call History */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">🔧 Tool Call History</h2>
              <div className="text-sm text-gray-500">
                {toolCallHistory.length} calls
              </div>
            </div>
            
            <div className="max-h-96 overflow-auto space-y-3">
              {toolCallHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No tool calls yet</p>
                  <p className="text-sm">Maya will call tools as she helps you</p>
                </div>
              ) : (
                toolCallHistory.map((call) => (
                  <div key={call.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {call.name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          call.status === 'completed' ? 'bg-green-100 text-green-800' :
                          call.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {call.status === 'completed' ? '✅ Completed' :
                           call.status === 'pending' ? '⏳ Pending' :
                           '❌ Error'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(call.timestamp)}
                        {call.duration && (
                          <span className="ml-2">({call.duration}ms)</span>
                        )}
                      </div>
                    </div>
                    
                    {call.arguments && Object.keys(call.arguments).length > 0 && (
                      <details className="mb-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">Arguments</summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-20">
                          {JSON.stringify(call.arguments, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {call.result && (
                      <div className="mt-2">
                        <p className="text-xs text-green-600 font-medium mb-1">Result Preview:</p>
                        <div className="text-xs bg-green-50 p-2 rounded border max-h-16 overflow-auto">
                          {call.result.length > 150 ? 
                            `${call.result.substring(0, 150)}...` : 
                            call.result
                          }
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
