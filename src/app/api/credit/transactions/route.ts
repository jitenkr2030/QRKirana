import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const transactionSchema = z.object({
  accountId: z.string(),
  type: z.enum(['CREDIT', 'DEBIT', 'PAYMENT', 'ADJUSTMENT', 'INTEREST', 'FEE']),
  amount: z.number(),
  description: z.string().optional(),
  reference: z.string().optional(),
  metadata: z.any().optional(),
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
    const validatedData = transactionSchema.parse(body)

    // Get the credit account
    const creditAccount = await db.creditAccount.findFirst({
      where: {
        id: validatedData.accountId,
        shopId: auth.shopId
      }
    })

    if (!creditAccount) {
      return NextResponse.json(
        { message: 'Credit account not found' },
        { status: 404 }
      )
    }

    if (!creditAccount.isActive) {
      return NextResponse.json(
        { message: 'Credit account is not active' },
        { status: 400 }
      )
    }

    // Calculate new balance
    let newBalance = creditAccount.currentBalance
    let newAvailableCredit = creditAccount.availableCredit

    switch (validatedData.type) {
      case 'CREDIT':
        newBalance += validatedData.amount
        newAvailableCredit += validatedData.amount
        break
      case 'DEBIT':
        newBalance -= validatedData.amount
        newAvailableCredit -= validatedData.amount
        break
      case 'PAYMENT':
        newBalance -= validatedData.amount
        newAvailableCredit += validatedData.amount
        break
      case 'ADJUSTMENT':
        newBalance = validatedData.amount
        newAvailableCredit = validatedData.amount
        break
      case 'INTEREST':
        newBalance += validatedData.amount
        break
      case 'FEE':
        newBalance -= validatedData.amount
        break
    }

    // Validate credit limits
    if (newBalance > creditAccount.creditLimit) {
      return NextResponse.json(
        { message: 'Transaction would exceed credit limit' },
        { status: 400 }
      )
    }

    if (newAvailableCredit > creditAccount.creditLimit) {
      newAvailableCredit = creditAccount.creditLimit
    }

    // Create transaction
    const transaction = await db.creditTransaction.create({
      data: {
        accountId: validatedData.accountId,
        type: validatedData.type,
        amount: validatedData.amount,
        balance: newBalance,
        description: validatedData.description,
        reference: validatedData.reference,
        metadata: validatedData.metadata || null
      }
    })

    // Update credit account
    const updatedAccount = await db.creditAccount.update({
      where: { id: validatedData.accountId },
      data: {
        currentBalance: newBalance,
        availableCredit: newAvailableCredit,
        updatedAt: new Date()
      }
    })

    // Update last payment date if it's a payment
    let updateData: any = {}
    if (validatedData.type === 'PAYMENT') {
      updateData.lastPaymentDate = new Date()
    }

    // Recalculate credit score periodically (e.g., after payments)
    if (validatedData.type === 'PAYMENT') {
      const customer = await db.customer.findFirst({
        where: { id: creditAccount.customerId },
        include: {
          orders: {
            select: { totalAmount: true }
          }
        }
      })

      if (customer) {
        const creditSettings = await db.creditSettings.findFirst({
          where: { shopId: auth.shopId }
        })

        const newCreditScore = calculateCreditScore(customer, creditSettings)
        
        if (newCreditScore !== creditAccount.creditScore) {
          updateData.creditScore = newCreditScore
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await db.creditAccount.update({
        where: { id: validatedData.accountId },
        data: updateData
      })
    }

    return NextResponse.json({
      message: 'Transaction processed successfully',
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balance: transaction.balance,
        description: transaction.description,
        reference: transaction.reference,
        createdAt: transaction.createdAt.toISOString()
      },
      account: {
        currentBalance: updatedAccount.currentBalance,
        availableCredit: updatedAccount.availableCredit,
        creditScore: updatedAccount.creditScore
      }
    })

  } catch (error) {
    console.error('Credit transaction error:', error)
    
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
    const accountId = searchParams.get('accountId')
    const shopId = auth.shopId

    let whereClause: any = { shopId }
    if (accountId) {
      whereClause.accountId = accountId
    }

    const transactions = await db.creditTransaction.findMany({
      where: whereClause,
      include: {
        account: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                mobile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        accountId: tx.accountId,
        type: tx.type,
        amount: tx.amount,
        balance: tx.balance,
        description: tx.description,
        reference: tx.reference,
        metadata: tx.metadata,
        createdAt: tx.createdAt.toISOString(),
        account: {
          customer: tx.account.customer
        }
      }))
    })

  } catch (error) {
    console.error('Credit transactions fetch error:', error)
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