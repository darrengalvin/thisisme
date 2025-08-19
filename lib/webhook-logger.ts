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

export function getWebhookLogs() {
  return webhookLogs
}

export function clearWebhookLogs() {
  const clearedCount = webhookLogs.length
  webhookLogs = []
  console.log('🗑️ WEBHOOK LOGS CLEARED:', clearedCount, 'logs')
  return clearedCount
}
