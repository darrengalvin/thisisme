import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { promises as fs } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userInfo = await verifyToken(token)
    if (!userInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userInfo.userId)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { fixId, approvalType = 'manual' } = await request.json()
    
    // Fetch the fix plan
    const { data: fixRecord, error } = await supabase
      .from('ai_generated_fixes')
      .select('*')
      .eq('id', fixId)
      .single()

    if (error || !fixRecord) {
      return NextResponse.json({ error: 'Fix plan not found' }, { status: 404 })
    }

    const fixPlan = fixRecord.fix_plan

    // Safety checks
    const safetyChecks = await performSafetyChecks(fixPlan)
    if (!safetyChecks.passed) {
      return NextResponse.json({
        error: 'Safety checks failed',
        details: safetyChecks.issues,
        requiresManualReview: true
      }, { status: 400 })
    }

    // Create backup before applying changes
    const backupId = await createBackup(fixPlan.FILES_MODIFIED || [])
    
    try {
      // Apply the fix
      const results = await applyCodeChanges(fixPlan)
      
      // Run basic tests
      const testResults = await runBasicTests()
      
      if (testResults.passed) {
        // Update fix status
        await supabase
          .from('ai_generated_fixes')
          .update({
            status: 'applied',
            applied_at: new Date().toISOString(),
            applied_by: userInfo.userId,
            backup_id: backupId,
            test_results: testResults
          })
          .eq('id', fixId)

        // Update ticket status
        await supabase
          .from('tickets')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            stage: 'testing'
          })
          .eq('id', fixRecord.ticket_id)

        // Add comment to ticket
        await supabase
          .from('ticket_comments')
          .insert({
            ticket_id: fixRecord.ticket_id,
            user_id: userInfo.userId,
            comment: `🤖 AI-generated fix has been automatically applied!\n\nFix Details:\n${JSON.stringify(fixPlan.FIX_STRATEGY, null, 2)}\n\nFiles Modified: ${fixPlan.FILES_MODIFIED?.join(', ')}\n\nBackup ID: ${backupId}`,
            is_internal: false
          })

        return NextResponse.json({
          success: true,
          message: 'Fix applied successfully',
          backupId,
          testResults,
          appliedChanges: results.changes
        })
      } else {
        // Rollback on test failure
        await rollbackChanges(backupId)
        
        await supabase
          .from('ai_generated_fixes')
          .update({
            status: 'failed',
            error_details: testResults.errors
          })
          .eq('id', fixId)

        return NextResponse.json({
          error: 'Fix application failed tests and was rolled back',
          testResults,
          backupRestored: true
        }, { status: 400 })
      }

    } catch (applyError) {
      // Rollback on any error
      await rollbackChanges(backupId)
      throw applyError
    }

  } catch (error) {
    console.error('Error applying fix:', error)
    return NextResponse.json(
      { error: 'Failed to apply fix', details: error },
      { status: 500 }
    )
  }
}

async function performSafetyChecks(fixPlan: any) {
  const issues = []
  
  // Check for dangerous operations
  const dangerousPatterns = [
    'rm -rf', 'DROP TABLE', 'DELETE FROM', 'process.exit',
    'eval(', 'exec(', 'system('
  ]
  
  const codeChanges = JSON.stringify(fixPlan.CODE_CHANGES || {})
  for (const pattern of dangerousPatterns) {
    if (codeChanges.includes(pattern)) {
      issues.push(`Dangerous pattern detected: ${pattern}`)
    }
  }
  
  // Check file modification limits
  const filesToModify = fixPlan.FILES_MODIFIED || []
  if (filesToModify.length > 5) {
    issues.push(`Too many files to modify: ${filesToModify.length}`)
  }
  
  // Check for core system files
  const protectedFiles = [
    'package.json', 'next.config.js', '.env', 'prisma/schema.prisma'
  ]
  for (const file of filesToModify) {
    if (protectedFiles.some(protected => file.includes(protected))) {
      issues.push(`Attempting to modify protected file: ${file}`)
    }
  }
  
  return {
    passed: issues.length === 0,
    issues
  }
}

async function createBackup(files: string[]) {
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const backupDir = join(process.cwd(), '.ai-backups', backupId)
  
  await fs.mkdir(backupDir, { recursive: true })
  
  for (const file of files) {
    try {
      const sourcePath = join(process.cwd(), file)
      const backupPath = join(backupDir, file)
      
      // Create directory structure
      await fs.mkdir(join(backupPath, '..'), { recursive: true })
      
      // Copy file
      const content = await fs.readFile(sourcePath, 'utf-8')
      await fs.writeFile(backupPath, content, 'utf-8')
    } catch (error) {
      console.error(`Failed to backup ${file}:`, error)
    }
  }
  
  return backupId
}

async function applyCodeChanges(fixPlan: any) {
  const changes = []
  const codeChanges = fixPlan.CODE_CHANGES || {}
  
  for (const [filePath, modifications] of Object.entries(codeChanges)) {
    try {
      const fullPath = join(process.cwd(), filePath as string)
      let content = await fs.readFile(fullPath, 'utf-8')
      
      // Apply modifications (this would need more sophisticated logic)
      if (typeof modifications === 'string') {
        // Simple replacement for now
        content = modifications
      } else if (Array.isArray(modifications)) {
        // Apply array of changes
        for (const change of modifications) {
          if (change.type === 'replace' && change.find && change.replace) {
            content = content.replace(change.find, change.replace)
          }
        }
      }
      
      await fs.writeFile(fullPath, content, 'utf-8')
      changes.push(`Modified ${filePath}`)
    } catch (error) {
      throw new Error(`Failed to apply changes to ${filePath}: ${error}`)
    }
  }
  
  return { changes }
}

async function runBasicTests() {
  try {
    // Run TypeScript check
    const { stdout: tsCheck, stderr: tsError } = await execAsync('npx tsc --noEmit')
    
    if (tsError) {
      return {
        passed: false,
        errors: [`TypeScript errors: ${tsError}`]
      }
    }
    
    // Run linting
    const { stdout: lintCheck, stderr: lintError } = await execAsync('npm run lint')
    
    // Basic build test (commented out for safety)
    // const { stdout: buildCheck } = await execAsync('npm run build')
    
    return {
      passed: true,
      checks: ['TypeScript compilation', 'Linting'],
      details: { tsCheck, lintCheck }
    }
  } catch (error) {
    return {
      passed: false,
      errors: [`Test execution failed: ${error}`]
    }
  }
}

async function rollbackChanges(backupId: string) {
  const backupDir = join(process.cwd(), '.ai-backups', backupId)
  
  try {
    // Restore files from backup
    const files = await fs.readdir(backupDir, { recursive: true })
    
    for (const file of files) {
      const backupPath = join(backupDir, file as string)
      const targetPath = join(process.cwd(), file as string)
      
      const content = await fs.readFile(backupPath, 'utf-8')
      await fs.writeFile(targetPath, content, 'utf-8')
    }
    
    console.log(`Successfully rolled back changes using backup ${backupId}`)
  } catch (error) {
    console.error(`Failed to rollback changes:`, error)
  }
}
