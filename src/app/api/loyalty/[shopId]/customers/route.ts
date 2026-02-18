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

    // Get customers with their loyalty points
    const customers = await db.customer.findMany({
      where: { shopId },
      include: {
        loyaltyPoints: {
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { totalSpent: 'desc' }
    })

    // Calculate total loyalty points for each customer
    const customersWithPoints = customers.map(customer => {
      const totalPoints = customer.loyaltyPoints.reduce((sum, point) => sum + point.points, 0)
      return {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        loyaltyPoints: totalPoints,
        createdAt: customer.createdAt.toISOString(),
        recentOrders: customer.orders.slice(0, 5) // Last 5 orders
      }
    })

    return NextResponse.json({
      customers: customersWithPoints,
      totalCustomers: customers.length,
      totalPointsIssued: customersWithPoints.reduce((sum, c) => sum + c.loyaltyPoints, 0)
    })

  } catch (error) {
    console.error('Loyalty customers fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}