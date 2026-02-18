import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const couponSchema = z.object({
  shopId: z.string(),
  code: z.string().min(3, 'Coupon code must be at least 3 characters').max(20, 'Coupon code must be less than 20 characters'),
  discount: z.number().min(0, 'Discount must be positive').max(100, 'Percentage discount cannot exceed 100%'),
  discountType: z.enum(['percentage', 'fixed']),
  minOrder: z.number().min(0, 'Minimum order must be positive').optional(),
  maxUses: z.number().min(1, 'Max uses must be at least 1').optional(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
})

async function verifyAuth(request: NextRequest): Promise<{ shopId: string } | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return { shopId: decoded.shopId }
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = couponSchema.parse(body)

    // Verify the shopId matches the authenticated shop
    if (validatedData.shopId !== auth.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized: Shop ID mismatch' },
        { status: 401 }
      )
    }

    // Check if coupon code already exists for this shop
    const existingCoupon = await db.coupon.findFirst({
      where: {
        shopId: validatedData.shopId,
        code: validatedData.code.toUpperCase()
      }
    })

    if (existingCoupon) {
      return NextResponse.json(
        { message: 'A coupon with this code already exists' },
        { status: 400 }
      )
    }

    // Validate discount type constraints
    if (validatedData.discountType === 'percentage' && validatedData.discount > 100) {
      return NextResponse.json(
        { message: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      )
    }

    // Create the coupon
    const coupon = await db.coupon.create({
      data: {
        shopId: validatedData.shopId,
        code: validatedData.code.toUpperCase(),
        discount: validatedData.discount,
        discountType: validatedData.discountType,
        minOrder: validatedData.minOrder || null,
        maxUses: validatedData.maxUses || null,
        isActive: validatedData.isActive,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      }
    })

    return NextResponse.json({
      message: 'Coupon created successfully',
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount: coupon.discount,
        discountType: coupon.discountType,
        minOrder: coupon.minOrder,
        maxUses: coupon.maxUses,
        usedCount: coupon.usedCount,
        isActive: coupon.isActive,
        expiresAt: coupon.expiresAt?.toISOString(),
        createdAt: coupon.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Coupon creation error:', error)
    
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