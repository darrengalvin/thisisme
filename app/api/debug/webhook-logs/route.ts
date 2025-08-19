import { NextRequest, NextResponse } from 'next/server'
import { addWebhookLog, getWebhookLogs, clearWebhookLogs } from '@/lib/webhook-logger'

export async function GET() {
  const logs = await getWebhookLogs()
  return NextResponse.json({
    logs,
    count: logs.length,
    lastUpdate: new Date().toISOString()
  })
}

export async function DELETE() {
  const clearedCount = await clearWebhookLogs()
  return NextResponse.json({ 
    success: true, 
    message: `Cleared ${clearedCount} logs` 
  })
}

// Add a log entry (for internal use)
export async function POST(request: NextRequest) {
  try {
    const logData = await request.json()
    await addWebhookLog(logData)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Invalid log data' 
    }, { status: 400 })
  }
}
