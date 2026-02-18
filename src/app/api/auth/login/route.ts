import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const loginSchema = z.object({
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  password: z.string().min(1, 'Password is required'),
})

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // Find shop by mobile number
    const shop = await db.shop.findFirst({
      where: {
        mobile: validatedData.mobile,
        isActive: true
      }
    })

    if (!shop) {
      return NextResponse.json(
        { message: 'Invalid mobile number or password' },
        { status: 401 }
      )
    }

    // For demo purposes, we'll use simple password verification
    // In production, you should hash passwords using bcrypt
    if (shop.password !== validatedData.password) {
      return NextResponse.json(
        { message: 'Invalid mobile number or password' },
        { status: 401 }
      )
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        shopId: shop.id,
        mobile: shop.mobile,
        shopName: shop.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      message: 'Login successful',
      token: token,
      shop: {
        id: shop.id,
        name: shop.name,
        ownerName: shop.ownerName,
        mobile: shop.mobile,
        email: shop.email,
        uniqueUrl: shop.uniqueUrl,
        subscriptionType: shop.subscriptionType
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}