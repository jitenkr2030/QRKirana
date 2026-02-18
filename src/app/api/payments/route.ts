import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const createPaymentSchema = z.object({
  invoiceId: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  shopId: z.string(),
  amount: z.number().min(0),
  method: z.enum(['UPI', 'CASH', 'CARD', 'CREDIT', 'QR', 'NETBANKING']),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  transactionId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
})

const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  transactionId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
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
    const validatedData = createPaymentSchema.parse(body)

    // Verify the shopId matches the authenticated shop
    if (validatedData.shopId !== auth.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized: Shop ID mismatch' },
        { status: 401 }
      )
    }

    // Get billing settings to verify payment method is accepted
    const billingSettings = await db.billingSettings.findFirst({
      where: { shopId: validatedData.shopId }
    })

    if (!billingSettings) {
      return NextResponse.json(
        { message: 'Billing settings not configured' },
        { status: 400 }
      )
    }

    // Check if payment method is accepted
    const methodAccepted = checkPaymentMethodAccepted(validatedData.method, billingSettings)
    if (!methodAccepted) {
      return NextResponse.json(
        { message: `Payment method ${validatedData.method} is not accepted` },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await db.payment.create({
      data: {
        invoiceId: validatedData.invoiceId || null,
        orderId: validatedData.orderId || null,
        customerId: validatedData.customerId || null,
        shopId: validatedData.shopId,
        amount: validatedData.amount,
        method: validatedData.method,
        status: validatedData.status || 'PENDING',
        transactionId: validatedData.transactionId || null,
        reference: validatedData.reference || null,
        notes: validatedData.notes || null
      }
    })

    // If payment is for an invoice, update invoice paid amount and balance
    if (validatedData.invoiceId && validatedData.status === 'COMPLETED') {
      await updateInvoicePayment(validatedData.invoiceId, validatedData.amount)
    }

    // If payment is for an order, update order payment status
    if (validatedData.orderId && validatedData.status === 'COMPLETED') {
      await updateOrderPayment(validatedData.orderId, validatedData.method, validatedData.amount)
    }

    // If payment is credit, update credit account
    if (validatedData.method === 'CREDIT' && validatedData.customerId && validatedData.status === 'COMPLETED') {
      await processCreditPayment(validatedData.customerId, validatedData.shopId, validatedData.amount, validatedData.reference)
    }

    return NextResponse.json({
      message: 'Payment processed successfully',
      payment: {
        id: payment.id,
        invoiceId: payment.invoiceId,
        orderId: payment.orderId,
        customerId: payment.customerId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId,
        reference: payment.reference,
        notes: payment.notes,
        createdAt: payment.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Payment processing error:', error)
    
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
    const invoiceId = searchParams.get('invoiceId')
    const orderId = searchParams.get('orderId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const shopId = auth.shopId

    let whereClause: any = { shopId }
    if (invoiceId) whereClause.invoiceId = invoiceId
    if (orderId) whereClause.orderId = orderId
    if (customerId) whereClause.customerId = customerId
    if (status) whereClause.status = status
    if (method) whereClause.method = method
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    const payments = await db.payment.findMany({
      where: whereClause,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      payments: payments.map(payment => ({
        id: payment.id,
        invoiceId: payment.invoiceId,
        orderId: payment.orderId,
        customerId: payment.customerId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId,
        reference: payment.reference,
        notes: payment.notes,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        invoice: payment.invoice
      }))
    })

  } catch (error) {
    console.error('Payments fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('id')
    
    if (!paymentId) {
      return NextResponse.json(
        { message: 'Payment ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updatePaymentSchema.parse(body)

    // Get existing payment
    const existingPayment = await db.payment.findFirst({
      where: {
        id: paymentId,
        shopId: auth.shopId
      }
    })

    if (!existingPayment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      )
    }

    // Update payment
    const updateData: any = {}
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.transactionId !== undefined) updateData.transactionId = validatedData.transactionId
    if (validatedData.reference !== undefined) updateData.reference = validatedData.reference
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes

    const updatedPayment = await db.payment.update({
      where: { id: paymentId },
      data: updateData
    })

    // If payment status changed to COMPLETED, update related invoice/order
    if (validatedData.status === 'COMPLETED' && existingPayment.status !== 'COMPLETED') {
      if (existingPayment.invoiceId) {
        await updateInvoicePayment(existingPayment.invoiceId, existingPayment.amount)
      }
      if (existingPayment.orderId) {
        await updateOrderPayment(existingPayment.orderId, existingPayment.method, existingPayment.amount)
      }
    }

    // If payment status changed to REFUNDED, update related invoice/order
    if (validatedData.status === 'REFUNDED' && existingPayment.status !== 'REFUNDED') {
      if (existingPayment.invoiceId) {
        await updateInvoicePayment(existingPayment.invoiceId, -existingPayment.amount)
      }
    }

    return NextResponse.json({
      message: 'Payment updated successfully',
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        transactionId: updatedPayment.transactionId,
        reference: updatedPayment.reference,
        notes: updatedPayment.notes,
        updatedAt: updatedPayment.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Payment update error:', error)
    
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

// Helper functions
function checkPaymentMethodAccepted(method: string, settings: any): boolean {
  switch (method) {
    case 'UPI':
      return settings.acceptOnlinePayment
    case 'CARD':
      return settings.acceptOnlinePayment
    case 'NETBANKING':
      return settings.acceptOnlinePayment
    case 'CREDIT':
      return settings.acceptCreditPayment
    case 'CASH':
      return settings.acceptCashPayment
    case 'QR':
      return settings.acceptOnlinePayment
    default:
      return false
  }
}

async function updateInvoicePayment(invoiceId: string, amount: number) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId }
  })

  if (!invoice) return

  const newPaidAmount = invoice.paidAmount + amount
  const newBalanceAmount = Math.max(0, invoice.balanceAmount - amount)

  // Update invoice status based on payment
  let newStatus = invoice.status
  if (newBalanceAmount === 0 && newPaidAmount >= invoice.totalAmount) {
    newStatus = 'PAID'
  } else if (newStatus === 'PAID' && newBalanceAmount > 0) {
    newStatus = 'PARTIALLY_PAID'
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      status: newStatus
    }
  })
}

async function updateOrderPayment(orderId: string, method: string, amount: number) {
  const order = await db.order.findUnique({
    where: { id: orderId }
  })

  if (!order) return

  await db.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: method,
      paymentStatus: 'completed'
    }
  })
}

async function processCreditPayment(customerId: string, shopId: string, amount: number, reference?: string) {
  // Get customer's credit account
  const creditAccount = await db.creditAccount.findFirst({
    where: {
      customerId,
      shopId,
      isActive: true
    }
  })

  if (!creditAccount) return

  // Create credit transaction
  await db.creditTransaction.create({
    data: {
      accountId: creditAccount.id,
      type: 'PAYMENT',
      amount: amount,
      balance: creditAccount.currentBalance - amount,
      description: `Payment for invoice${reference ? ` - ${reference}` : ''}`,
      reference: reference || null
    }
  })

  // Update credit account
  await db.creditAccount.update({
    where: { id: creditAccount.id },
    data: {
      currentBalance: creditAccount.currentBalance - amount,
      availableCredit: creditAccount.availableCredit + amount,
      lastPaymentDate: new Date()
    }
  })
}