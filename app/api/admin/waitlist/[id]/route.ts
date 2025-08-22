import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Update waitlist entry status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, notes } = await request.json()
    const { id } = params

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const { data: entry, error } = await supabase
      .from('premium_waitlist')
      .update({ 
        status,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating waitlist entry:', error)
      return NextResponse.json(
        { error: 'Failed to update entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Entry updated successfully',
      entry 
    })
  } catch (error) {
    console.error('Error in waitlist PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete waitlist entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { error } = await supabase
      .from('premium_waitlist')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting waitlist entry:', error)
      return NextResponse.json(
        { error: 'Failed to delete entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Entry deleted successfully'
    })
  } catch (error) {
    console.error('Error in waitlist DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
