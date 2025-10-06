'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Sparkles, Loader2, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import toast from 'react-hot-toast'

interface Message {
  role: 'maya' | 'user'
  content: string
  type?: 'text' | 'location' | 'image' | 'weaving' | 'chapter' | 'tool_info'
  metadata?: any
}

interface MayaEnrichmentChatProps {
  isOpen: boolean
  onClose: () => void
  memoryTitle: string
  memoryDescription: string
  onMemoryUpdate: (newDescription: string) => void
}

export default function MayaEnrichmentChat({
  isOpen,
  onClose,
  memoryTitle,
  memoryDescription,
  onMemoryUpdate
}: MayaEnrichmentChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = useState(0)
  const [currentMemory, setCurrentMemory] = useState(memoryDescription)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Initialize conversation
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startConversation()
    }
  }, [isOpen])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startConversation = async () => {
    setIsTyping(true)
    
    try {
      const response = await fetch('/api/maya/start-enrichment-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          memory_title: memoryTitle,
          memory_description: memoryDescription
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessages([{
          role: 'maya',
          content: data.greeting,
          type: 'text'
        }])
        setEnrichmentProgress(data.initial_progress || 20)
      }
    } catch (error) {
      console.error('Failed to start chat:', error)
      setMessages([{
        role: 'maya',
        content: "Hi! I'm Maya 💜 I'm here to help you enrich this memory. Tell me more about what you remember - emotions, people, places, sensory details!",
        type: 'text'
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const response = await fetch('/api/maya/enrich-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          memory_title: memoryTitle,
          current_memory: currentMemory,
          user_message: input,
          conversation_history: messages
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update memory if enriched
        if (data.enriched_memory) {
          setCurrentMemory(data.enriched_memory)
          onMemoryUpdate(data.enriched_memory)
        }

        // Update progress
        if (data.progress) {
          setEnrichmentProgress(data.progress)
        }

        // Show tool information first
        const toolMessages: Message[] = []
        
        // Location info
        if (data.location_info) {
          toolMessages.push({
            role: 'maya',
            content: data.location_info.description || `Found info about ${data.location_info.name}`,
            type: 'location',
            metadata: data.location_info
          })
        }

        // Web context
        if (data.web_context) {
          toolMessages.push({
            role: 'maya',
            content: `🌐 Historical Context: ${data.web_context.substring(0, 150)}...`,
            type: 'tool_info'
          })
        }

        // Chapter suggestion
        if (data.chapter_suggestion) {
          toolMessages.push({
            role: 'maya',
            content: `📖 This memory might belong in a chapter called "${data.chapter_suggestion.title}" - would you like me to add it there?`,
            type: 'chapter',
            metadata: data.chapter_suggestion
          })
        }

        // Add tool messages first
        if (toolMessages.length > 0) {
          setMessages(prev => [...prev, ...toolMessages])
        }

        // Add Maya's response
        const mayaMessage: Message = {
          role: 'maya',
          content: data.maya_response,
          type: 'text'
        }
        setMessages(prev => [...prev, mayaMessage])

        // Show weaving indicator
        if (data.enriched_memory) {
          setMessages(prev => [...prev, {
            role: 'maya',
            content: '✨ I\'ve woven your answer into the memory!',
            type: 'weaving'
          }])
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message')
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Enriching with Maya</h2>
              <p className="text-xs text-slate-600">AI Memory Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Split View */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Chat Panel */}
          <div className="w-1/2 border-r border-slate-200 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'maya' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 mr-2">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-slate-800 text-white'
                        : msg.type === 'weaving'
                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-sm italic'
                        : msg.type === 'location'
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 text-blue-900'
                        : msg.type === 'chapter'
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-900'
                        : msg.type === 'tool_info'
                        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 text-amber-900'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.type === 'location' && msg.metadata?.image && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        <img src={msg.metadata.image} alt="Location" className="w-full" />
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.type === 'chapter' && msg.metadata && (
                      <button 
                        className="mt-2 px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors"
                        onClick={() => toast.success('Chapter creation feature coming soon!')}
                      >
                        Create Chapter
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 mr-2">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <div className="flex gap-2">
                <textarea
                  ref={chatInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer or details..."
                  className="flex-1 p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
                  className="px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Memory Preview Panel */}
          <div className="w-1/2 flex flex-col bg-slate-50">
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-semibold text-slate-900 mb-2">Your Memory (Live)</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${enrichmentProgress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-purple-600">{enrichmentProgress}%</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <h4 className="text-lg font-semibold text-slate-900 mb-3">{memoryTitle}</h4>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{currentMemory}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={() => {
                  onMemoryUpdate(currentMemory)
                  toast.success('Memory enriched! ✨')
                  onClose()
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Done Enriching
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
