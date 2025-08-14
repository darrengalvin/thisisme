import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For now, allow direct validation injection for manual testing
    // TODO: Add proper admin authentication later
    
    const body = await request.json()
    const { 
      validation_passed, 
      validation_notes, 
      pr_url, 
      pr_number 
    } = body

    // Get existing ticket metadata
    const { data: existingTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('metadata')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Merge new validation data with existing metadata
    const updatedMetadata = {
      ...existingTicket.metadata,
      validation_passed,
      validation_notes,
      validated_at: new Date().toISOString(),
      ...(pr_url && { ai_pr_url: pr_url }),
      ...(pr_number && { ai_pr_number: pr_number })
    }

    // Auto-resolve ticket if validation passed
    const shouldResolve = validation_passed && pr_url; // Auto-resolve if validation passed and has PR
    
    // Update ticket with validation status and auto-resolve if appropriate
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
        ...(shouldResolve && {
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket validation:', updateError)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    // Add a system comment to the ticket
    const statusComment = validation_passed 
      ? `🎉 **VALIDATION PASSED & TICKET RESOLVED**: ${validation_notes}${shouldResolve ? '\n\n✅ **Status**: Automatically marked as resolved due to successful validation.' : ''}`
      : `❌ **VALIDATION FAILED**: ${validation_notes}`;
      
    await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: params.id,
        user_id: 'system',
        comment: statusComment,
        is_internal: false
      })

    return NextResponse.json({ 
      success: true,
      message: 'Ticket validation status updated',
      ticket: updatedTicket
    })

  } catch (error) {
    console.error('Error in ticket validation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
