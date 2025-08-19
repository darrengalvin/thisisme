import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory log storage (for debugging only)
let webhookLogs: any[] = []
const MAX_LOGS = 100

export function addWebhookLog(log: any) {
  const logEntry = {
    ...log,
    timestamp: new Date().toISOString(),
    id: Date.now() + Math.random() // Ensure unique IDs
  }
  
  webhookLogs.unshift(logEntry)
  
  // Keep only the latest logs
  if (webhookLogs.length > MAX_LOGS) {
    webhookLogs = webhookLogs.slice(0, MAX_LOGS)
  }
  
  console.log('📝 WEBHOOK LOG ADDED:', logEntry.type, logEntry.id)
}

export async function GET() {
  return NextResponse.json({
    logs: webhookLogs,
    count: webhookLogs.length,
    lastUpdate: new Date().toISOString()
  })
}

export async function DELETE() {
  const clearedCount = webhookLogs.length
  webhookLogs = []
  console.log('🗑️ WEBHOOK LOGS CLEARED:', clearedCount, 'logs')
  return NextResponse.json({ 
    success: true, 
    message: `Cleared ${clearedCount} logs` 
  })
}

// Add a log entry (for internal use)
export async function POST(request: NextRequest) {
  try {
    const logData = await request.json()
    addWebhookLog(logData)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid log data' }, { status: 400 })
  }
}
