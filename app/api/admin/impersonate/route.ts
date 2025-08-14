import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    // Verify JWT token and extract admin user ID
    const { verifyToken } = await import('@/lib/auth');
    const adminInfo = await verifyToken(token);
    
    if (!adminInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from('users')
      .select('is_admin, email')
      .eq('id', adminInfo.userId)
      .single();

    if (!adminData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, action } = body;

    if (action === 'stop') {
      // Stop impersonation - remove impersonation cookies
      const response = NextResponse.json({
        success: true,
        message: 'Impersonation stopped',
        adminUser: {
          id: adminInfo.userId,
          email: adminData.email
        }
      });

      // Clear impersonation cookies
      response.cookies.delete('impersonating-user-id');
      response.cookies.delete('impersonating-user-email');
      response.cookies.delete('admin-user-id');
      response.cookies.delete('admin-user-email');

      return response;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
    }

    // Get target user details
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Allow super admins (dgalvin@yourcaio.co.uk) to impersonate anyone
    if (targetUser.is_admin && targetUser.id !== adminInfo.userId && adminData.email !== 'dgalvin@yourcaio.co.uk') {
      return NextResponse.json({ 
        error: 'Cannot impersonate other admin users' 
      }, { status: 403 });
    }

    // Set impersonation cookies
    const response = NextResponse.json({
      success: true,
      message: `Now viewing as ${targetUser.email}`,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email
      },
      adminUser: {
        id: adminInfo.userId,
        email: adminData.email
      }
    });

    // Set secure impersonation cookies
    response.cookies.set('impersonating-user-id', targetUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4 // 4 hours max
    });

    response.cookies.set('impersonating-user-email', targetUser.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4
    });

    response.cookies.set('admin-user-id', adminInfo.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4
    });

    response.cookies.set('admin-user-email', adminData.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4
    });

    return response;

  } catch (error) {
    console.error('Error in POST /api/admin/impersonate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const impersonatingUserId = cookieStore.get('impersonating-user-id')?.value;
    const impersonatingUserEmail = cookieStore.get('impersonating-user-email')?.value;
    const adminUserId = cookieStore.get('admin-user-id')?.value;
    const adminUserEmail = cookieStore.get('admin-user-email')?.value;

    if (!impersonatingUserId || !adminUserId) {
      return NextResponse.json({ 
        isImpersonating: false 
      });
    }

    return NextResponse.json({
      isImpersonating: true,
      targetUser: {
        id: impersonatingUserId,
        email: impersonatingUserEmail
      },
      adminUser: {
        id: adminUserId,
        email: adminUserEmail
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/impersonate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
