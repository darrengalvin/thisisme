import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Extract and verify token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, person_name, relationship, person_email, notes, photo_url, person_id } = body

    if (!action || !person_name) {
      return NextResponse.json(
        { success: false, error: 'Action and person_name are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let result: any = {}

    switch (action) {
      case 'add': {
        // Check if person already exists
        const { data: existing } = await supabase
          .from('people')
          .select('id, name, relationship')
          .eq('user_id', user.userId)
          .ilike('name', person_name)
          .single()

        if (existing) {
          return NextResponse.json({
            success: false,
            error: 'Person already exists in your network',
            data: { existing_person: existing }
          }, { status: 409 })
        }

        // Add new person
        const { data: newPerson, error } = await supabase
          .from('people')
          .insert({
            user_id: user.userId,
            name: person_name,
            relationship: relationship || null,
            email: person_email || null,
            notes: notes || null,
            photo_url: photo_url || null
          })
          .select()
          .single()

        if (error) throw error

        result = {
          person: newPerson,
          message: `${person_name} has been added to your network`
        }
        break
      }

      case 'update': {
        if (!person_id) {
          return NextResponse.json(
            { success: false, error: 'person_id required for update' },
            { status: 400 }
          )
        }

        const updateData: any = {}
        if (person_name) updateData.name = person_name
        if (relationship !== undefined) updateData.relationship = relationship
        if (person_email !== undefined) updateData.email = person_email
        if (notes !== undefined) updateData.notes = notes
        if (photo_url !== undefined) updateData.photo_url = photo_url

        const { data: updatedPerson, error } = await supabase
          .from('people')
          .update(updateData)
          .eq('id', person_id)
          .eq('user_id', user.userId)
          .select()
          .single()

        if (error) throw error

        result = {
          person: updatedPerson,
          message: `${person_name}'s information has been updated`
        }
        break
      }

      case 'get': {
        const { data: person, error } = await supabase
          .from('people')
          .select('*')
          .eq('user_id', user.userId)
          .ilike('name', person_name)
          .single()

        if (error || !person) {
          return NextResponse.json({
            success: false,
            error: `${person_name} not found in your network`,
            data: { found: false }
          }, { status: 404 })
        }

        result = { person, found: true }
        break
      }

      case 'search': {
        const { data: people, error } = await supabase
          .from('people')
          .select('*')
          .eq('user_id', user.userId)
          .or(`name.ilike.%${person_name}%,relationship.ilike.%${person_name}%`)
          .limit(10)

        if (error) throw error

        result = {
          people: people || [],
          count: people?.length || 0,
          message: `Found ${people?.length || 0} people matching "${person_name}"`
        }
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: add, update, get, or search' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error: any) {
    console.error('Manage person error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to manage person' },
      { status: 500 }
    )
  }
}
