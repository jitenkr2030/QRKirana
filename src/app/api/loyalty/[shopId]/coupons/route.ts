import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth || auth.shopId !== params.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const shopId = params.shopId

    // Get all coupons for the shop
    const coupons = await db.coupon.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      coupons: coupons.map(coupon => ({
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
      }))
    })

  } catch (error) {
    console.error('Loyalty coupons fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}