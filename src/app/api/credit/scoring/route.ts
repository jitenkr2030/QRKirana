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

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { customerId } = await request.json()
    const shopId = auth.shopId

    // Get customer with order history
    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        shopId: shopId
      },
      include: {
        orders: {
          select: {
            totalAmount: true,
            createdAt: true,
            status: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get shop's credit settings
    const creditSettings = await db.creditSettings.findFirst({
      where: { shopId }
    })

    // Calculate credit score
    const creditScore = calculateCreditScore(customer, creditSettings)

    // Update credit account if it exists
    const creditAccount = await db.creditAccount.findFirst({
      where: {
        customerId: customerId,
        shopId: shopId
      }
    })

    if (creditAccount) {
      await db.creditAccount.update({
        where: { id: creditAccount.id },
        data: { creditScore }
      })
    }

    // Get detailed scoring breakdown
    const scoringBreakdown = getScoringBreakdown(customer, creditSettings)

    return NextResponse.json({
      customerId: customer.id,
      customerName: customer.name,
      creditScore: creditScore,
      scoringBreakdown,
      recommendations: getCreditRecommendations(creditScore, customer, creditSettings)
    })

  } catch (error) {
    console.error('Credit scoring error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const shopId = auth.shopId
    const refresh = searchParams.get('refresh') === 'true'

    // Get all credit accounts for the shop
    const creditAccounts = await db.creditAccount.findMany({
      where: { shopId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            totalOrders: true,
            totalSpent: true
          }
        }
      }
    })

    // Update credit scores if refresh is requested
    if (refresh) {
      const creditSettings = await db.creditSettings.findFirst({
        where: { shopId }
      })

      for (const account of creditAccounts) {
        const newScore = calculateCreditScore(account.customer, creditSettings)
        await db.creditAccount.update({
          where: { id: account.id },
          data: { creditScore: newScore }
        })
      }
    }

    // Get scoring summary
    const totalAccounts = creditAccounts.length
    const activeAccounts = creditAccounts.filter(a => a.isActive).length
    const avgCreditScore = creditAccounts.reduce((sum, a) => sum + a.creditScore, 0) / totalAccounts || 0
    const highRiskAccounts = creditAccounts.filter(a => a.creditScore < 60).length

    return NextResponse.json({
      summary: {
        totalAccounts,
        activeAccounts,
        avgCreditScore: Math.round(avgCreditScore),
        highRiskAccounts
      },
      accounts: creditAccounts.map(account => ({
        id: account.id,
        customerId: account.customerId,
        customer: account.customer,
        creditLimit: account.creditLimit,
        currentBalance: account.currentBalance,
        availableCredit: account.availableCredit,
        creditScore: account.creditScore,
        isActive: account.isActive,
        riskLevel: getRiskLevel(account.creditScore),
        createdAt: account.createdAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Credit scoring fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateCreditScore(customer: any, settings: any | null): number {
  let score = 100 // Start with perfect score

  // Order history scoring (40% weight)
  const orderCount = customer.totalOrders || 0
  if (orderCount < 5) {
    score -= 15
  } else if (orderCount < 10) {
    score -= 8
  } else if (orderCount < 20) {
    score -= 3
  } else if (orderCount >= 50) {
    score += 5
  }

  // Total spending scoring (30% weight)
  const totalSpent = customer.totalSpent || 0
  if (totalSpent < 1000) {
    score -= 20
  } else if (totalSpent < 5000) {
    score -= 10
  } else if (totalSpent < 10000) {
    score -= 5
  } else if (totalSpent < 20000) {
    score -= 2
  } else if (totalSpent >= 50000) {
    score += 10
  } else if (totalSpent >= 20000) {
    score += 5
  }

  // Average order value scoring (20% weight)
  const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0
  if (avgOrderValue < 100) {
    score -= 10
  } else if (avgOrderValue < 500) {
    score -= 5
  } else if (avgOrderValue >= 1000) {
    score += 5
  }

  // Recent activity scoring (10% weight)
  const recentOrders = customer.orders?.filter(order => {
    const daysSinceOrder = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceOrder <= 30
  }) || []
  
  if (recentOrders.length === 0) {
    score -= 10
  } else if (recentOrders.length >= 3) {
    score += 5
  }

  // Apply minimum score from settings
  if (settings && score < settings.minCreditScore) {
    score = settings.minCreditScore
  }

  return Math.min(100, Math.max(0, score))
}

function getScoringBreakdown(customer: any, settings: any | null) {
  const orderCount = customer.totalOrders || 0
  const totalSpent = customer.totalSpent || 0
  const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0

  return {
    orderHistory: {
      count: orderCount,
      impact: orderCount < 5 ? 'High Risk' : orderCount < 20 ? 'Medium Risk' : 'Low Risk',
      points: orderCount < 5 ? -15 : orderCount < 10 ? -8 : orderCount < 20 ? -3 : orderCount >= 50 ? 5 : 0
    },
    spending: {
      total: totalSpent,
      average: avgOrderValue,
      impact: totalSpent < 1000 ? 'High Risk' : totalSpent < 10000 ? 'Medium Risk' : 'Low Risk',
      points: totalSpent < 1000 ? -20 : totalSpent < 5000 ? -10 : totalSpent < 10000 ? -5 : totalSpent >= 50000 ? 10 : 0
    },
    recentActivity: {
      recentOrders: customer.orders?.filter(order => {
        const daysSinceOrder = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceOrder <= 30
      })?.length || 0,
      impact: 'Recent activity affects score',
      points: 0
    }
  }
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 80) return 'LOW'
  if (score >= 60) return 'MEDIUM'
  return 'HIGH'
}

function getCreditRecommendations(score: number, customer: any, settings: any | null) {
  const recommendations = []

  if (score < 60) {
    recommendations.push({
      type: 'RISK',
      message: 'High risk customer - Consider reducing credit limit',
      priority: 'HIGH'
    })
  }

  if (customer.totalOrders < 10) {
    recommendations.push({
      type: 'ENGAGEMENT',
      message: 'Low order frequency - Encourage more regular purchases',
      priority: 'MEDIUM'
    })
  }

  if (customer.totalSpent > 10000 && score < 80) {
    recommendations.push({
      type: 'OPPORTUNITY',
      message: 'High spending customer with moderate score - Consider credit limit increase',
      priority: 'MEDIUM'
    })
  }

  const recentOrders = customer.orders?.filter(order => {
    const daysSinceOrder = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceOrder <= 30
  }) || []

  if (recentOrders.length === 0 && score > 70) {
    recommendations.push({
      type: 'RETENTION',
      message: 'No recent orders from good customer - Send retention offers',
      priority: 'MEDIUM'
    })
  }

  return recommendations
}