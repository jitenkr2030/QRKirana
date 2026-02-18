import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get all shops with their counts
    const shops = await db.shop.findMany({
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      shops: shops.map(shop => ({
        id: shop.id,
        name: shop.name,
        ownerName: shop.ownerName,
        mobile: shop.mobile,
        email: shop.email,
        address: shop.address,
        category: shop.category,
        uniqueUrl: shop.uniqueUrl,
        isActive: shop.isActive,
        subscriptionType: shop.subscriptionType,
        subscriptionEnds: shop.subscriptionEnds?.toISOString(),
        createdAt: shop.createdAt.toISOString(),
        _count: shop._count
      }))
    })

  } catch (error) {
    console.error('Admin shops fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}