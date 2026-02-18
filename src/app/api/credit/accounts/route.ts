import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const createCreditAccountSchema = z.object({
  customerId: z.string(),
  shopId: z.string(),
  creditLimit: z.number().min(0, 'Credit limit must be positive'),
})

const updateCreditAccountSchema = z.object({
  creditLimit: z.number().min(0, 'Credit limit must be positive').optional(),
  isActive: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
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
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createCreditAccountSchema.parse(body)

    // Verify the shopId matches the authenticated shop
    if (validatedData.shopId !== auth.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized: Shop ID mismatch' },
        { status: 401 }
      )
    }

    // Check if customer exists and belongs to the shop
    const customer = await db.customer.findFirst({
      where: {
        id: validatedData.customerId,
        shopId: validatedData.shopId
      }
    })

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if credit account already exists
    const existingAccount = await db.creditAccount.findFirst({
      where: {
        customerId: validatedData.customerId,
        shopId: validatedData.shopId
      }
    })

    if (existingAccount) {
      return NextResponse.json(
        { message: 'Credit account already exists for this customer' },
        { status: 400 }
      )
    }

    // Get shop's credit settings
    const creditSettings = await db.creditSettings.findFirst({
      where: { shopId: validatedData.shopId }
    })

    // Calculate initial credit score based on customer history
    const creditScore = calculateCreditScore(customer, creditSettings)

    // Create credit account
    const creditAccount = await db.creditAccount.create({
      data: {
        customerId: validatedData.customerId,
        shopId: validatedData.shopId,
        creditLimit: validatedData.creditLimit,
        availableCredit: validatedData.creditLimit,
        creditScore: creditScore,
        isActive: true,
        dueDate: creditSettings ? new Date(Date.now() + creditSettings.gracePeriod * 24 * 60 * 60 * 1000) : null
      }
    })

    // Create initial transaction
    await db.creditTransaction.create({
      data: {
        accountId: creditAccount.id,
        type: 'CREDIT',
        amount: validatedData.creditLimit,
        balance: validatedData.creditLimit,
        description: 'Initial credit limit setup',
        metadata: {
          initialSetup: true,
          creditScore: creditScore
        }
      }
    })

    return NextResponse.json({
      message: 'Credit account created successfully',
      account: {
        id: creditAccount.id,
        customerId: creditAccount.customerId,
        creditLimit: creditAccount.creditLimit,
        availableCredit: creditAccount.availableCredit,
        creditScore: creditAccount.creditScore,
        isActive: creditAccount.isActive
      }
    })

  } catch (error) {
    console.error('Credit account creation error:', error)
    
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
    const customerId = searchParams.get('customerId')
    const shopId = auth.shopId

    let whereClause: any = { shopId }
    if (customerId) {
      whereClause.customerId = customerId
    }

    const creditAccounts = await db.creditAccount.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            totalOrders: true,
            totalSpent: true
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      accounts: creditAccounts.map(account => ({
        id: account.id,
        customerId: account.customerId,
        customer: account.customer,
        creditLimit: account.creditLimit,
        currentBalance: account.currentBalance,
        availableCredit: account.availableCredit,
        creditScore: account.creditScore,
        isActive: account.isActive,
        dueDate: account.dueDate?.toISOString(),
        lastPaymentDate: account.lastPaymentDate?.toISOString(),
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        transactions: account.transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          balance: tx.balance,
          description: tx.description,
          reference: tx.reference,
          metadata: tx.metadata,
          createdAt: tx.createdAt.toISOString()
        }))
      }))
    })

  } catch (error) {
    console.error('Credit accounts fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate credit score
function calculateCreditScore(customer: any, settings: any | null): number {
  let score = 100 // Start with perfect score

  // Deduct points for low order frequency
  if (customer.totalOrders < 5) {
    score -= 10
  } else if (customer.totalOrders < 10) {
    score -= 5
  }

  // Deduct points for low total spending
  if (customer.totalSpent < 1000) {
    score -= 15
  } else if (customer.totalSpent < 5000) {
    score -= 8
  } else if (customer.totalSpent < 10000) {
    score -= 3
  }

  // Add points for high value customers
  if (customer.totalSpent > 50000) {
    score += 10
  } else if (customer.totalSpent > 20000) {
    score += 5
  }

  // Apply minimum score from settings
  if (settings && score < settings.minCreditScore) {
    score = settings.minCreditScore
  }

  return Math.min(100, Math.max(0, score))
}