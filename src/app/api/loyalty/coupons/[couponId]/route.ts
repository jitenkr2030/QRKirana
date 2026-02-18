import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const updateCouponSchema = z.object({
  discount: z.number().min(0, 'Discount must be positive').max(100, 'Percentage discount cannot exceed 100%').optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  minOrder: z.number().min(0, 'Minimum order must be positive').optional(),
  maxUses: z.number().min(1, 'Max uses must be at least 1').optional(),
  isActive: z.boolean().optional(),
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { couponId: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const couponId = params.couponId
    const body = await request.json()
    const validatedData = updateCouponSchema.parse(body)

    // Get the coupon and verify it belongs to the shop
    const coupon = await db.coupon.findFirst({
      where: {
        id: couponId,
        shopId: auth.shopId
      }
    })

    if (!coupon) {
      return NextResponse.json(
        { message: 'Coupon not found' },
        { status: 404 }
      )
    }

    // Validate discount type constraints if provided
    if (validatedData.discountType === 'percentage' && validatedData.discount && validatedData.discount > 100) {
      return NextResponse.json(
        { message: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      )
    }

    // Update the coupon
    const updatedCoupon = await db.coupon.update({
      where: { id: couponId },
      data: {
        ...(validatedData.discount !== undefined && { discount: validatedData.discount }),
        ...(validatedData.discountType && { discountType: validatedData.discountType }),
        ...(validatedData.minOrder !== undefined && { minOrder: validatedData.minOrder }),
        ...(validatedData.maxUses !== undefined && { maxUses: validatedData.maxUses }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(validatedData.expiresAt !== undefined && { expiresAt: new Date(validatedData.expiresAt) }),
      }
    })

    return NextResponse.json({
      message: 'Coupon updated successfully',
      coupon: {
        id: updatedCoupon.id,
        code: updatedCoupon.code,
        discount: updatedCoupon.discount,
        discountType: updatedCoupon.discountType,
        minOrder: updatedCoupon.minOrder,
        maxUses: updatedCoupon.maxUses,
        usedCount: updatedCoupon.usedCount,
        isActive: updatedCoupon.isActive,
        expiresAt: updatedCoupon.expiresAt?.toISOString(),
        createdAt: updatedCoupon.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Coupon update error:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { couponId: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const couponId = params.couponId

    // Get the coupon and verify it belongs to the shop
    const coupon = await db.coupon.findFirst({
      where: {
        id: couponId,
        shopId: auth.shopId
      }
    })

    if (!coupon) {
      return NextResponse.json(
        { message: 'Coupon not found' },
        { status: 404 }
      )
    }

    // Delete the coupon
    await db.coupon.delete({
      where: { id: couponId }
    })

    return NextResponse.json({
      message: 'Coupon deleted successfully'
    })

  } catch (error) {
    console.error('Coupon deletion error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}