import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Try Authorization header first, then fall back to cookies
    const authHeader = request.headers.get('Authorization');
    const cookieStore = cookies();
    const cookieToken = cookieStore.get('auth-token')?.value;
    
    let token: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT token and extract user ID
    const { verifyToken } = await import('@/lib/auth');
    const userInfo = await verifyToken(token);
    
    if (!userInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userInfo.userId)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users from auth.users and public.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get additional user data from public.users table
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, is_admin, created_at, birth_year')
      .order('created_at', { ascending: false });

    if (publicError) {
      console.error('Error fetching public users:', publicError);
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
    }

    // Combine auth users with public user data
    const combinedUsers = users.map(authUser => {
      const publicUser = publicUsers?.find(pu => pu.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        is_admin: publicUser?.is_admin || false,
        birth_year: publicUser?.birth_year,
        email_confirmed: !!authUser.email_confirmed_at
      };
    });

    return NextResponse.json({ 
      users: combinedUsers,
      total: combinedUsers.length
    });

  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
