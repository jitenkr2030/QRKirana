import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

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
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '7d' // 7d, 30d, 90d

    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    let comparisonStartDate: Date

    switch (period) {
      case '30d':
        startDate = startOfMonth(now)
        comparisonStartDate = startOfMonth(subDays(now, 30))
        break
      case '90d':
        startDate = subDays(now, 90)
        comparisonStartDate = subDays(now, 180)
        break
      default: // 7d
        startDate = startOfWeek(now)
        comparisonStartDate = startOfWeek(subDays(now, 7))
        break
    }

    const endDate = endOfDay(now)

    // Get orders for current period
    const currentOrders = await db.order.findMany({
      where: {
        shopId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true
      }
    })

    // Get orders for comparison period
    const comparisonOrders = await db.order.findMany({
      where: {
        shopId,
        createdAt: {
          gte: comparisonStartDate,
          lt: startDate
        }
      }
    })

    // Calculate metrics
    const totalRevenue = currentOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const comparisonRevenue = comparisonOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const revenueChange = comparisonRevenue > 0 ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100 : 0

    const totalOrders = currentOrders.length
    const comparisonOrdersCount = comparisonOrders.length
    const ordersChange = comparisonOrdersCount > 0 ? ((totalOrders - comparisonOrdersCount) / comparisonOrdersCount) * 100 : 0

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const comparisonAvgOrderValue = comparisonOrdersCount > 0 ? comparisonRevenue / comparisonOrdersCount : 0
    const avgOrderChange = comparisonAvgOrderValue > 0 ? ((avgOrderValue - comparisonAvgOrderValue) / comparisonAvgOrderValue) * 100 : 0

    // Top selling products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>()
    
    currentOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = productSales.get(item.productId) || { 
          name: item.product.name, 
          quantity: 0, 
          revenue: 0 
        }
        existing.quantity += item.quantity
        existing.revenue += item.total
        productSales.set(item.productId, existing)
      })
    })

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        ...data
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Daily sales data for chart
    const dailySales = new Map<string, { date: string; revenue: number; orders: number }>()
    
    // Initialize all days in the period with zero values
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0]
      dailySales.set(dateKey, { date: dateKey, revenue: 0, orders: 0 })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in actual data
    currentOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0]
      const existing = dailySales.get(dateKey) || { date: dateKey, revenue: 0, orders: 0 }
      existing.revenue += order.totalAmount
      existing.orders += 1
      dailySales.set(dateKey, existing)
    })

    // Order status breakdown
    const statusBreakdown = currentOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Customer analytics
    const uniqueCustomers = new Set(currentOrders.map(order => order.customerId)).size
    const repeatCustomers = currentOrders.filter(order => {
      return order.customer && order.customer.totalOrders > 1
    }).length

    // Delivery type breakdown
    const deliveryBreakdown = currentOrders.reduce((acc, order) => {
      acc[order.deliveryType] = (acc[order.deliveryType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      summary: {
        totalRevenue,
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        totalOrders,
        ordersChange: parseFloat(ordersChange.toFixed(1)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        avgOrderChange: parseFloat(avgOrderChange.toFixed(1)),
        uniqueCustomers,
        repeatCustomers,
        period
      },
      charts: {
        dailySales: Array.from(dailySales.values()).sort((a, b) => a.date.localeCompare(b.date)),
        topProducts,
        statusBreakdown,
        deliveryBreakdown
      }
    })

  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}