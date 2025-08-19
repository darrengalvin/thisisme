import { createClient } from '@supabase/supabase-js'

// Simple in-memory log storage (for debugging only) + persistent storage
let webhookLogs: any[] = []
const MAX_LOGS = 100

// Initialize Supabase client for persistent logging
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function addWebhookLog(log: any) {
  const logEntry = {
    ...log,
    timestamp: new Date().toISOString(),
    id: Date.now() + Math.random(), // Ensure unique IDs
    sessionId: process.env.VERCEL_DEPLOYMENT_ID || 'local' // Track which deployment/session
  }
  
  // Add to in-memory storage (for immediate access)
  webhookLogs.unshift(logEntry)
  
  // Keep only the latest logs in memory
  if (webhookLogs.length > MAX_LOGS) {
    webhookLogs = webhookLogs.slice(0, MAX_LOGS)
  }
  
  console.log('📝 WEBHOOK LOG ADDED:', logEntry.type, logEntry.id, 'Session:', logEntry.sessionId)
  console.log('📝 TOTAL LOGS IN MEMORY:', webhookLogs.length)
  
  // Try to persist to database (don't block on failure)
  try {
    await supabase.from('webhook_logs').insert({
      type: logEntry.type,
      data: logEntry,
      created_at: logEntry.timestamp,
      session_id: logEntry.sessionId
    })
    console.log('📝 WEBHOOK LOG PERSISTED TO DB')
  } catch (error) {
    console.log('📝 WEBHOOK LOG DB SAVE FAILED (continuing):', error)
  }
}

export async function getWebhookLogs() {
  // Try to get from database first (more reliable)
  try {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_LOGS)
    
    if (data && !error) {
      console.log('📝 FETCHED', data.length, 'WEBHOOK LOGS FROM DB')
      return data.map(row => row.data)
    }
  } catch (error) {
    console.log('📝 DB FETCH FAILED, USING IN-MEMORY:', error)
  }
  
  // Fallback to in-memory logs
  console.log('📝 USING IN-MEMORY LOGS:', webhookLogs.length)
  return webhookLogs
}

export async function clearWebhookLogs() {
  // Clear in-memory
  const clearedCount = webhookLogs.length
  webhookLogs = []
  
  // Clear database
  try {
    await supabase.from('webhook_logs').delete().neq('id', 0) // Delete all
    console.log('🗑️ WEBHOOK LOGS CLEARED FROM DB AND MEMORY:', clearedCount, 'logs')
  } catch (error) {
    console.log('🗑️ WEBHOOK LOGS CLEARED FROM MEMORY ONLY:', clearedCount, 'logs')
  }
  
  return clearedCount
}
