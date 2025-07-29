import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { validateEmail, validatePassword } from '@/lib/utils'
import { TIMEZONE_TYPES, MEMBER_ROLES } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { email, password, confirmPassword } = await request.json()

    // Validation
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.errors[0] },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists with this email' },
        { status: 409 }
      )
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword
      }
    })

    // Create a default private time zone for the user
    const privateTimeZone = await prisma.timeZone.create({
      data: {
        title: 'My Personal Memories',
        description: 'Your private collection of memories',
        type: TIMEZONE_TYPES.PRIVATE,
        creatorId: user.id
      }
    })

    // Add user as creator member of the time zone
    await prisma.timeZoneMember.create({
      data: {
        timeZoneId: privateTimeZone.id,
        userId: user.id,
        role: MEMBER_ROLES.CREATOR
      }
    })

    // Generate JWT token
    const token = await generateToken(user)

    // Return user data (excluding password)
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'User registered successfully'
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 