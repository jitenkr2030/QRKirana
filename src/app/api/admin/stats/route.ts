import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get platform-wide statistics
    const totalShops = await db.shop.count()
    const activeShops = await db.shop.count({ where: { isActive: true } })
    const totalOrders = await db.order.count()
    const totalCustomers = await db.customer.count()

    // Calculate total revenue
    const orders = await db.order.findMany({
      select: { totalAmount: true }
    })
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    // Get recent orders
    const recentOrders = await db.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: {
          select: { name: true }
        }
      }
    })

    // Get top categories
    const shopsByCategory = await db.shop.groupBy({
      by: ['category'],
      _count: { category: true }
    })

    const topCategories = shopsByCategory
      .map(cat => ({
        category: cat.category,
        count: cat._count.category,
        percentage: totalShops > 0 ? Math.round((cat._count.category / totalShops) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return NextResponse.json({
      totalShops,
      activeShops,
      totalOrders,
      totalRevenue,
      totalCustomers,
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        shopName: order.shop.name,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt.toISOString()
      })),
      topCategories
    })

  } catch (error) {
    console.error('Admin stats fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}