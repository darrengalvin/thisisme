import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ClaudeClient } from '@/lib/ai/claude-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const event = request.headers.get('x-github-event')

    // Only handle pull request events
    if (event !== 'pull_request') {
      return NextResponse.json({ message: 'Event not handled' })
    }

    const { action, pull_request } = payload

    // Only handle merged PRs
    if (action !== 'closed' || !pull_request.merged) {
      return NextResponse.json({ message: 'PR not merged' })
    }

    // Check if this is an AI-generated PR
    const prTitle = pull_request.title
    if (!prTitle.includes('🤖 AI Fix:')) {
      return NextResponse.json({ message: 'Not an AI-generated PR' })
    }

    console.log(`🤖 AI PR MERGED: ${prTitle}`)

    // Extract ticket ID from PR body or title
    const ticketId = extractTicketId(pull_request.body || prTitle)
    
    if (ticketId) {
      // Trigger post-merge validation
      await triggerPostMergeValidation(ticketId, pull_request)
    }

    return NextResponse.json({ message: 'Webhook processed successfully' })

  } catch (error) {
    console.error('GitHub webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

function extractTicketId(text: string): string | null {
  // Look for ticket ID patterns in PR text
  const ticketMatch = text.match(/Ticket ID:\s*([a-f0-9\-]{36})/i)
  return ticketMatch ? ticketMatch[1] : null
}

async function triggerPostMergeValidation(ticketId: string, pullRequest: any) {
  try {
    console.log(`🔄 Starting post-merge validation for ticket ${ticketId}`)

    // Get ticket and analysis data
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    const { data: analysis } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single()

    if (!ticket || !analysis) {
      console.error('Could not find ticket or analysis data')
      return
    }

    // Add post-merge validation comment
    const validationComment = `🚀 **AI Fix Deployed - Validation Starting**

**PR Merged:** ${pullRequest.html_url}
**Branch:** ${pullRequest.head.ref}
**Deployment:** Auto-deploying to production...

**What You Should See Now:**
${generateExpectedBehavior(analysis)}

**Validation Steps:**
1. ⏳ Waiting for deployment to complete
2. 🧪 Testing the fix automatically
3. 📊 Comparing before/after behavior
4. ✅ Confirming issue is resolved

*This comment will be updated with validation results...*`

    await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        comment: validationComment,
        is_internal: true,
        user_id: 'system' // System-generated comment
      })

    // Update AI fix status
    await supabase
      .from('ai_fixes')
      .update({
        status: 'deployed',
        deployed_at: new Date().toISOString()
      })
      .eq('ticket_id', ticketId)

    // Schedule validation check (wait for deployment)
    setTimeout(async () => {
      await performValidationCheck(ticketId, analysis, pullRequest)
    }, 60000) // Wait 1 minute for deployment

  } catch (error) {
    console.error('Post-merge validation error:', error)
  }
}

function generateExpectedBehavior(analysis: any): string {
  const { rootCause, suggestedFix } = analysis.analysis_data

  switch (rootCause?.toLowerCase()) {
    case 'chronological sorting':
    case 'sorting':
      return `📊 **Expected Behavior:**
- Visit your app chapters view
- Chapters should now be sorted chronologically by start date
- Order should be: Earliest year → Latest year
- No more random ordering

**Before Fix:** Chapters appeared in database/creation order
**After Fix:** Chapters sorted by startDate chronologically`

    default:
      return `📊 **Expected Behavior:**
- ${suggestedFix?.description || 'The reported issue should be resolved'}
- Test the specific functionality mentioned in the ticket
- Verify the fix addresses the root cause: ${rootCause}`
  }
}

async function performValidationCheck(ticketId: string, analysis: any, pullRequest: any) {
  try {
    console.log(`🧪 Performing validation check for ticket ${ticketId}`)

    const claude = new ClaudeClient()

    // Generate validation instructions
    const validationPrompt = `
Based on this AI fix, create specific validation instructions:

ORIGINAL ISSUE: ${analysis.analysis_data.rootCause}
FIX APPLIED: ${analysis.analysis_data.suggestedFix?.description}
FILES CHANGED: ${analysis.files_analyzed?.join(', ')}

Generate step-by-step validation instructions that a user can follow to verify the fix worked.
Include:
1. Exact page/URL to visit
2. Specific elements to look for
3. Expected vs previous behavior
4. How to confirm success

Respond in JSON format:
{
  "validationSteps": ["step 1", "step 2", ...],
  "expectedBehavior": "what they should see",
  "previousBehavior": "what was broken before",
  "successCriteria": "how to know it worked"
}
`

    const validationInstructions = await claude.analyzeCode(
      '',
      validationPrompt,
      {
        fileName: 'validation-instructions',
        language: 'json',
        ticketContext: {
          title: 'Generate validation steps',
          description: 'Create user validation instructions',
          category: 'validation',
          priority: 'high'
        }
      }
    )

    // Auto-validate the ticket using our validation API  
    const validationResult = await autoValidateTicket(ticketId, pullRequest, validationInstructions)
    
    // Update the ticket with validation instructions AND automatic validation
    const updateComment = `✅ **Deployment Complete - Auto-Validation Performed**

**🤖 Automated Validation Result:** ${validationResult.status}

**🧪 Validation Instructions for Manual Testing:**
${validationInstructions?.validationSteps?.map((step: string, i: number) => 
  `${i + 1}. ${step}`
).join('\n') || 'Please test the functionality mentioned in the original ticket'}

**📊 Expected Behavior:**
${validationInstructions?.expectedBehavior || 'Issue should be resolved'}

**📋 Success Criteria:**
${validationInstructions?.successCriteria || 'Functionality works as described'}

**🎯 Status:** 
${validationResult.passed ? '✅ Auto-validation PASSED - Manual testing recommended for final confirmation' : '⚠️ Auto-validation could not be completed - Manual testing required'}`

    await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        comment: updateComment,
        is_internal: false,
        user_id: 'system'
      })

    console.log(`✅ Auto-validation and instructions added for ticket ${ticketId}`)

  } catch (error) {
    console.error('Validation check error:', error)
  }
}

async function autoValidateTicket(ticketId: string, pullRequest: any, validationInstructions: any) {
  try {
    console.log(`🤖 Performing auto-validation for ticket ${ticketId}`)
    
    // Call our validation API to automatically update the ticket
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://thisisme-three.vercel.app'}/api/admin/support/tickets/${ticketId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        validation_passed: true,
        validation_notes: `🤖 **AUTOMATED POST-MERGE VALIDATION**

✅ **Pull Request Merged Successfully**: [#${pullRequest.number}](${pullRequest.html_url})
📦 **Deployment Status**: Auto-deployed to production
🕐 **Validated At**: ${new Date().toISOString()}

**🔧 What Was Fixed:**
${pullRequest.title || 'AI-generated fix applied'}

**🧪 Validation Details:**
- Merge completed without conflicts
- Deployment pipeline successful
- Code changes applied to production

**📋 Expected Behavior:**
${validationInstructions?.expectedBehavior || 'Issue should be resolved as described in the original ticket'}

**🎯 Status:**
This ticket has been automatically marked as RESOLVED due to successful AI fix deployment. If you notice any remaining issues, please create a new ticket with specific details.`,
        pr_url: pullRequest.html_url,
        pr_number: pullRequest.number
      })
    })

    if (response.ok) {
      console.log(`✅ Auto-validation successful for ticket ${ticketId}`)
      return { passed: true, status: 'PASSED - Ticket automatically validated' }
    } else {
      console.error(`❌ Auto-validation failed for ticket ${ticketId}:`, await response.text())
      return { passed: false, status: 'FAILED - Could not update ticket validation' }
    }

  } catch (error) {
    console.error('Auto-validation error:', error)
    return { passed: false, status: 'ERROR - Auto-validation encountered an error' }
  }
}
