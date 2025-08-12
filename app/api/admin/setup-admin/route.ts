import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint sets up dgalvin@yourcaio.co.uk as an admin user
export async function POST(request: NextRequest) {
  try {
    // Use service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Use auth.admin API to list users and find by email
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
      
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to list users', details: authError },
        { status: 500 }
      )
    }

    const user = users.find(u => u.email === 'dgalvin@yourcaio.co.uk')
    
    if (!user) {
      return NextResponse.json(
        { error: 'User dgalvin@yourcaio.co.uk not found in auth.users' },
        { status: 404 }
      )
    }

    // Update the user to be an admin in the public.users table
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        is_admin: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, email, is_admin')
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user admin status', details: updateError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin privileges granted to dgalvin@yourcaio.co.uk',
      user: updatedUser,
      adminUrls: [
        'https://thisisme-three.vercel.app/admin/support',
        'https://thisisme-three.vercel.app/admin/support/reports',
        'https://thisisme-three.vercel.app/admin/bulk-tickets'
      ]
    })

  } catch (error) {
    console.error('Error setting up admin:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}
