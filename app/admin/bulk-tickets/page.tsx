'use client'

import { useState } from 'react'

const PRESET_TICKETS = [
  {
    title: "Memory Edit Modal: Can't scroll to save button",
    description: "The edit memory modal is too large for smaller screens and users cannot scroll down to reach the save button. The modal should be redesigned to fit on screen without requiring scrolling, or proper scrolling should be implemented.",
    priority: "high",
    category: "bug"
  },
    {
    title: "Replace view dropdown with toggle buttons",
    description: "The current view selection uses a dropdown menu. Users would prefer toggle buttons for easier view switching between different memory layouts (grid, timeline, feed, etc.).",
    priority: "medium",
    category: "improvement"
  },
  {
    title: "Chapter view memories not sorting chronologically",
    description: "In the chapter view, memories are not being sorted in chronological order. Users expect memories to be displayed from oldest to newest or with proper chronological organization.",
    priority: "high",
    category: "bug"
  },
  {
    title: "Prevent closing chapter without saving changes",
    description: "Users can close a chapter (using X button) without saving their changes, resulting in data loss. There should be a confirmation dialog or auto-save functionality to prevent accidental loss of unsaved work.",
    priority: "high",
    category: "bug"
  },
  {
    title: "Allow creating memories without requiring pictures",
    description: "The memory creation process currently requires a picture to be uploaded. Users should be able to create text-only memories without being forced to add images.",
    priority: "medium",
    category: "improvement"
  },
  {
    title: "Enable multiple picture uploads for memories",
    description: "Currently users can only upload one picture per memory. The system should support multiple image uploads so users can add several photos to a single memory entry.",
    priority: "medium",
    category: "improvement"
  },
  {
    title: "Restore/implement dictation feature",
    description: "The dictation feature for voice-to-text memory creation is not available. This feature should be implemented or restored to allow users to create memories using voice input.",
    priority: "medium",
    category: "feature"
  }
]

export default function BulkTicketsPage() {
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<string[]>([])

  const createTickets = async () => {
    setCreating(true)
    setResults([])
    
    try {
      // First, check what tickets already exist
      const existingResponse = await fetch('/api/support/tickets', {
        credentials: 'include'
      })
      
      let existingTitles = new Set()
      if (existingResponse.ok) {
        const existingData = await existingResponse.json()
        existingTitles = new Set(existingData.tickets?.map((t: any) => t.title) || [])
      }
      
      for (const ticket of PRESET_TICKETS) {
        try {
          // Skip if ticket already exists
          if (existingTitles.has(ticket.title)) {
            setResults(prev => [...prev, `⏭️ Skipped: ${ticket.title} (already exists)`])
            continue
          }
          
          const response = await fetch('/api/support/tickets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(ticket)
          })
          
          if (response.ok) {
            const data = await response.json()
            setResults(prev => [...prev, `✅ Created: ${ticket.title} (ID: ${data.ticket.id})`])
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            setResults(prev => [...prev, `❌ Failed: ${ticket.title} - ${errorData.error || 'Unknown error'}`])
          }
        } catch (error) {
          setResults(prev => [...prev, `❌ Error: ${ticket.title} - ${error}`])
        }
      }
    } catch (error) {
      console.error('Bulk creation failed:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Bulk Create Support Tickets</h1>
      
      <div className="mb-8">
        <p className="text-gray-600 mb-4">
          This page will create {PRESET_TICKETS.length} support tickets for the reported issues.
        </p>
        
        <button
          onClick={createTickets}
          disabled={creating}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded"
        >
          {creating ? 'Creating Tickets...' : 'Create All Tickets'}
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tickets to Create:</h2>
        <div className="space-y-4">
          {PRESET_TICKETS.map((ticket, index) => (
            <div key={index} className="border p-4 rounded">
              <h3 className="font-semibold">{ticket.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
              <div className="flex gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                  ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {ticket.priority}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                  {ticket.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Results:</h2>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-2 rounded ${
                  result.startsWith('✅') ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
